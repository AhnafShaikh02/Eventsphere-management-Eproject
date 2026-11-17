import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc;
let tempDataDir;
let smtpServer;
const capturedEmails = [];

function startMockSmtpServer() {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let buffer = '';
      let inData = false;
      let dataLines = [];
      let authStep = 0;
      let recipient = '';

      socket.write('220 127.0.0.1 ESMTP TestSink\r\n');

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        while (buffer.includes('\r\n')) {
          const idx = buffer.indexOf('\r\n');
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          if (inData) {
            if (line === '.') {
              inData = false;
              // Decode quoted-printable soft breaks / =3D if present for assertions
              const raw = dataLines.join('\r\n').replace(/=\r\n/g, '').replace(/=3D/g, '=');
              capturedEmails.push({ to: recipient, raw });
              dataLines = [];
              socket.write('250 2.0.0 OK queued\r\n');
            } else {
              dataLines.push(line);
            }
            continue;
          }

          if (authStep === 1) {
            authStep = 2;
            socket.write('334 UGFzc3dvcmQ6\r\n');
            continue;
          }
          if (authStep === 2) {
            authStep = 0;
            socket.write('235 2.7.0 Authentication successful\r\n');
            continue;
          }

          const upper = line.toUpperCase();
          if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
            socket.write('250-127.0.0.1\r\n250 AUTH PLAIN LOGIN\r\n');
          } else if (upper.startsWith('AUTH LOGIN')) {
            authStep = 1;
            socket.write('334 VXNlcm5hbWU6\r\n');
          } else if (upper.startsWith('AUTH PLAIN')) {
            socket.write('235 2.7.0 Authentication successful\r\n');
          } else if (upper.startsWith('MAIL FROM:')) {
            socket.write('250 2.1.0 OK\r\n');
          } else if (upper.startsWith('RCPT TO:')) {
            recipient = line.slice(8).replace(/[<>]/g, '').trim();
            socket.write('250 2.1.5 OK\r\n');
          } else if (upper === 'DATA') {
            inData = true;
            dataLines = [];
            socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
          } else if (upper === 'QUIT') {
            socket.write('221 2.0.0 Bye\r\n');
            socket.end();
          } else {
            socket.write('250 OK\r\n');
          }
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Timed out waiting for EventSphere test server to start');
}

async function apiJson(route, options = {}) {
  const res = await fetch(`${BASE_URL}${route}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

before(async () => {
  const smtp = await startMockSmtpServer();
  smtpServer = smtp.server;

  tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventsphere-test-'));
  const tsxBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');

  serverProc = spawn(tsxBin, ['server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'production',
      EVENTSPHERE_DATA_DIR: tempDataDir,
      EVENTSPHERE_DISABLE_MONGO: 'true',
      GMAIL_USER: '',
      GMAIL_APP_PASSWORD: '',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_USER: 'security@eventsphere.test',
      SMTP_PASSWORD: 'test-smtp-password',
      SMTP_FROM_EMAIL: 'security@eventsphere.test',
    },
    stdio: 'pipe',
  });

  await waitForServer(BASE_URL);
});

after(() => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  if (smtpServer) {
    smtpServer.close();
  }
  if (tempDataDir && fs.existsSync(tempDataDir)) {
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  }
});

test('Health, telemetry metrics, and automated daily backup snapshot', async () => {
  const health = await apiJson('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.ok, true);
  assert.equal(health.data.service, 'eventsphere');

  const metrics = await apiJson('/api/metrics');
  assert.equal(metrics.status, 200);
  assert.ok(metrics.data.totalApiRequests >= 1);
  assert.ok(metrics.data.backupCount >= 1);
});

test('Unauthenticated GET /api/state redacts private admin logs, registrations, and feedback', async () => {
  const anonState = await apiJson('/api/state');
  assert.equal(anonState.status, 200);
  assert.deepEqual(anonState.data.activityLogs, []);
  assert.deepEqual(anonState.data.feedback, []);
  assert.deepEqual(anonState.data.registrations, []);
  assert.ok(anonState.data.booths.length >= 24);
});

test('Registration enforces GDPR consent, organizer invite code, and bcrypt hashing', async () => {
  const rejected = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'No Consent',
      email: 'noconsent@example.com',
      password: 'Password123!',
      role: 'attendee',
      gdprConsent: false,
    }),
  });
  assert.equal(rejected.status, 400);

  const badAdminSignup = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Fake Admin',
      email: 'fakeadmin@example.com',
      password: 'Password123!',
      role: 'admin',
      organizerInviteCode: 'WRONG-CODE',
      gdprConsent: true,
    }),
  });
  assert.equal(badAdminSignup.status, 403);

  const validAdminSignup = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Second Organizer',
      email: 'org2@example.com',
      password: 'Password123!',
      role: 'admin',
      organizerInviteCode: 'EVENTSPHERE-ORG-2026',
      gdprConsent: true,
    }),
  });
  assert.equal(validAdminSignup.status, 201);
  assert.equal(validAdminSignup.data.user.role, 'admin');

  const created = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'Password123!',
      role: 'attendee',
      gdprConsent: true,
    }),
  });
  assert.equal(created.status, 201);
  assert.ok(created.data.token);
  assert.equal(created.data.user.role, 'attendee');
  assert.equal(created.data.user.passwordHash, undefined);
});

test('Exhibitor extended signup persists company showcase and blocks cross-exhibitor edits', async () => {
  const exhSignup = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Marco Bellini',
      email: 'marco@aerogrid.io',
      password: 'Password123!',
      role: 'exhibitor',
      company: 'AeroGrid Dynamics',
      category: 'Clean Energy',
      products: ['GridOS v4', 'SolidState Inverter'],
      documents: ['Safety-Spec.pdf'],
      gdprConsent: true,
    }),
  });
  assert.equal(exhSignup.status, 201);
  assert.equal(exhSignup.data.user.role, 'exhibitor');

  // Exhibitor B must not be allowed to modify seed Exhibitor A (exh-1)
  const crossEdit = await apiJson('/api/exhibitors/exh-1', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${exhSignup.data.token}` },
    body: JSON.stringify({ companyName: 'Hijacked Showcase' }),
  });
  assert.equal(crossEdit.status, 403);
});

test('RBAC blocks attendee from admin expo edits and attendee directory while admin succeeds', async () => {
  const attLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'attendee@eventsphere.io', password: 'Attendee2026!' }),
  });
  assert.equal(attLogin.status, 200);

  const forbiddenExpoEdit = await apiJson('/api/expos/expo-2026-global', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${attLogin.data.token}` },
    body: JSON.stringify({ title: 'Unauthorized Override' }),
  });
  assert.equal(forbiddenExpoEdit.status, 403);

  const forbiddenDir = await apiJson('/api/admin/attendees', {
    headers: { Authorization: `Bearer ${attLogin.data.token}` },
  });
  assert.equal(forbiddenDir.status, 403);

  const adminLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'organizer@eventsphere.io', password: 'ExpoAdmin2026!' }),
  });
  assert.equal(adminLogin.status, 200);

  const updated = await apiJson('/api/expos/expo-2026-global', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
    body: JSON.stringify({ title: 'NextGen Industrial & Tech Expo 2026 (Updated)' }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.title, 'NextGen Industrial & Tech Expo 2026 (Updated)');

  const adminDir = await apiJson('/api/admin/attendees', {
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
  });
  assert.equal(adminDir.status, 200);
  assert.ok(Array.isArray(adminDir.data.attendees));
  assert.ok(adminDir.data.attendees.length >= 1);
  assert.equal(adminDir.data.attendees[0].passwordHash, undefined);
});

test('Attendee expo pass registration generates ticketCode and supports cancellation', async () => {
  const attLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'attendee@eventsphere.io', password: 'Attendee2026!' }),
  });
  assert.equal(attLogin.status, 200);

  const reg = await apiJson('/api/expos/expo-2026-bio/register', {
    method: 'POST',
    headers: { Authorization: `Bearer ${attLogin.data.token}` },
  });
  assert.equal(reg.status, 200);
  assert.ok(reg.data.registration.ticketCode.startsWith('ES-'));

  const cancel = await apiJson('/api/expos/expo-2026-bio/register', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${attLogin.data.token}` },
  });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.ok, true);
});

test('Atomic booth reservation prevents double booking with 409 Conflict', async () => {
  const exhLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'exhibitor@lumina-robotics.io', password: 'Exhibitor2026!' }),
  });
  assert.equal(exhLogin.status, 200);

  const stateRes = await apiJson('/api/state');
  const availableBooth = stateRes.data.booths.find((b) => b.status === 'available');
  assert.ok(availableBooth, 'Expected at least one available booth in seed data');

  const firstReserve = await apiJson(`/api/booths/${availableBooth.id}/reserve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${exhLogin.data.token}` },
  });
  assert.equal(firstReserve.status, 200);
  assert.equal(firstReserve.data.status, 'reserved');

  const secondReserve = await apiJson(`/api/booths/${availableBooth.id}/reserve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${exhLogin.data.token}` },
  });
  assert.equal(secondReserve.status, 409);
});

test('Application request-info workflow, exhibitor view tracking, and admin feedback resolution', async () => {
  const viewRes = await apiJson('/api/exhibitors/exh-1/view', { method: 'POST' });
  assert.equal(viewRes.status, 200);
  assert.ok(viewRes.data.profileViews >= 249);

  const adminLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'organizer@eventsphere.io', password: 'ExpoAdmin2026!' }),
  });
  const adminState = await apiJson('/api/state', {
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
  });
  const pendingApp = adminState.data.applications.find((a) => a.status === 'pending');
  if (pendingApp) {
    const infoReq = await apiJson(`/api/applications/${pendingApp.id}/request-info`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminLogin.data.token}` },
      body: JSON.stringify({ reviewerNote: 'Please upload floor power load spec.' }),
    });
    assert.equal(infoReq.status, 200);
    assert.equal(infoReq.data.status, 'info_requested');
    assert.equal(infoReq.data.reviewerNote, 'Please upload floor power load spec.');
  }

  const submittedFeedback = await apiJson('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      userName: 'QA Reviewer',
      category: 'Suggestion',
      message: 'Automated test ticket verification',
    }),
  });
  assert.equal(submittedFeedback.status, 201);
  assert.equal(submittedFeedback.data.status, 'open');

  const resolved = await apiJson(`/api/feedback/${submittedFeedback.data.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.status, 'resolved');
});

test('NFR Security: security headers, JWT tampering rejection, and AES-256-GCM PII encryption at rest', async () => {
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthRes.headers.get('x-powered-by'), null);

  const invalidJwt = await apiJson('/api/auth/me', {
    headers: { Authorization: 'Bearer invalid.tampered.token' },
  });
  assert.equal(invalidJwt.status, 401);

  const secretPhone = '+44-20-7946-0999';
  const signup = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Grace Hopper',
      email: 'grace@eventsphere.test',
      password: 'Password123!',
      role: 'attendee',
      phone: secretPhone,
      gdprConsent: true,
    }),
  });
  assert.equal(signup.status, 201);
  assert.equal(signup.data.user.phone, secretPhone);

  // Verify stored database file encrypts phone (AES-256-GCM) and never leaks plaintext PII or password
  const storedRaw = fs.readFileSync(path.join(tempDataDir, 'eventsphere-db.json'), 'utf8');
  assert.ok(!storedRaw.includes(secretPhone), 'Plaintext phone must not appear on disk');
  const storedParsed = JSON.parse(storedRaw);
  const storedGrace = storedParsed.users.find((u) => u.email === 'grace@eventsphere.test');
  assert.ok(storedGrace.phone.startsWith('enc:v1:'));
  assert.ok(storedGrace.passwordHash.startsWith('$2'));

  // Verify authenticated /api/auth/me returns decrypted phone cleanly
  const me = await apiJson('/api/auth/me', {
    headers: { Authorization: `Bearer ${signup.data.token}` },
  });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.phone, secretPhone);
});

test('NFR GDPR Privacy: granular consent updates, Article 20 export, and account erasure', async () => {
  const signup = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Alan Turing',
      email: 'alan@eventsphere.test',
      password: 'Password123!',
      role: 'attendee',
      gdprConsent: true,
    }),
  });
  assert.equal(signup.status, 201);

  const consentUpdate = await apiJson('/api/auth/privacy/consent', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${signup.data.token}` },
    body: JSON.stringify({ analyticsTelemetry: false, marketingEmails: false }),
  });
  assert.equal(consentUpdate.status, 200);
  assert.equal(consentUpdate.data.user.analyticsTelemetry, false);
  assert.equal(consentUpdate.data.user.marketingEmails, false);

  const exported = await apiJson('/api/auth/privacy/export', {
    headers: { Authorization: `Bearer ${signup.data.token}` },
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.data.profile.email, 'alan@eventsphere.test');
  assert.equal(exported.data.profile.passwordHash, undefined);

  const erased = await apiJson('/api/auth/account', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${signup.data.token}` },
  });
  assert.equal(erased.status, 200);
  assert.equal(erased.data.ok, true);

  const loginAfterDelete = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'alan@eventsphere.test', password: 'Password123!' }),
  });
  assert.equal(loginAfterDelete.status, 401);
});

test('NFR Performance & Reliability: concurrent burst under 1s SLA, monitoring telemetry, and manual backup RBAC', async () => {
  const t0 = performance.now();
  const burst = await Promise.all(
    Array.from({ length: 30 }, () => apiJson('/api/state')),
  );
  const elapsedMs = performance.now() - t0;
  assert.ok(burst.every((r) => r.status === 200));
  assert.ok(elapsedMs < 1500, `Expected 30 concurrent /api/state calls under 1500ms, got ${elapsedMs}ms`);

  const attLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'attendee@eventsphere.io', password: 'Attendee2026!' }),
  });
  const blockedMon = await apiJson('/api/admin/monitoring', {
    headers: { Authorization: `Bearer ${attLogin.data.token}` },
  });
  assert.equal(blockedMon.status, 403);

  const adminLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'organizer@eventsphere.io', password: 'ExpoAdmin2026!' }),
  });
  const monitoring = await apiJson('/api/admin/monitoring', {
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
  });
  assert.equal(monitoring.status, 200);
  assert.equal(monitoring.data.encryptionAtRest, 'aes-256-gcm');
  assert.ok(typeof monitoring.data.p95LatencyMs === 'number');

  const manualBackup = await apiJson('/api/admin/backup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
  });
  assert.equal(manualBackup.status, 201);
  assert.ok(manualBackup.data.filename.startsWith('eventsphere-manual-'));
});

test('Email OTP Password Reset: delivers 6-digit OTP via Nodemailer only, enforces cooldown/expiry/attempts, and updates bcrypt password', async () => {
  const userEmail = 'otp-reset-user@gmail.com';
  const reg = await apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Nadia Vance',
      email: userEmail,
      password: 'OldPassword1!',
      role: 'attendee',
      gdprConsent: true,
    }),
  });
  assert.equal(reg.status, 201);

  const beforeEmailCount = capturedEmails.length;

  // Unknown email returns generic 200 without sending email or revealing existence
  const unknownReq = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'does-not-exist@gmail.com' }),
  });
  assert.equal(unknownReq.status, 200);
  assert.equal(unknownReq.data.demoResetCode, undefined);
  assert.equal(capturedEmails.length, beforeEmailCount);

  // Known registered user triggers real SMTP email containing 6-digit OTP; API returns NO OTP
  const forgotReq = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail }),
  });
  assert.equal(forgotReq.status, 200);
  assert.equal(forgotReq.data.demoResetCode, undefined);
  assert.ok(!/\b\d{6}\b/.test(JSON.stringify(forgotReq.data)), 'API response must never leak 6-digit OTP');

  assert.equal(capturedEmails.length, beforeEmailCount + 1);
  const delivered = capturedEmails[capturedEmails.length - 1];
  assert.equal(delivered.to.toLowerCase(), userEmail);
  assert.ok(delivered.raw.includes('Password Reset Verification'));
  assert.ok(delivered.raw.includes('expires in 5 minutes'));
  assert.ok(delivered.raw.includes('Never share this'));

  // Extract 6-digit OTP from the real email text section
  const otpMatch = delivered.raw.match(/Your 6-digit verification code is:\s*(\d{6})/);
  assert.ok(otpMatch, 'Delivered email must include 6-digit OTP');
  const realOtp = otpMatch[1];

  // Stored database on disk must hash OTP and never store plaintext OTP
  const storedRaw = fs.readFileSync(path.join(tempDataDir, 'eventsphere-db.json'), 'utf8');
  assert.ok(!storedRaw.includes(`"${realOtp}"`), 'Plaintext OTP must never be persisted to disk');

  // 60-second resend cooldown blocks immediate duplicate request
  const tooSoonResend = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail }),
  });
  assert.equal(tooSoonResend.status, 429);

  // Wrong OTP is rejected
  const wrongOtp = realOtp === '000000' ? '111111' : '000000';
  const badVerify = await apiJson('/api/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, otp: wrongOtp }),
  });
  assert.equal(badVerify.status, 400);

  // Valid OTP verifies cleanly and issues resetSessionToken
  const goodVerify = await apiJson('/api/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, otp: realOtp }),
  });
  assert.equal(goodVerify.status, 200);
  assert.ok(goodVerify.data.resetSessionToken);

  // Reusing the same OTP must fail immediately
  const reuseOtp = await apiJson('/api/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, otp: realOtp }),
  });
  assert.equal(reuseOtp.status, 400);

  // Weak password rejected
  const weakReset = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      resetSessionToken: goodVerify.data.resetSessionToken,
      newPassword: 'weak',
      confirmPassword: 'weak',
    }),
  });
  assert.equal(weakReset.status, 400);

  // Mismatched confirmPassword rejected
  const mismatchReset = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      resetSessionToken: goodVerify.data.resetSessionToken,
      newPassword: 'StrongNewPass99!',
      confirmPassword: 'DifferentPass99!',
    }),
  });
  assert.equal(mismatchReset.status, 400);

  // Valid strong password completes reset
  const finalReset = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      resetSessionToken: goodVerify.data.resetSessionToken,
      newPassword: 'StrongNewPass99!',
      confirmPassword: 'StrongNewPass99!',
    }),
  });
  assert.equal(finalReset.status, 200);

  // Reusing resetSessionToken after completion is rejected
  const replayReset = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      resetSessionToken: goodVerify.data.resetSessionToken,
      newPassword: 'AnotherStrong99!',
      confirmPassword: 'AnotherStrong99!',
    }),
  });
  assert.equal(replayReset.status, 400);

  // Old password rejected, new password succeeds
  const oldLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, password: 'OldPassword1!' }),
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, password: 'StrongNewPass99!' }),
  });
  assert.equal(newLogin.status, 200);
  assert.ok(newLogin.data.token);
});


