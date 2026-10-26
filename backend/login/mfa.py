"""Shared MFA lifecycle, encryption, throttling, and security audit helpers."""
import base64
import hashlib
import hmac
import os
import secrets
import time
from uuid import uuid4

import bcrypt
import pyotp
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError

try:
    from ..general import models
except ImportError:
    from general import models

CHALLENGE_TTL = 300
SESSION_TTL = int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", "43200"))
COOLDOWN = 900


def now():
    return int(time.time())


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


# Stable Encryption (only a dedicated deployment secret encrypts seeds; no generated or AI/session-key fallback).
def cipher():
    key = os.getenv('MFA_ENCRYPTION_KEY', '').strip()
    if len(key) < 32:
        raise HTTPException(503, 'Authenticator setup is temporarily unavailable. Contact your administrator.')
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest()))


def encrypt(secret):
    return cipher().encrypt(secret.encode()).decode()


def decrypt(value):
    if not value:
        raise HTTPException(503, "Your saved authenticator is unavailable. Contact your administrator for recovery.")
    try:
        return cipher().decrypt(value.encode()).decode()
    except (InvalidToken, ValueError, UnicodeError):
        raise HTTPException(503, 'Your authenticator could not be read. Contact your administrator for recovery.') from None


# Account Lock (a PostgreSQL row lock serializes enrollment, replay consumption, and reset decisions across workers).
def state_for(db, user, *, lock=False):
    query = select(models.Authenticator).where(models.Authenticator.user_id == user.id)
    if lock:
        query = query.with_for_update()
    state = db.execute(query.execution_options(populate_existing=True)).scalar_one_or_none()
    if state is None:
        try:
            with db.begin_nested():
                state = models.Authenticator(user_id=user.id)
                db.add(state)
                db.flush()
        except IntegrityError:
            state = db.execute(query.execution_options(populate_existing=True)).scalar_one()
    return state


# Shared Request Limits (persist attempts before verification so errors, new challenges, and restarts cannot clear limits).
def throttle(db, request, scope, identity, *, limit=10, window=300):
    keys = ((digest(f'{scope}:account:{identity}'), limit),
            (digest(f'{scope}:ip:{request.client.host if request.client else "unknown"}'), max(limit * 6, 60)))
    for key, maximum in sorted(keys):
        query = select(models.AuthRateLimit).where(models.AuthRateLimit.key == key).with_for_update()
        row = db.execute(query.execution_options(populate_existing=True)).scalar_one_or_none()
        if row is None:
            try:
                with db.begin_nested():
                    row = models.AuthRateLimit(key=key, count=0, window_start=now())
                    db.add(row)
                    db.flush()
            except IntegrityError:
                row = db.execute(query.execution_options(populate_existing=True)).scalar_one()
        if now() - row.window_start >= window:
            row.count, row.window_start = 0, now()
        if row.count >= maximum:
            db.commit()
            raise HTTPException(429, 'Too many attempts. Please try again later.', headers={'Retry-After': str(window)})
        row.count += 1
    # Opportunistic cleanup keeps expired buckets from accumulating with arbitrary login identifiers.
    # Sessions disable autoflush: persist refreshed windows before cleanup can delete their old rows.
    db.flush()
    db.execute(delete(models.AuthRateLimit).where(models.AuthRateLimit.window_start < now() - 86400))
    db.commit()


def audit(db, event, subject, actor=None, **details):
    db.add(models.SecurityEvent(id=uuid4(), event=event, subject_id=subject.id,
                                actor_id=(actor or subject).id, occurred_at=now(), details=details))


# Opaque Sessions (only token hashes are persisted; the same records support restricted five-minute login/setup challenges).
def issue_session(db, user, state, purpose='access', portal_role=None, binding=None, mfa_verified=False):
    token = secrets.token_urlsafe(48)
    db.add(models.AuthSession(token_hash=digest(token), user_id=user.id, purpose=purpose,
                              portal_role=portal_role or user.role, generation=state.generation,
                              expires_at=now() + (SESSION_TTL if purpose == 'access' else CHALLENGE_TTL),
                              binding=binding, mfa_verified=mfa_verified))
    db.execute(delete(models.AuthSession).where(models.AuthSession.expires_at < now()))
    return token


def resolve_session(db, token, purposes, *, lock=False):
    query = select(models.AuthSession).where(models.AuthSession.token_hash == digest(token))
    session = db.execute(query.execution_options(populate_existing=True)).scalar_one_or_none()
    if not session or session.expires_at <= now() or session.purpose not in purposes:
        raise HTTPException(401, 'This session has expired or your authenticator settings changed. Please sign in again.')
    user = db.get(models.User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, 'Account is unavailable.')
    state = state_for(db, user, lock=lock)
    if lock:
        db.refresh(user)
        if not user.is_active:
            raise HTTPException(401, "Account is unavailable.")
        # State-before-session lock ordering matches reset revocation and avoids a cross-worker deadlock.
        session = db.execute(query.with_for_update().execution_options(populate_existing=True)).scalar_one_or_none()
        if not session or session.expires_at <= now() or session.purpose not in purposes:
            raise HTTPException(401, 'This authentication step changed. Please sign in again.')
    if session.generation != state.generation:
        raise HTTPException(401, 'Your authenticator settings changed. Please sign in again.')
    return session, user, state


def revoke_sessions(db, state):
    state.generation += 1
    db.execute(delete(models.AuthSession).where(models.AuthSession.user_id == state.user_id))


def set_cookie(response, token):
    production = os.getenv('APP_ENV', '').lower() == 'production' or os.getenv('RENDER', '').lower() == 'true'
    secure = os.getenv('SESSION_COOKIE_SECURE', str(production)).lower() == 'true'
    same_site = os.getenv('SESSION_COOKIE_SAMESITE', 'lax').lower()
    if same_site not in {'lax', 'strict', 'none'} or (same_site == 'none' and not secure):
        raise HTTPException(503, 'Browser sign-in is temporarily unavailable. Contact your administrator.')
    response.set_cookie('safeway_session', token, max_age=SESSION_TTL, httponly=True,
                        secure=secure, samesite=same_site, path='/')
    response.headers['Cache-Control'] = 'no-store'


def login_response(db, response, user, portal_role, state, *, mfa_verified=False):
    token = issue_session(db, user, state, portal_role=portal_role, mfa_verified=mfa_verified)
    set_cookie(response, token)
    db.commit()
    # The bearer token remains available to non-browser API clients; the web client persists identity only.
    return {'id': str(user.id), 'email': user.email, 'role': portal_role,
            'name': user.full_name, 'access_token': token}


# Factor Verification (database-locked counters reject successful-code replay and share a five-failure cooldown).
def verify_factor(db, state, code, *, pending=False):
    if state.lock_until and state.lock_until > now():
        raise HTTPException(429, 'Too many incorrect authenticator codes. Please try again later.',
                            headers={'Retry-After': str(state.lock_until - now())})
    if state.lock_until:
        state.failures, state.lock_until = 0, None
    cleaned = code.strip().replace('-', '').replace(' ', '').upper()
    if not pending and len(cleaned) >= 16:
        hashed = digest(cleaned)
        hashes = list(state.recovery_hashes or [])
        match = next((item for item in hashes if hmac.compare_digest(item, hashed)), None)
        if match:
            hashes.remove(match)
            state.recovery_hashes = hashes
            state.failures, state.lock_until = 0, None
            return
    secret = decrypt(state.pending_secret if pending else state.secret)
    current = now() // 30
    if len(code) == 6 and code.isascii() and code.isdigit():
        totp = pyotp.TOTP(secret)
        for counter in range(max(current - 1, 0), current + 2):
            if hmac.compare_digest(totp.at(counter * 30), code) and (pending or state.last_counter is None or counter > state.last_counter):
                state.last_counter = counter
                state.failures, state.lock_until = 0, None
                return
    state.failures += 1
    if state.failures >= 5:
        state.lock_until = now() + COOLDOWN
    db.commit()
    raise HTTPException(401, 'Invalid or already used authenticator code. Use a new code or an unused recovery code.')


def confirm_password(db, request, user, password, *, code=None, require_factor=False, throttled=False):
    if not throttled:
        throttle(db, request, 'sensitive-action', str(user.id), limit=12, window=900)
    state = state_for(db, user, lock=True)
    db.refresh(user)
    if not user.is_active:
        raise HTTPException(401, 'Account is unavailable.', headers={'X-Session-Expired': '1'})
    # Recheck the session generation after acquiring the row lock, including after a concurrent reset.
    generation = getattr(request.state, 'auth_generation', state.generation)
    if generation != state.generation:
        raise HTTPException(401, 'Your session has changed. Please sign in again.', headers={'X-Session-Expired': '1'})
    try:
        valid = bcrypt.checkpw(password.encode(), user.password_hash.encode())
    except ValueError:
        valid = False
    if not valid:
        raise HTTPException(401, 'The password is incorrect.')
    if require_factor and state.enabled:
        if not code:
            raise HTTPException(400, 'Enter your authenticator code or an unused recovery code.')
        verify_factor(db, state, code)
    return state


# Pending Enrollment (a QR remains stable until confirmation/expiry and is never exposed for an enabled factor).
def begin_setup(db, user, state, portal_role):
    if state.enabled:
        raise HTTPException(409, 'MFA is already enabled. Request a reset to replace your authenticator.')
    if state.pending_secret and state.pending_expires and state.pending_expires > now():
        secret = decrypt(state.pending_secret)
    else:
        secret = pyotp.random_base32()
        state.pending_secret, state.pending_expires = encrypt(secret), now() + CHALLENGE_TTL
    token = issue_session(db, user, state, 'setup', portal_role, digest(state.pending_secret))
    audit(db, 'enrollment_started', user)
    db.commit()
    return {'mfa_required': True, 'setup_required': True, 'setup_token': token,
            'secret': secret, 'otpauth_uri': pyotp.TOTP(secret).provisioning_uri(user.email, issuer_name='Safeway'),
            'expires_in': max(state.pending_expires - now(), 0)}


def recovery_codes(state):
    codes = ['-'.join(secrets.token_hex(4).upper() for _ in range(2)) for _ in range(10)]
    state.recovery_hashes = [digest(code.replace('-', '')) for code in codes]
    return codes


def latest_request(db, user_id):
    return db.execute(select(models.MfaResetRequest).where(models.MfaResetRequest.user_id == user_id)
                      .order_by(models.MfaResetRequest.request_number.desc())).scalars().first()


def request_data(record):
    if not record:
        return None
    return {'id': str(record.id), 'status': record.status, 'reason': record.reason,
            'created_at': record.created_at, 'reviewed_at': record.reviewed_at,
            'review_note': record.review_note}


def cancel_requests(db, user, note):
    records = db.execute(select(models.MfaResetRequest).where(models.MfaResetRequest.user_id == user.id,
                                                             models.MfaResetRequest.status == 'pending')).scalars()
    for record in records:
        record.status, record.review_note, record.reviewed_at = 'cancelled', note, now()


def request_reset(db, user, state, reason):
    if not state.enabled:
        raise HTTPException(409, 'An enabled authenticator is required to request a reset.')
    record = latest_request(db, user.id)
    if record and record.status == 'pending':
        return request_data(record)
    state.reset_sequence += 1
    record = models.MfaResetRequest(id=uuid4(), user_id=user.id, status='pending', reason=reason.strip(), request_number=state.reset_sequence,
                                    generation=state.generation, created_at=now())
    db.add(record)
    audit(db, 'reset_requested', user)
    db.commit()
    return request_data(record)
