import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc;
let tempDataDir;

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
  tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventsphere-test-'));
  const tsxBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');

  serverProc = spawn(tsxBin, ['server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'production',
      EVENTSPHERE_DATA_DIR: tempDataDir,
    },
    stdio: 'pipe',
  });

  await waitForServer(BASE_URL);
});

after(() => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
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
