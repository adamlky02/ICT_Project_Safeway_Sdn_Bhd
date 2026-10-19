"""Optional enrollment, login verification, and administrator-reviewed authenticator recovery."""
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import select
from sqlalchemy.orm import Session

try:
    from ..general import auth, database, mfa, models
except ImportError:
    from general import auth, database, mfa, models

router = APIRouter(prefix='/api', tags=['authenticator'])

# Review Text (normalize whitespace before length validation so blank reasons/notes cannot enter the queue).
ReviewText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=500)]


class PasswordConfirmation(BaseModel):
    password: str = Field(min_length=1, max_length=500)
    code: str = Field(default='', max_length=40)


class SetupConfirmation(BaseModel):
    setup_token: str = Field(min_length=20, max_length=200)
    code: str = Field(min_length=1, max_length=40)


class LoginVerification(BaseModel):
    challenge_token: str = Field(min_length=20, max_length=200)
    code: str = Field(min_length=1, max_length=40)


class ResetRequest(PasswordConfirmation):
    reason: ReviewText


class LoginResetRequest(BaseModel):
    challenge_token: str = Field(min_length=20, max_length=200)
    reason: ReviewText


class ResetDecision(PasswordConfirmation):
    decision: Literal['approve', 'reject']
    note: ReviewText


def own_status(db, user):
    state = mfa.state_for(db, user)
    return {'role': user.role, 'enabled': state.enabled, 'requires_enrollment': state.requires_enrollment,
            'enrolled_at': state.enrolled_at, 'reset_request': mfa.request_data(mfa.latest_request(db, user.id))}


# Own Status (never returns an existing seed; users can inspect their own enrollment and most recent recovery decision).
@router.get('/mfa/status')
def status(response: Response, user=Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    response.headers['Cache-Control'] = 'no-store'
    result = own_status(db, user)
    db.commit()
    return result


@router.post('/mfa/enroll')
def enroll(body: PasswordConfirmation, request: Request, response: Response,
           user=Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    state = mfa.confirm_password(db, request, user, body.password)
    response.headers['Cache-Control'] = 'no-store'
    return mfa.begin_setup(db, user, state, request.state.auth_portal_role)


# Setup Confirmation (only the current pending QR can be confirmed; enabling revokes old sessions and challenges).
@router.post('/mfa/enroll/confirm')
def confirm(body: SetupConfirmation, request: Request, response: Response, db: Session = Depends(database.get_db)):
    mfa.throttle(db, request, 'verify', mfa.digest(body.setup_token), limit=30)
    session, user, state = mfa.resolve_session(db, body.setup_token, {'setup'}, lock=True)
    if state.enabled or not state.pending_secret or not state.pending_expires or state.pending_expires <= mfa.now():
        raise HTTPException(401, 'Authenticator setup has expired. Start setup again.')
    if session.binding != mfa.digest(state.pending_secret):
        raise HTTPException(401, 'Authenticator setup changed. Start setup again.')
    mfa.verify_factor(db, state, body.code, pending=True)
    role = session.portal_role
    state.secret, state.pending_secret, state.pending_expires = state.pending_secret, None, None
    state.enabled, state.requires_enrollment, state.enrolled_at = True, False, mfa.now()
    codes = mfa.recovery_codes(state)
    record = mfa.latest_request(db, user.id)
    if record and record.status == 'approved':
        record.status = 'completed'
    mfa.cancel_requests(db, user, 'A new authenticator was verified.')
    mfa.revoke_sessions(db, state)
    mfa.audit(db, 'enrollment_completed', user)
    result = mfa.login_response(db, response, user, role, state, mfa_verified=True)
    result['recovery_codes'] = codes
    return result


# Login Completion (consumes the restricted challenge once; recovery codes are also consumed atomically).
@router.post('/login/mfa/verify')
def verify_login(body: LoginVerification, request: Request, response: Response, db: Session = Depends(database.get_db)):
    mfa.throttle(db, request, 'verify', mfa.digest(body.challenge_token), limit=30)
    session, user, state = mfa.resolve_session(db, body.challenge_token, {'mfa_login'}, lock=True)
    if not state.enabled or state.requires_enrollment:
        raise HTTPException(401, 'Your authenticator changed. Please sign in again.')
    mfa.verify_factor(db, state, body.code)
    role = session.portal_role
    db.delete(session)
    mfa.audit(db, 'mfa_login_completed', user)
    return mfa.login_response(db, response, user, role, state, mfa_verified=True)


# Intentional Disable (fresh password plus an existing factor distinguishes disabling from lost-device recovery).
@router.post('/mfa/disable')
def disable(body: PasswordConfirmation, request: Request, response: Response,
            user=Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    state = mfa.confirm_password(db, request, user, body.password, code=body.code, require_factor=True)
    if not state.enabled:
        raise HTTPException(409, 'MFA is already disabled.')
    state.enabled, state.requires_enrollment = False, False
    state.secret, state.pending_secret, state.pending_expires = None, None, None
    state.recovery_hashes, state.last_counter, state.enrolled_at = [], None, None
    mfa.cancel_requests(db, user, 'The account owner disabled MFA.')
    mfa.revoke_sessions(db, state)
    mfa.audit(db, 'mfa_disabled', user)
    return mfa.login_response(db, response, user, request.state.auth_portal_role, state)


@router.post('/mfa/reset-requests')
def request_reset(body: ResetRequest, request: Request, response: Response,
                  user=Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    state = mfa.confirm_password(db, request, user, body.password)
    response.headers['Cache-Control'] = 'no-store'
    return {'message': 'Your authenticator reset request has been sent. Please wait for administrator approval.',
            'reset_request': mfa.request_reset(db, user, state, body.reason)}


# Lost-Device Recovery (a password-verified challenge can only submit its owner's request, never open protected pages).
@router.post('/login/mfa/reset-request')
def request_login_reset(body: LoginResetRequest, request: Request, response: Response,
                        db: Session = Depends(database.get_db)):
    mfa.throttle(db, request, 'reset-request', mfa.digest(body.challenge_token), limit=10)
    _, user, state = mfa.resolve_session(db, body.challenge_token, {'mfa_login'}, lock=True)
    response.headers['Cache-Control'] = 'no-store'
    return {'message': 'Your authenticator reset request has been sent. Please wait for administrator approval.',
            'reset_request': mfa.request_reset(db, user, state, body.reason)}


# Account Directory (management sees enrollment metadata and review history, never another user's QR or recovery codes).
@router.get('/admin/authenticators')
def directory(response: Response, _admin=Depends(auth.require_admin), db: Session = Depends(database.get_db)):
    states = {row.user_id: row for row in db.execute(select(models.Authenticator)).scalars()}
    records = db.execute(select(models.MfaResetRequest).order_by(models.MfaResetRequest.request_number.desc())).scalars().all()
    latest = {}
    for record in records:
        latest.setdefault(record.user_id, record)
    users = db.execute(select(models.User).order_by(models.User.email)).scalars()
    response.headers['Cache-Control'] = 'no-store'
    return [{'id': str(user.id), 'email': user.email, 'full_name': user.full_name, 'role': user.role,
             'is_active': user.is_active, 'enabled': bool(states.get(user.id) and states[user.id].enabled),
             'requires_enrollment': bool(states.get(user.id) and states[user.id].requires_enrollment),
             'enrolled_at': states[user.id].enrolled_at if states.get(user.id) else None,
             'reset_request': mfa.request_data(latest.get(user.id))} for user in users]


# Review Decision (another active admin/developer verifies credentials before a generation-bound, one-time decision).
@router.post('/admin/authenticators/reset-requests/{request_id}/decision')
def decide(request_id: UUID, body: ResetDecision, request: Request, response: Response,
           actor=Depends(auth.require_admin), db: Session = Depends(database.get_db)):
    record = db.get(models.MfaResetRequest, request_id)
    if not record:
        raise HTTPException(404, 'Reset request not found.')
    if record.user_id == actor.id:
        raise HTTPException(403, 'Another administrator or developer must review your request.')
    # All decisions lock subjects in UUID order to prevent cross-account reviewer/target deadlocks.
    target = db.get(models.User, record.user_id)
    if not target or not target.is_active:
        raise HTTPException(409, 'The requesting account is unavailable.')
    mfa.throttle(db, request, 'sensitive-action', str(actor.id), limit=12, window=900)
    for account in sorted((actor, target), key=lambda item: str(item.id)):
        mfa.state_for(db, account, lock=True)
    mfa.confirm_password(db, request, actor, body.password, code=body.code, require_factor=True, throttled=True)
    db.refresh(actor)
    db.refresh(target)
    if not actor.is_active or actor.role not in {"admin", "developer"} or not target.is_active:
        raise HTTPException(403, "The reviewer or requesting account is unavailable.")
    state = mfa.state_for(db, target, lock=True)
    record = db.execute(select(models.MfaResetRequest).where(models.MfaResetRequest.id == request_id)
                        .with_for_update().execution_options(populate_existing=True)).scalar_one()
    if record.status != 'pending' or record.generation != state.generation or not state.enabled:
        raise HTTPException(409, 'This request has already been handled or the authenticator changed.')
    record.status, record.review_note = ('approved' if body.decision == 'approve' else 'rejected'), body.note.strip()
    record.reviewer_id, record.reviewed_at = actor.id, mfa.now()
    if body.decision == 'approve':
        state.enabled, state.requires_enrollment = False, True
        state.secret, state.pending_secret, state.pending_expires = None, None, None
        state.recovery_hashes, state.last_counter, state.failures, state.lock_until = [], None, 0, None
        state.enrolled_at = None
        mfa.revoke_sessions(db, state)
    mfa.audit(db, 'reset_' + record.status, target, actor, request_id=str(record.id), note=body.note.strip())
    response.headers['Cache-Control'] = 'no-store'
    db.commit()
    return {'message': 'Reset approved. The account must register a new authenticator.' if body.decision == 'approve'
            else 'Reset request rejected. The existing authenticator remains active.', 'reset_request': mfa.request_data(record)}
