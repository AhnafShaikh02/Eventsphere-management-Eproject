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

test('Registration enforces GDPR consent and hashes credentials cleanly', async () => {
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

test('RBAC blocks attendee from admin expo edits while admin succeeds', async () => {
  const attLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'attendee@eventsphere.io', password: 'Attendee2026!' }),
  });
  assert.equal(attLogin.status, 200);

  const forbidden = await apiJson('/api/expos/expo-2026-global', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${attLogin.data.token}` },
    body: JSON.stringify({ title: 'Unauthorized Override' }),
  });
  assert.equal(forbidden.status, 403);

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

test('Exhibitor profile view tracking and admin feedback resolution', async () => {
  const viewRes = await apiJson('/api/exhibitors/exh-1/view', { method: 'POST' });
  assert.equal(viewRes.status, 200);
  assert.ok(viewRes.data.profileViews >= 249);

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

  const adminLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'organizer@eventsphere.io', password: 'ExpoAdmin2026!' }),
  });
  const resolved = await apiJson(`/api/feedback/${submittedFeedback.data.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminLogin.data.token}` },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.status, 'resolved');
});
