"""MFA workflow regressions use SQLite, synthetic identities, and no company services."""
import importlib.util
import os
import unittest
from unittest.mock import patch
from uuid import uuid4

import pyotp
from sqlalchemy import select, text

from . import test_route_authentication as fixture
from backend.general import database, models
from backend.login import auth, mfa
from backend.login.routes import profile


class MfaLifecycleTests(unittest.TestCase):
    # Reuse the isolated fixture without inheriting and rerunning the unrelated route tests.
    setUpDatabase = fixture.ProtectedRouteTests.setUp
    tearDown = fixture.ProtectedRouteTests.tearDown
    headers = fixture.ProtectedRouteTests.headers
    prepare_login_accounts = fixture.ProtectedRouteTests.prepare_login_accounts

    def setUp(self):
        self.setUpDatabase()
        self.env = patch.dict(os.environ, {'MFA_ENCRYPTION_KEY': 'test-only-dedicated-key-12345678901234567890',
                                          'SESSION_COOKIE_SECURE': 'false', 'SESSION_COOKIE_SAMESITE': 'lax',
                                          'ALLOWED_ORIGINS': 'http://localhost:5173'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.clock = patch.object(mfa.time, 'time', return_value=1900000020)
        self.time = self.clock.start()
        self.addCleanup(self.clock.stop)
        self.developer = self.prepare_login_accounts()
        self.app.include_router(profile.router)
        self.password = 'correct-password'

    def login(self, user=None, portal='staff'):
        user = user or self.a
        return self.client.post('/api/login', json={'email': user.email, 'password': self.password, 'role': portal})

    def enroll(self, user=None):
        user = user or self.a
        response = self.client.post('/api/mfa/enroll', headers=self.headers(user), json={'password': self.password})
        self.assertEqual(response.status_code, 200, response.text)
        setup = response.json()
        response = self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(response.status_code, 200, response.text)
        return setup, response.json()

    def bearer(self, result):
        return {'Authorization': 'Bearer ' + result['access_token']}

    def request_reset(self, result):
        response = self.client.post('/api/mfa/reset-requests', headers=self.bearer(result), json={'password': self.password, 'reason': 'Replacing my lost phone'})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()['reset_request']

    def decide(self, record, actor=None, decision='approve', **extra):
        actor = actor or self.admin
        return self.client.post('/api/admin/authenticators/reset-requests/' + record['id'] + '/decision', headers=self.headers(actor), json={'password': self.password, 'decision': decision, 'note': 'Identity verified through company procedure', **extra})

    def test_enrollment_is_password_gated_pending_until_verified_and_codes_are_hashed(self):
        headers = self.headers()
        failed = self.client.post('/api/mfa/enroll', headers=headers, json={'password': 'wrong-password'})
        self.assertEqual(failed.status_code, 401)
        self.assertNotIn('X-Session-Expired', failed.headers)
        response = self.client.post('/api/mfa/enroll', headers=headers, json={'password': self.password})
        setup = response.json()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(setup['otpauth_uri'].startswith('otpauth://totp/'))
        state = mfa.state_for(self.db, self.a)
        self.assertFalse(state.enabled)
        self.assertNotIn(setup['secret'], state.pending_secret)
        result = self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(result.status_code, 200, result.text)
        codes = result.json()['recovery_codes']
        self.assertEqual(len(codes), 10)
        self.db.refresh(state)
        self.assertTrue(state.enabled)
        self.assertEqual(state.recovery_hashes, [mfa.digest(code.replace('-', '')) for code in codes])
        expired = self.client.get('/api/mfa/status', headers=headers)
        self.assertEqual(expired.status_code, 401)
        self.assertEqual(expired.headers.get('X-Session-Expired'), '1')
        status = self.client.get('/api/mfa/status', headers=self.bearer(result.json())).json()
        self.assertNotIn('secret', status)
        self.assertNotIn('recovery_codes', status)
        self.assertEqual(self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())}).status_code, 401)

    def test_enrolled_management_requires_mfa_in_both_portals_and_challenges_have_no_access(self):
        setup, result = self.enroll(self.admin)
        self.time.return_value += 30
        for portal in ('admin', 'staff'):
            response = self.login(self.admin, portal)
            self.assertEqual(response.status_code, 200, response.text)
            challenge = response.json()
            self.assertTrue(challenge['mfa_required'])
            self.assertNotIn('access_token', challenge)
            token = challenge['challenge_token']
            self.assertEqual(self.client.get('/api/chat-history/sessions', headers={'Authorization': 'Bearer ' + token}).status_code, 401)
            response = self.client.post('/api/login/mfa/verify', json={'challenge_token': token, 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()['role'], portal)
            self.assertEqual(self.client.post('/api/login/mfa/verify', json={'challenge_token': token, 'code': pyotp.TOTP(setup['secret']).at(mfa.now())}).status_code, 401)
            self.time.return_value += 30

    def test_used_totp_and_recovery_codes_cannot_be_replayed(self):
        setup, result = self.enroll()
        challenge = self.login().json()
        body = {'challenge_token': challenge['challenge_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())}
        self.assertEqual(self.client.post('/api/login/mfa/verify', json=body).status_code, 401)
        body['code'] = result['recovery_codes'][0]
        response = self.client.post('/api/login/mfa/verify', json=body)
        self.assertEqual(response.status_code, 200, response.text)
        body['challenge_token'] = self.login().json()['challenge_token']
        self.assertEqual(self.client.post('/api/login/mfa/verify', json=body).status_code, 401)

    def test_failed_codes_lock_account_across_new_login_challenges_and_expire(self):
        setup, _ = self.enroll()
        self.time.return_value += 30
        invalid = next(f'{value:06d}' for value in range(100) if all(pyotp.TOTP(setup['secret']).at(mfa.now() + offset * 30) != f'{value:06d}' for offset in (-1, 0, 1)))
        for _ in range(5):
            challenge = self.login().json()['challenge_token']
            response = self.client.post('/api/login/mfa/verify', json={'challenge_token': challenge, 'code': invalid})
            self.assertEqual(response.status_code, 401, response.text)
        challenge = self.login().json()['challenge_token']
        response = self.client.post('/api/login/mfa/verify', json={'challenge_token': challenge, 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(response.status_code, 429, response.text)
        self.time.return_value += 901
        self.assertEqual(self.client.post('/api/login/mfa/verify', json={'challenge_token': challenge, 'code': pyotp.TOTP(setup['secret']).at(mfa.now())}).status_code, 401)
        challenge = self.login().json()['challenge_token']
        self.assertEqual(self.client.post('/api/login/mfa/verify', json={'challenge_token': challenge, 'code': pyotp.TOTP(setup['secret']).at(mfa.now())}).status_code, 200)

    def test_reset_approval_revokes_all_access_and_requires_new_qr_before_access(self):
        old_setup, old_access = self.enroll()
        old_challenge = self.login().json()['challenge_token']
        record = self.request_reset(old_access)
        approved = self.decide(record)
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(old_access)).status_code, 401)
        self.assertEqual(self.client.post('/api/login/mfa/verify', json={'challenge_token': old_challenge, 'code': old_access['recovery_codes'][0]}).status_code, 401)
        self.assertEqual(self.decide(record).status_code, 409)
        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        setup = response.json()
        self.assertTrue(setup['setup_required'])
        self.assertNotEqual(setup['secret'], old_setup['secret'])
        self.assertNotIn('access_token', setup)
        self.assertEqual(self.client.get('/api/mfa/status', headers={'Authorization': 'Bearer ' + setup['setup_token']}).status_code, 401)
        finished = self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(finished.status_code, 200, finished.text)
        state = mfa.state_for(self.db, self.a)
        self.assertTrue(state.enabled)
        self.assertFalse(state.requires_enrollment)
        self.assertEqual(mfa.latest_request(self.db, self.a.id).status, 'completed')
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(finished.json())).status_code, 200)

    def test_rejection_keeps_factor_and_existing_sessions_and_records_decision(self):
        _, access = self.enroll()
        record = self.request_reset(access)
        response = self.decide(record, self.developer, 'reject')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(mfa.state_for(self.db, self.a).enabled)
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(access)).status_code, 200)
        self.assertEqual(mfa.latest_request(self.db, self.a.id).status, 'rejected')
        self.assertTrue(self.db.execute(select(models.SecurityEvent).where(models.SecurityEvent.event == 'reset_rejected')).scalars().all())

    def test_lost_device_request_needs_password_verified_challenge_and_is_idempotent(self):
        _, access = self.enroll()
        challenge = self.login().json()['challenge_token']
        body = {'challenge_token': challenge, 'reason': 'My phone was lost'}
        first = self.client.post('/api/login/mfa/reset-request', json=body)
        second = self.client.post('/api/login/mfa/reset-request', json=body)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()['reset_request']['id'], second.json()['reset_request']['id'])
        self.assertEqual(self.db.query(models.MfaResetRequest).count(), 1)
        self.assertEqual(self.client.post('/api/login/mfa/reset-request', json={'challenge_token': 'x'*40, 'reason': 'Unknown challenge'}).status_code, 401)
        self.assertEqual(self.client.get('/api/mfa/status', headers={'Authorization': 'Bearer ' + challenge}).status_code, 401)
        self.assertEqual(self.decide(first.json()['reset_request']).status_code, 200)
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(access)).status_code, 401)

    def test_staff_cannot_review_and_management_cannot_approve_own_request(self):
        _, access = self.enroll(self.admin)
        record = self.request_reset(access)
        self.assertEqual(self.decide(record, self.a).status_code, 403)
        self.assertEqual(self.client.get('/api/admin/authenticators', headers=self.headers(self.a)).status_code, 403)
        self.assertEqual(self.client.post('/api/admin/authenticators/reset-requests/'+record['id']+'/decision', headers=self.bearer(access), json={'password': self.password, 'decision': 'approve', 'note': 'Self approval attempt'}).status_code, 403)
        self.assertEqual(self.decide(record, self.developer, password='wrong-password').status_code, 401)
        self.assertEqual(self.decide(record, self.developer).status_code, 200)

    def test_enrolled_reviewer_must_prove_their_own_factor(self):
        _, access = self.enroll()
        record = self.request_reset(access)
        _, reviewer = self.enroll(self.admin)
        path = '/api/admin/authenticators/reset-requests/'+record['id']+'/decision'
        body = {'password': self.password, 'decision': 'approve', 'note': 'Identity independently verified'}
        self.assertEqual(self.client.post(path, headers=self.bearer(reviewer), json=body).status_code, 400)
        body['code'] = reviewer['recovery_codes'][0]
        response = self.client.post(path, headers=self.bearer(reviewer), json=body)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn(mfa.digest(body['code'].replace('-', '')), mfa.state_for(self.db, self.admin).recovery_hashes)

    def test_disabling_requires_password_and_factor_and_revokes_other_sessions(self):
        _, access = self.enroll()
        path = '/api/mfa/disable'
        self.assertEqual(self.client.post(path, headers=self.bearer(access), json={'password': self.password}).status_code, 400)
        self.assertEqual(self.client.post(path, headers=self.bearer(access), json={'password': 'wrong-password', 'code': access['recovery_codes'][0]}).status_code, 401)
        response = self.client.post(path, headers=self.bearer(access), json={'password': self.password, 'code': access['recovery_codes'][0]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(access)).status_code, 401)
        self.assertFalse(mfa.state_for(self.db, self.a).enabled)
        self.assertIn('access_token', self.login().json())
        self.assertFalse(mfa.state_for(self.db, self.a).recovery_hashes)

    def test_directory_contains_only_metadata(self):
        setup, access = self.enroll()
        self.request_reset(access)
        response = self.client.get('/api/admin/authenticators', headers=self.headers(self.admin))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn(setup['secret'], response.text)
        for forbidden in ('password_hash', 'pending_secret', 'recovery_hashes', 'token_hash'):
            self.assertNotIn(forbidden, response.text)
        row = next(row for row in response.json() if row['id'] == str(self.a.id))
        self.assertTrue(row['enabled'])
        self.assertEqual(row['reset_request']['status'], 'pending')

    def test_missing_or_changed_key_does_not_disable_factors_or_break_password_only_accounts(self):
        _, access = self.enroll()
        for key in ('', 'changed-key-test-only-12345678901234567890'):
            with self.subTest(key=bool(key)), patch.dict(os.environ, {'MFA_ENCRYPTION_KEY': key}):
                challenge = self.login().json()['challenge_token']
                result = self.client.post('/api/login/mfa/verify', json={'challenge_token': challenge, 'code': '123456'})
                self.assertEqual(result.status_code, 503, result.text)
                self.assertTrue(mfa.state_for(self.db, self.a).enabled)
                self.assertIn('access_token', self.login(self.admin, 'admin').json())
        with patch.dict(os.environ, {'MFA_ENCRYPTION_KEY': ''}):
            response = self.client.post('/api/mfa/enroll', headers=self.headers(self.admin), json={'password': self.password})
            self.assertEqual(response.status_code, 503)
            self.assertIsNone(mfa.state_for(self.db, self.admin).pending_secret)

    def test_cookie_sessions_require_csrf_header_and_allowed_origin_for_mutations(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertIn('HttpOnly', response.headers['set-cookie'])
        self.assertEqual(self.client.get('/api/mfa/status').status_code, 200)
        self.assertEqual(self.client.post('/api/mfa/enroll', json={'password': self.password}).status_code, 403)
        headers = {'Origin': 'https://untrusted.example', 'X-Safeway-Request': '1'}
        self.assertEqual(self.client.post('/api/mfa/enroll', headers=headers, json={'password': self.password}).status_code, 403)
        headers['Origin'] = 'http://localhost:5173'
        response = self.client.post('/api/mfa/enroll', headers=headers, json={'password': self.password})
        self.assertEqual(response.status_code, 200, response.text)
        token = self.login().json()['access_token']
        response = self.client.post('/api/logout', headers={'Authorization': 'Bearer '+token})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/api/mfa/status', headers={'Authorization': 'Bearer '+token}).status_code, 401)

    def test_sessions_work_after_worker_restart_without_sharing_process_memory(self):
        token = self.login().json()['access_token']
        spec = importlib.util.spec_from_file_location('backend.login.mfa_worker', mfa.__file__)
        worker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(worker)
        _, user, _ = worker.resolve_session(self.db, token, {'access'})
        self.assertEqual(user.id, self.a.id)

    def test_expired_setup_cannot_enable_mfa_and_login_attempt_limits_survive_new_requests(self):
        setup = self.client.post('/api/mfa/enroll', headers=self.headers(), json={'password': self.password}).json()
        self.time.return_value += 301
        response = self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(response.status_code, 401)
        self.assertFalse(mfa.state_for(self.db, self.a).enabled)
        for _ in range(10):
            self.assertEqual(self.client.post('/api/login', json={'email': self.a.email, 'password': 'incorrect', 'role': 'staff'}).status_code, 401)
        self.assertEqual(self.login().status_code, 429)

    def test_login_after_idle_day_resets_buckets_before_cleanup_and_keeps_limits(self):
        # Production sessions disable autoflush; default test sessions hid this crash.
        self.db.autoflush = False
        account_key = mfa.digest(f'login:account:{self.a.email}')
        ip_key = mfa.digest('login:ip:testclient')
        stale_key = mfa.digest('login:account:stale@example.test')
        active_key = mfa.digest('login:account:active@example.test')
        self.db.add_all([
            models.AuthRateLimit(key=account_key, count=10, window_start=mfa.now() - 86401),
            models.AuthRateLimit(key=ip_key, count=60, window_start=mfa.now() - 86401),
            models.AuthRateLimit(key=stale_key, count=1, window_start=mfa.now() - 86401),
            models.AuthRateLimit(key=active_key, count=3, window_start=mfa.now()),
        ])
        self.db.commit()

        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn('access_token', response.json())
        # Read persisted values, rather than the session's in-memory changes.
        self.db.expire_all()
        for key in (account_key, ip_key):
            bucket = self.db.get(models.AuthRateLimit, key)
            self.assertIsNotNone(bucket)
            self.assertEqual((bucket.count, bucket.window_start), (1, mfa.now()))
        self.assertIsNone(self.db.get(models.AuthRateLimit, stale_key))
        self.assertEqual(self.db.get(models.AuthRateLimit, active_key).count, 3)

        for _ in range(9):
            response = self.client.post('/api/login', json={
                'email': self.a.email, 'password': 'incorrect', 'role': 'staff',
            })
            self.assertEqual(response.status_code, 401, response.text)
        response = self.login()
        self.assertEqual(response.status_code, 429, response.text)
        self.assertEqual(response.headers['Retry-After'], '300')
        self.time.return_value += 301
        self.assertEqual(self.login().status_code, 200)

    def test_password_change_requires_confirmation_and_revokes_old_login_sessions(self):
        token = self.login().json()['access_token']
        headers = {'Authorization': 'Bearer '+token}
        path = '/api/profile/'+str(self.a.id)
        self.assertEqual(self.client.put(path, headers=headers, json={'full_name': 'A', 'password': 'replacement-password'}).status_code, 400)
        response = self.client.put(path, headers=headers, json={'full_name': 'A', 'password': 'replacement-password', 'current_password': self.password})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get('/api/mfa/status', headers=headers).status_code, 401)
        response = self.client.post('/api/login', json={'email': self.a.email, 'password': 'replacement-password', 'role': 'staff'})
        self.assertEqual(response.status_code, 200, response.text)

    def test_new_request_after_rejection_is_latest_even_with_identical_timestamps(self):
        _, access = self.enroll()
        first = self.request_reset(access)
        self.assertEqual(self.decide(first, decision='reject').status_code, 200)
        second = self.request_reset(access)
        self.assertNotEqual(first['id'], second['id'])
        self.assertEqual(mfa.latest_request(self.db, self.a.id).id.hex, second['id'].replace('-', ''))
        self.assertEqual(self.request_reset(access)['id'], second['id'])
        self.assertEqual(self.db.query(models.MfaResetRequest).count(), 2)

    def test_developer_unlock_is_invalid_after_reset_generation_changes(self):
        _, access = self.enroll(self.developer)
        token, _ = auth.create_developer_mode_token(self.developer, self.db)
        self.assertEqual(auth.verify_developer_mode_token(token, self.developer, self.db).id, self.developer.id)
        record = self.request_reset(access)
        self.assertEqual(self.decide(record).status_code, 200)
        with self.assertRaises(Exception) as caught:
            auth.verify_developer_mode_token(token, self.developer, self.db)
        self.assertEqual(caught.exception.status_code, 403)

    def test_account_status_and_setup_binding_are_rechecked_when_completing_challenges(self):
        setup = self.client.post('/api/mfa/enroll', headers=self.headers(), json={'password': self.password}).json()
        self.a.is_active = False
        self.db.commit()
        response = self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(response.status_code, 401)
        self.a.is_active = True
        state = mfa.state_for(self.db, self.a)
        state.pending_secret = mfa.encrypt(pyotp.random_base32())
        self.db.commit()
        response = self.client.post('/api/mfa/enroll/confirm', json={'setup_token': setup['setup_token'], 'code': pyotp.TOTP(setup['secret']).at(mfa.now())})
        self.assertEqual(response.status_code, 401)
        self.assertFalse(mfa.state_for(self.db, self.a).enabled)


    def test_login_and_logout_preserve_a_legacy_auth_sessions_table(self):
        # Reproduce the deployed legacy schema instead of assuming every table starts empty/new.
        self.db.execute(text('CREATE TABLE auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, '
                             'expires_at INTEGER NOT NULL, revoked BOOLEAN NOT NULL, created_at TEXT)'))
        self.db.execute(text('INSERT INTO auth_sessions (id, user_id, expires_at, revoked) '
                             'VALUES (:id, :user_id, :expires_at, FALSE)'),
                        {'id': 'legacy-session', 'user_id': str(self.a.id), 'expires_at': mfa.now() + 600})
        self.db.commit()
        with patch.object(database, 'engine', self.engine):
            database.create_tables()
        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(result)).status_code, 200)
        self.assertEqual(self.client.post('/api/logout', headers=self.bearer(result)).status_code, 200)
        self.assertEqual(self.client.get('/api/mfa/status', headers=self.bearer(result)).status_code, 401)
        legacy = self.db.execute(text('SELECT id, revoked FROM auth_sessions')).mappings().all()
        self.assertEqual([(row['id'], bool(row['revoked'])) for row in legacy], [('legacy-session', False)])
        self.assertNotIn('token_hash', [row[1] for row in self.db.execute(text('PRAGMA table_info(auth_sessions)'))])



if __name__ == '__main__':
    unittest.main()
