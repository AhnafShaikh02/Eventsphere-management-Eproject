import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import {
  getMailerStatus,
  isSmtpConfigured,
  sendApplicationStatusEmail,
  sendResetCodeEmail,
  sendTicketConfirmationEmail,
} from './server/mailer';
import { ServerMonitor } from './server/monitoring';
import {
  closeMongoStore,
  connectMongoStore,
  getMongoStoreStatus,
  getSyncRecordFromMongo,
  loadDatabaseFromMongo,
  queueSyncDatabaseToMongo,
  upsertSyncRecordToMongo,
} from './server/mongoStore';
import {
  createRateLimiter,
  decryptPii,
  encryptPii,
  generateSixDigitOtp,
  hashOtp,
  hashResetSessionToken,
  securityHeadersMiddleware,
  validatePasswordStrength,
  verifyHashEqual,
} from './server/security';
import type {
  BoothStatus,
  ExpoStatus,
  ResetTokenRecord,
  ServerDatabase,
  StoredUser,
  SyncRecord,
  UserRole,
} from './server/types';

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'eventsphere-dev-jwt-secret-change-in-prod';
const ORGANIZER_SETUP_CODE = process.env.ORGANIZER_SETUP_CODE || 'EVENTSPHERE-ORG-2026';
const DATA_DIR = path.resolve(process.cwd(), process.env.EVENTSPHERE_DATA_DIR || '.data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'eventsphere-db.json');
const VAULT_FILE = path.join(DATA_DIR, 'sync-vault.json');
const SYNC_KEY_REGEX = /^[A-Z0-9-]{6,32}$/;

function createAutomatedBackup(db: ServerDatabase): void {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const dayStamp = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(BACKUPS_DIR, `eventsphere-${dayStamp}.json`);
    if (!fs.existsSync(backupFile)) {
      fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf8');
      const existing = fs
        .readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('eventsphere-') && f.endsWith('.json'))
        .sort();
      while (existing.length > 7) {
        const oldest = existing.shift();
        if (oldest) fs.unlinkSync(path.join(BACKUPS_DIR, oldest));
      }
    }
  } catch {
    // Non-fatal backup write error
  }
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function createSeedDatabase(): ServerDatabase {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const now = new Date().toISOString();

  const users: StoredUser[] = [
    {
      id: 'usr-admin-1',
      name: 'Elena Vance',
      email: 'organizer@eventsphere.io',
      passwordHash: hash('ExpoAdmin2026!'),
      role: 'admin',
      company: 'EventSphere Management',
      title: 'Lead Expo Director',
      phone: '+44 20 7946 0100',
      gdprConsent: true,
      createdAt: now,
    },
    {
      id: 'usr-exh-1',
      name: 'Marcus Chen',
      email: 'exhibitor@lumina-robotics.io',
      passwordHash: hash('Exhibitor2026!'),
      role: 'exhibitor',
      company: 'Lumina Robotics',
      title: 'VP of Field Engineering',
      phone: '+44 20 7946 0811',
      gdprConsent: true,
      createdAt: now,
    },
    {
      id: 'usr-exh-2',
      name: 'Sora Takahashi',
      email: 'exhibitor@aethergrid.io',
      passwordHash: hash('Exhibitor2026!'),
      role: 'exhibitor',
      company: 'AetherGrid CleanTech',
      title: 'Solutions Architect',
      phone: '+44 20 7946 0420',
      gdprConsent: true,
      createdAt: now,
    },
    {
      id: 'usr-att-1',
      name: 'Maya Patel',
      email: 'attendee@eventsphere.io',
      passwordHash: hash('Attendee2026!'),
      role: 'attendee',
      company: 'Horizon Ventures',
      title: 'Hardware Partner',
      phone: '+44 20 7946 0905',
      gdprConsent: true,
      createdAt: now,
    },
  ];

  const exhibitors: ServerDatabase['exhibitors'] = [
    {
      id: 'exh-1',
      userId: 'usr-exh-1',
      companyName: 'Lumina Robotics',
      category: 'Robotics & AI',
      tagline: 'Autonomous warehouse orchestration and tactile manipulator arms',
      description:
        'Lumina builds millimeter-accurate cobots and fleet routing controllers engineered for high-throughput fulfillment centers.',
      logoColor: '#10B981',
      contactEmail: 'exhibitor@lumina-robotics.io',
      phone: '+44 20 7946 0811',
      website: 'https://lumina-robotics.example',
      products: ['Lumina Arm M4', 'FleetOS Edge Router', 'VisionPick Sensor Kit'],
      staff: ['Marcus Chen', 'Priya Nair', 'Liam Brooks'],
      documents: ['ISO-10218-Safety-Cert.pdf', 'Booth-Power-Spec.pdf'],
      profileViews: 248,
    },
    {
      id: 'exh-2',
      userId: 'usr-exh-2',
      companyName: 'AetherGrid CleanTech',
      category: 'Clean Energy',
      tagline: 'Modular solid-state microgrids for zero-emission venues',
      description:
        'High-density containerized battery storage and bidirectional DC microgrids powering commercial expos and campuses.',
      logoColor: '#34D399',
      contactEmail: 'exhibitor@aethergrid.io',
      phone: '+44 20 7946 0420',
      website: 'https://aethergrid.example',
      products: ['AetherCell 500kWh', 'GridPulse Telemetry', 'SolarSync Inverter'],
      staff: ['Sora Takahashi', 'Devon Cole'],
      documents: ['UL-9540-Compliance.pdf'],
      profileViews: 194,
    },
    {
      id: 'exh-3',
      userId: 'usr-exh-3',
      companyName: 'Sentinel Mesh Security',
      category: 'Cloud & Security',
      tagline: 'Zero-trust identity fabric for distributed edge fleets',
      description:
        'Hardware-attested workload identities and real-time anomaly containment for industrial IoT deployments.',
      logoColor: '#F97362',
      contactEmail: 'hello@sentinelmesh.example',
      phone: '+1 415 555 0194',
      website: 'https://sentinelmesh.example',
      products: ['MeshGate HSM', 'ZeroTrust CLI', 'AuditStream'],
      staff: ['Aria Novak', 'Julian Cruz'],
      documents: ['SOC2-Attestation.pdf'],
      profileViews: 176,
    },
    {
      id: 'exh-4',
      userId: 'usr-exh-4',
      companyName: 'Prism Spatial Labs',
      category: 'Spatial Computing',
      tagline: 'Real-time digital twin optics and holographic CAD review',
      description:
        'Ultra-low-latency WebGL and headset visualization engines for architectural, factory, and live venue twins.',
      logoColor: '#38BDF8',
      contactEmail: 'team@prismspatial.example',
      phone: '+46 8 555 0142',
      website: 'https://prismspatial.example',
      products: ['Prism Twin Studio', 'HoloLink SDK'],
      staff: ['Noah Lindqvist', 'Chloe Park'],
      documents: ['Optics-Safety-Spec.pdf'],
      profileViews: 215,
    },
    {
      id: 'exh-5',
      userId: 'usr-exh-5',
      companyName: 'HelixBio Diagnostics',
      category: 'Biotech & MedTech',
      tagline: 'Point-of-care microfluidic sequencers under 12 minutes',
      description:
        'Portable isothermal assay cartridges and encrypted clinical telemetry dashboards.',
      logoColor: '#F59E0B',
      contactEmail: 'info@helixbio.example',
      phone: '+1 650 555 0118',
      website: 'https://helixbio.example',
      products: ['HelixCartridge Pro', 'BioVault Sync'],
      staff: ['Dr. Amara Osei', 'Kenji Sato'],
      documents: ['CLIA-Waiver-Brief.pdf'],
      profileViews: 162,
    },
  ];

  const zones = ['North Innovation Wing', 'Central Atrium', 'West Robotics Row', 'South Enterprise Hall'];
  const booths: ServerDatabase['booths'] = [];
  const reservedAssignments: Record<string, { id: string; name: string }> = {
    A2: { id: 'exh-1', name: 'Lumina Robotics' },
    A5: { id: 'exh-4', name: 'Prism Spatial Labs' },
    B3: { id: 'exh-2', name: 'AetherGrid CleanTech' },
    C1: { id: 'exh-3', name: 'Sentinel Mesh Security' },
    C4: { id: 'exh-5', name: 'HelixBio Diagnostics' },
    D2: { id: 'exh-1', name: 'Lumina Robotics' },
  };
  const pendingSet = new Set(['A4', 'B5', 'C6', 'D4']);

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const code = `${'ABCD'[r]}${c + 1}`;
      const assigned = reservedAssignments[code];
      const status: BoothStatus = assigned
        ? 'reserved'
        : pendingSet.has(code)
          ? 'pending'
          : 'available';
      const size: '3x3m Standard' | '6x3m Corner' | '6x6m Island' =
        c === 0 || c === 5 ? '6x3m Corner' : r === 1 && (c === 2 || c === 3) ? '6x6m Island' : '3x3m Standard';
      const priceUsd = size === '6x6m Island' ? 6800 : size === '6x3m Corner' ? 4200 : 2800;

      booths.push({
        id: `booth-${code}`,
        expoId: 'expo-2026-global',
        number: code,
        zone: zones[r],
        size,
        priceUsd,
        status,
        row: r,
        col: c,
        exhibitorId: assigned ? assigned.id : null,
        exhibitorName: assigned ? assigned.name : null,
        trafficCount: 35 + ((r * 17 + c * 23) % 140),
      });
    }
  }

  const expos: ServerDatabase['expos'] = [
    {
      id: 'expo-2026-global',
      title: 'NextGen Industrial & Tech Expo 2026',
      date: '2026-11-18',
      endDate: '2026-11-20',
      location: 'ExCeL Hall 4 · London',
      description:
        'Flagship three-day convergence of autonomous robotics, clean microgrids, spatial twins, and enterprise security.',
      theme: 'Autonomous Infrastructure & Live Twins',
      category: 'Robotics & AI',
      status: 'live',
      capacity: 1200,
      bannerAccent: '#10B981',
      registeredUserIds: ['usr-att-1'],
    },
    {
      id: 'expo-2026-bio',
      title: 'BioMed & Diagnostics Summit 2026',
      date: '2026-12-08',
      endDate: '2026-12-09',
      location: 'Moscone West · San Francisco',
      description:
        'Clinical instrumentation, microfluidic diagnostics, and hospital automation showcase.',
      theme: 'Precision Diagnostics at Scale',
      category: 'Biotech & MedTech',
      status: 'upcoming',
      capacity: 650,
      bannerAccent: '#2DD4BF',
      registeredUserIds: [],
    },
    {
      id: 'expo-2026-clean',
      title: 'CleanGrid Energy Forum 2026',
      date: '2027-01-22',
      endDate: '2027-01-24',
      location: 'Messe Berlin · Hall 2',
      description:
        'Commercial solid-state battery storage, bidirectional microgrids, and zero-emission venue architecture.',
      theme: 'Zero-Emission Venue Power',
      category: 'Clean Energy',
      status: 'upcoming',
      capacity: 900,
      bannerAccent: '#34D399',
      registeredUserIds: [],
    },
  ];

  const applications: ServerDatabase['applications'] = [
    {
      id: 'app-1',
      expoId: 'expo-2026-global',
      exhibitorId: 'exh-1',
      companyName: 'Lumina Robotics',
      category: 'Robotics & AI',
      productsSummary: 'Lumina Arm M4 collaborative robot cell + live pick-and-place demo.',
      documents: ['ISO-10218-Safety-Cert.pdf', 'Booth-Power-Spec.pdf'],
      status: 'approved',
      submittedAt: isoDaysAgo(5),
    },
    {
      id: 'app-2',
      expoId: 'expo-2026-global',
      exhibitorId: 'exh-2',
      companyName: 'AetherGrid CleanTech',
      category: 'Clean Energy',
      productsSummary: 'AetherCell modular energy wall and GridPulse monitoring station.',
      documents: ['UL-9540-Compliance.pdf'],
      status: 'approved',
      submittedAt: isoDaysAgo(4),
    },
    {
      id: 'app-3',
      expoId: 'expo-2026-global',
      exhibitorId: 'exh-3',
      companyName: 'Sentinel Mesh Security',
      category: 'Cloud & Security',
      productsSummary: 'Hardware-attested zero-trust edge gateway live penetration lab.',
      documents: ['SOC2-Attestation.pdf', 'Demo-Network-Plan.pdf'],
      status: 'pending',
      submittedAt: isoDaysAgo(1),
    },
  ];

  const registrations: ServerDatabase['registrations'] = [
    {
      id: 'reg-1',
      expoId: 'expo-2026-global',
      userId: 'usr-att-1',
      userName: 'Maya Patel',
      userEmail: 'attendee@eventsphere.io',
      ticketCode: 'ES-2026-8412',
      status: 'confirmed',
      registeredAt: isoDaysAgo(3),
    },
  ];

  const sessions: ServerDatabase['sessions'] = [
    {
      id: 'ses-1',
      expoId: 'expo-2026-global',
      title: 'Opening Keynote: Real-Time Venues & Digital Twins',
      speaker: 'Elena Vance',
      speakerRole: 'Lead Expo Director, EventSphere',
      topic: 'Spatial Operations',
      startTime: '09:30',
      endTime: '10:30',
      location: 'Main Keynote Stage',
      capacity: 400,
      registeredUserIds: ['usr-att-1'],
      bookmarkedUserIds: ['usr-att-1'],
      updatedAt: now,
    },
    {
      id: 'ses-2',
      expoId: 'expo-2026-global',
      title: 'Tactile Cobots & Fleet Orchestration Workshop',
      speaker: 'Marcus Chen',
      speakerRole: 'VP Engineering, Lumina Robotics',
      topic: 'Robotics & AI',
      startTime: '11:00',
      endTime: '12:15',
      location: 'West Robotics Theater (near Booth A2)',
      capacity: 120,
      registeredUserIds: ['usr-att-1'],
      bookmarkedUserIds: [],
      updatedAt: now,
    },
    {
      id: 'ses-3',
      expoId: 'expo-2026-global',
      title: 'Decarbonizing Mega-Expos with Solid-State Microgrids',
      speaker: 'Sora Takahashi',
      speakerRole: 'Solutions Architect, AetherGrid',
      topic: 'Clean Energy',
      startTime: '13:30',
      endTime: '14:30',
      location: 'Central Atrium Stage',
      capacity: 180,
      registeredUserIds: [],
      bookmarkedUserIds: ['usr-att-1'],
      updatedAt: now,
    },
    {
      id: 'ses-4',
      expoId: 'expo-2026-global',
      title: 'Zero-Trust Edge Security for Connected Hardware',
      speaker: 'Aria Novak',
      speakerRole: 'Principal Security Engineer, Sentinel Mesh',
      topic: 'Cloud & Security',
      startTime: '15:15',
      endTime: '16:15',
      location: 'Enterprise Lab B',
      capacity: 90,
      registeredUserIds: [],
      bookmarkedUserIds: [],
      updatedAt: now,
    },
  ];

  const speakers: ServerDatabase['speakers'] = [
    {
      id: 'spk-1',
      expoId: 'expo-2026-global',
      name: 'Elena Vance',
      role: 'Lead Expo Director',
      company: 'EventSphere Management',
      topic: 'Spatial Operations',
      bio: 'Architect of live 3D exhibition campuses and sub-2-second floor telemetry platforms.',
    },
    {
      id: 'spk-2',
      expoId: 'expo-2026-global',
      name: 'Marcus Chen',
      role: 'VP of Field Engineering',
      company: 'Lumina Robotics',
      topic: 'Robotics & AI',
      bio: 'Leads millimeter-accurate tactile cobot deployments across 40+ European fulfillment hubs.',
    },
    {
      id: 'spk-3',
      expoId: 'expo-2026-global',
      name: 'Sora Takahashi',
      role: 'Solutions Architect',
      company: 'AetherGrid CleanTech',
      topic: 'Clean Energy',
      bio: 'Designs high-density solid-state DC microgrids for zero-emission mega-venues.',
    },
    {
      id: 'spk-4',
      expoId: 'expo-2026-global',
      name: 'Aria Novak',
      role: 'Principal Security Engineer',
      company: 'Sentinel Mesh Security',
      topic: 'Cloud & Security',
      bio: 'Specializes in hardware-attested zero-trust identity fabrics for autonomous hardware.',
    },
  ];

  const messages: ServerDatabase['messages'] = [
    {
      id: 'msg-1',
      senderId: 'usr-exh-1',
      senderName: 'Marcus Chen (Lumina Robotics)',
      senderRole: 'exhibitor',
      recipientChannel: 'organizer',
      recipientLabel: 'Organizer Desk',
      body: 'Confirming 3-phase power drop at Booth A2 before setup opens at 07:00.',
      createdAt: isoDaysAgo(0) + 'T08:15:00.000Z',
    },
    {
      id: 'msg-2',
      senderId: 'usr-admin-1',
      senderName: 'Elena Vance (Organizer)',
      senderRole: 'admin',
      recipientChannel: 'organizer',
      recipientLabel: 'Organizer Desk',
      body: 'Confirmed Marcus — facilities crew has tagged Booth A2 for 32A power delivery.',
      createdAt: isoDaysAgo(0) + 'T08:22:00.000Z',
    },
  ];

  const notifications: ServerDatabase['notifications'] = [
    {
      id: 'not-1',
      targetUserId: 'all',
      title: 'Live Floor Plan Synchronized',
      message: 'All 24 booths for NextGen Industrial & Tech Expo 2026 are live for real-time reservation.',
      kind: 'booth',
      readBy: [],
      createdAt: now,
    },
    {
      id: 'not-2',
      targetUserId: 'all',
      title: 'Keynote Reminder · 09:30',
      message: 'Opening Keynote: Real-Time Venues & Digital Twins begins at Main Keynote Stage.',
      kind: 'reminder',
      readBy: [],
      createdAt: now,
    },
  ];

  const feedback: ServerDatabase['feedback'] = [
    {
      id: 'fb-1',
      userId: 'usr-att-1',
      userName: 'Maya Patel',
      category: 'Suggestion',
      message: 'Love being able to see booth A2 power & demo status directly on the 3D hall map.',
      createdAt: isoDaysAgo(1) + 'T14:20:00.000Z',
      status: 'resolved',
    },
  ];

  const activityLogs: ServerDatabase['activityLogs'] = [
    {
      id: 'log-1',
      actor: 'Elena Vance (Admin)',
      action: 'EXPO_PUBLISHED',
      detail: 'Published NextGen Industrial & Tech Expo 2026 with 24 booths and 4 sessions.',
      timestamp: now,
    },
    {
      id: 'log-2',
      actor: 'Marcus Chen (Exhibitor)',
      action: 'BOOTH_RESERVED',
      detail: 'Atomically reserved Booth A2 (6x3m Corner) in North Innovation Wing.',
      timestamp: now,
    },
  ];

  const analyticsSeries: ServerDatabase['analyticsSeries'] = [];
  for (let d = 29; d >= 0; d--) {
    analyticsSeries.push({
      date: isoDaysAgo(d),
      boothTraffic: 140 + ((d * 29) % 180) + (d < 5 ? 95 : 0),
      sessionBookmarks: 48 + ((d * 17) % 75) + (d < 5 ? 40 : 0),
      profileViews: 95 + ((d * 23) % 130) + (d < 5 ? 60 : 0),
    });
  }

  return {
    users,
    resetTokens: [],
    expos,
    booths,
    exhibitors,
    applications,
    registrations,
    sessions,
    speakers,
    messages,
    notifications,
    feedback,
    activityLogs,
    analyticsSeries,
  };
}

function migrateDatabase(db: ServerDatabase): ServerDatabase {
  const seed = createSeedDatabase();
  if (!Array.isArray(db.registrations)) db.registrations = seed.registrations;
  if (!Array.isArray(db.speakers)) db.speakers = seed.speakers;
  db.expos = db.expos.map((e, i) => ({
    ...e,
    category: e.category || (i === 0 ? 'Robotics & AI' : 'Biotech & MedTech'),
    status: e.status || (i === 0 ? 'live' : 'upcoming'),
    capacity: e.capacity || 800,
  }));
  db.users = db.users.map((u) => ({
    ...u,
    phone: u.phone ? encryptPii(u.phone) : undefined,
    analyticsTelemetry: u.analyticsTelemetry ?? true,
    marketingEmails: u.marketingEmails ?? true,
  }));
  db.exhibitors = db.exhibitors.map((ex) => ({
    ...ex,
    phone: ex.phone ? encryptPii(ex.phone) : undefined,
  }));
  const nowMs = Date.now();
  db.resetTokens = Array.isArray(db.resetTokens)
    ? db.resetTokens.filter(
        (t) =>
          t &&
          typeof t.email === 'string' &&
          typeof t.userId === 'string' &&
          !t.used &&
          ((t.otpHash && t.expiresAt > nowMs) || (t.verified && t.resetSessionExpiresAt && t.resetSessionExpiresAt > nowMs)),
      )
    : [];
  return db;
}

function loadDatabase(): ServerDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ServerDatabase;
    if (!parsed.booths || !parsed.users || !parsed.sessions) {
      throw new Error('Incomplete DB');
    }
    return migrateDatabase(parsed);
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

function saveDatabase(db: ServerDatabase, skipMongoSync = false): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
  createAutomatedBackup(db);
  if (!skipMongoSync) {
    void queueSyncDatabaseToMongo(db);
  }
}

function loadVault(): Record<string, SyncRecord> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VAULT_FILE)) {
    fs.writeFileSync(VAULT_FILE, JSON.stringify({}, null, 2), 'utf8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8')) as Record<string, SyncRecord>;
  } catch {
    return {};
  }
}

function saveVault(vault: Record<string, SyncRecord>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmp = `${VAULT_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(vault, null, 2), 'utf8');
  fs.renameSync(tmp, VAULT_FILE);
}

interface AuthUserClaims {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthRequest extends Request {
  authUser?: AuthUserClaims;
}

function signToken(user: StoredUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    title: user.title,
    phone: decryptPii(user.phone),
    gdprConsent: user.gdprConsent,
    analyticsTelemetry: user.analyticsTelemetry ?? true,
    marketingEmails: user.marketingEmails ?? true,
    consentUpdatedAt: user.consentUpdatedAt,
    createdAt: user.createdAt,
  };
}

function decodeOptionalAuth(req: Request): AuthUserClaims | undefined {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return undefined;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserClaims;
  } catch {
    return undefined;
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeadersMiddleware);

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  // Lightweight gzip compression for JSON/API payloads >= 1KB
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const accept = String(req.headers['accept-encoding'] || '');
    if (!accept.includes('gzip')) {
      next();
      return;
    }
    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const jsonStr = JSON.stringify(body);
      if (jsonStr.length < 1024 || res.headersSent) {
        return origJson(body);
      }
      try {
        const compressed = zlib.gzipSync(jsonStr);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(compressed);
      } catch {
        return origJson(body);
      }
    }) as Response['json'];
    next();
  });

  app.use('/api/assistant', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '512kb' }));

  const monitor = new ServerMonitor();
  const apiRateLimiter = createRateLimiter({ windowMs: 60_000, max: 400, keyPrefix: 'api' });
  const authRateLimiter = createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: 'auth' });
  const otpRequestLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 12, keyPrefix: 'otp-req' });
  const otpVerifyLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 25, keyPrefix: 'otp-verify' });

  app.use('/api', apiRateLimiter);
  app.use('/api/auth', authRateLimiter);

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const t0 = performance.now();
    res.on('finish', () => {
      monitor.record(req.method, req.originalUrl, res.statusCode, performance.now() - t0);
    });
    next();
  });

  await connectMongoStore();
  let db: ServerDatabase;
  const mongoLoaded = await loadDatabaseFromMongo();
  if (mongoLoaded && mongoLoaded.booths?.length && mongoLoaded.users?.length) {
    db = migrateDatabase(mongoLoaded);
    saveDatabase(db, true);
  } else {
    db = loadDatabase();
    await queueSyncDatabaseToMongo(db);
  }
  createAutomatedBackup(db);
  let concurrentUsers = 1;

  const pushLog = (actor: string, action: string, detail: string) => {
    db.activityLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actor,
      action,
      detail,
      timestamp: new Date().toISOString(),
    });
    db.activityLogs = db.activityLogs.slice(0, 100);
  };

  const pushNotification = (
    targetUserId: string,
    title: string,
    message: string,
    kind: 'schedule' | 'booth' | 'application' | 'reminder' | 'system',
  ) => {
    const item = {
      id: `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetUserId,
      title,
      message,
      kind,
      readBy: [] as string[],
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(item);
    db.notifications = db.notifications.slice(0, 60);
    if (targetUserId === 'all') {
      io.emit('notification:new', item);
    }
  };

  const getPublicSnapshot = (viewer?: AuthUserClaims) => {
    const role = viewer?.role;
    const uid = viewer?.id;
    const viewerExhibitor = uid ? db.exhibitors.find((e) => e.userId === uid) : undefined;

    const notifications = db.notifications.filter(
      (n) => n.targetUserId === 'all' || (uid && n.targetUserId === uid),
    );

    const applications =
      role === 'admin'
        ? db.applications
        : role === 'exhibitor' && viewerExhibitor
          ? db.applications.filter((a) => a.exhibitorId === viewerExhibitor.id)
          : [];

    const registrations =
      role === 'admin'
        ? db.registrations
        : uid
          ? db.registrations.filter((r) => r.userId === uid)
          : [];

    const messages =
      role === 'admin'
        ? db.messages
        : uid
          ? db.messages.filter(
              (m) =>
                m.senderId === uid ||
                m.recipientChannel === 'hall-general' ||
                (viewerExhibitor && m.recipientChannel === viewerExhibitor.id) ||
                (role === 'exhibitor' && m.recipientChannel === 'organizer'),
            )
          : [];

    const feedback =
      role === 'admin'
        ? db.feedback
        : uid
          ? db.feedback.filter((f) => f.userId === uid)
          : [];

    const activityLogs = role === 'admin' ? db.activityLogs : [];

    const exhibitors = db.exhibitors.map((ex) => ({
      ...ex,
      phone: decryptPii(ex.phone),
    }));

    return {
      expos: db.expos,
      booths: db.booths,
      exhibitors,
      applications,
      registrations,
      sessions: db.sessions,
      speakers: db.speakers,
      messages,
      notifications,
      feedback,
      activityLogs,
      analyticsSeries: db.analyticsSeries,
      concurrentUsers: Math.max(1, concurrentUsers),
    };
  };

  io.on('connection', (socket) => {
    concurrentUsers = io.engine.clientsCount;
    io.emit('presence:count', concurrentUsers);
    socket.emit('state:sync', getPublicSnapshot());

    socket.on('disconnect', () => {
      concurrentUsers = io.engine.clientsCount;
      io.emit('presence:count', concurrentUsers);
    });
  });

  const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserClaims;
      req.authUser = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  };

  const requireRole = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.authUser) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      if (!roles.includes(req.authUser.role)) {
        res.status(403).json({ error: `Role '${req.authUser.role}' is not authorized for this action.` });
        return;
      }
      next();
    };
  };

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'eventsphere',
      concurrentUsers,
      encryptionAtRest: 'aes-256-gcm',
      database: getMongoStoreStatus(),
      smtp: getMailerStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/metrics', (_req: Request, res: Response) => {
    const backupFiles = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).length
      : 0;
    const summary = monitor.getSummary();
    res.json({
      ...summary,
      concurrentUsers: Math.max(1, concurrentUsers),
      backupCount: backupFiles,
      storageMode: getMongoStoreStatus().mode,
      smtpConfigured: getMailerStatus().configured,
    });
  });

  app.get('/api/state', (req: Request, res: Response) => {
    const viewer = decodeOptionalAuth(req);
    res.json(getPublicSnapshot(viewer));
  });

  // Real-Time Venue Weather Telemetry (Open-Meteo Geocoding + Live Forecast)
  type WeatherConditionCategory =
    | 'clear'
    | 'partly_cloudy'
    | 'cloudy'
    | 'fog'
    | 'drizzle'
    | 'rain'
    | 'snow'
    | 'storm';

  interface CachedWeatherEntry {
    expiresAt: number;
    payload: {
      locationQuery: string;
      resolvedCity: string;
      country?: string;
      latitude: number;
      longitude: number;
      timezone: string;
      utcOffsetSeconds: number;
      temperatureC: number;
      apparentTemperatureC: number;
      humidityPct: number;
      windSpeedKmh: number;
      precipitationMm: number;
      weatherCode: number;
      conditionLabel: string;
      conditionCategory: WeatherConditionCategory;
      isDay: boolean;
      highC: number | null;
      lowC: number | null;
      observedAt: string;
      fetchedAt: string;
      source: string;
    };
  }

  const weatherCache = new Map<string, CachedWeatherEntry>();
  const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;

  const KNOWN_EXPO_VENUES: Array<{
    match: RegExp;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }> = [
    { match: /\bexcel\b|\blondon\b/i, city: 'London', country: 'United Kingdom', latitude: 51.5085, longitude: 0.0298 },
    { match: /\bmoscone\b|\bsan francisco\b/i, city: 'San Francisco', country: 'United States', latitude: 37.784, longitude: -122.4014 },
    { match: /\bmesse berlin\b|\bberlin\b/i, city: 'Berlin', country: 'Germany', latitude: 52.5038, longitude: 13.2719 },
    { match: /\bmccormick\b|\bchicago\b/i, city: 'Chicago', country: 'United States', latitude: 41.851, longitude: -87.617 },
    { match: /\blas vegas\b|\blvcc\b/i, city: 'Las Vegas', country: 'United States', latitude: 36.1319, longitude: -115.1516 },
    { match: /\btokyo\b|\bbig sight\b/i, city: 'Tokyo', country: 'Japan', latitude: 35.6298, longitude: 139.7942 },
    { match: /\bsingapore\b|\bmarina bay\b/i, city: 'Singapore', country: 'Singapore', latitude: 1.2834, longitude: 103.8607 },
    { match: /\bdubai\b|\bdwtc\b/i, city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2238, longitude: 55.2869 },
    { match: /\bparis\b|\bporte de versailles\b/i, city: 'Paris', country: 'France', latitude: 48.8323, longitude: 2.2873 },
  ];

  const describeWmoWeather = (
    code: number,
  ): { label: string; category: WeatherConditionCategory } => {
    if (code === 0) return { label: 'Clear Sky', category: 'clear' };
    if (code === 1) return { label: 'Mostly Clear', category: 'clear' };
    if (code === 2) return { label: 'Partly Cloudy', category: 'partly_cloudy' };
    if (code === 3) return { label: 'Overcast', category: 'cloudy' };
    if (code === 45 || code === 48) return { label: 'Fog & Mist', category: 'fog' };
    if (code >= 51 && code <= 57) return { label: 'Light Drizzle', category: 'drizzle' };
    if (code >= 61 && code <= 65) return { label: code === 65 ? 'Heavy Rain' : 'Rain', category: 'rain' };
    if (code === 66 || code === 67) return { label: 'Freezing Rain', category: 'rain' };
    if (code >= 71 && code <= 77) return { label: 'Snowfall', category: 'snow' };
    if (code >= 80 && code <= 82) return { label: 'Rain Showers', category: 'rain' };
    if (code === 85 || code === 86) return { label: 'Snow Showers', category: 'snow' };
    if (code >= 95) return { label: 'Thunderstorm', category: 'storm' };
    return { label: 'Variable Clouds', category: 'partly_cloudy' };
  };

  const buildGeoCandidates = (rawLocation: string): string[] => {
    const segments = rawLocation
      .split(/[·,|/]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const candidates: string[] = [];
    // Prefer city/trailing segments first (e.g. "ExCeL Hall 4 · London" -> "London")
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (!/^(?:hall|pavilion|wing|stage|room|level|floor)\s*[a-z0-9]*$/i.test(seg)) {
        candidates.push(seg);
      }
      const stripped = seg
        .replace(/\b(?:hall|pavilion|wing|stage|room|center|centre|arena|west|east|north|south|messe)\b/gi, ' ')
        .replace(/\b\d+\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (stripped && stripped.length >= 2) {
        candidates.push(stripped);
      }
    }
    candidates.push(rawLocation.trim());
    return Array.from(new Set(candidates.filter((c) => c.length >= 2)));
  };

  const resolveVenueCoordinates = async (
    rawLocation: string,
  ): Promise<{ city: string; country?: string; latitude: number; longitude: number } | null> => {
    const candidates = buildGeoCandidates(rawLocation);
    for (const candidate of candidates) {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
        if (geoRes.ok) {
          const geoJson = (await geoRes.json()) as {
            results?: Array<{ name?: string; country?: string; latitude?: number; longitude?: number }>;
          };
          const hit = geoJson.results?.[0];
          if (hit && typeof hit.latitude === 'number' && typeof hit.longitude === 'number') {
            return {
              city: hit.name || candidate,
              country: hit.country,
              latitude: hit.latitude,
              longitude: hit.longitude,
            };
          }
        }
      } catch {
        // Try next candidate or known venue coordinates
      }
    }

    const known = KNOWN_EXPO_VENUES.find((v) => v.match.test(rawLocation));
    if (known) {
      return {
        city: known.city,
        country: known.country,
        latitude: known.latitude,
        longitude: known.longitude,
      };
    }

    return null;
  };

  app.get('/api/weather', async (req: Request, res: Response) => {
    const rawLocation = String(req.query.location || db.expos[0]?.location || 'London').trim();
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const cacheKey = rawLocation.toLowerCase();

    if (!forceRefresh) {
      const cached = weatherCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.json(cached.payload);
        return;
      }
    }

    const coords = await resolveVenueCoordinates(rawLocation);
    if (!coords) {
      res.status(404).json({
        error: `Unable to locate coordinates for venue "${rawLocation}".`,
      });
      return;
    }

    try {
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${coords.latitude.toFixed(4)}` +
        `&longitude=${coords.longitude.toFixed(4)}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=1`;

      const weatherRes = await fetch(forecastUrl, { signal: AbortSignal.timeout(6500) });
      if (!weatherRes.ok) {
        res.status(502).json({ error: `Weather provider returned status ${weatherRes.status}.` });
        return;
      }

      const data = (await weatherRes.json()) as {
        timezone?: string;
        utc_offset_seconds?: number;
        current?: {
          time?: string;
          temperature_2m?: number;
          relative_humidity_2m?: number;
          apparent_temperature?: number;
          is_day?: number;
          precipitation?: number;
          weather_code?: number;
          wind_speed_10m?: number;
        };
        daily?: {
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
        };
      };

      if (!data.current || typeof data.current.temperature_2m !== 'number') {
        res.status(502).json({ error: 'Weather provider returned an incomplete forecast payload.' });
        return;
      }

      const code = Number(data.current.weather_code ?? 0);
      const condition = describeWmoWeather(code);
      const payload = {
        locationQuery: rawLocation,
        resolvedCity: coords.city,
        country: coords.country,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: data.timezone || 'UTC',
        utcOffsetSeconds: Number(data.utc_offset_seconds ?? 0),
        temperatureC: Number(data.current.temperature_2m.toFixed(1)),
        apparentTemperatureC: Number(
          (data.current.apparent_temperature ?? data.current.temperature_2m).toFixed(1),
        ),
        humidityPct: Math.round(data.current.relative_humidity_2m ?? 0),
        windSpeedKmh: Math.round(data.current.wind_speed_10m ?? 0),
        precipitationMm: Number((data.current.precipitation ?? 0).toFixed(1)),
        weatherCode: code,
        conditionLabel: condition.label,
        conditionCategory: condition.category,
        isDay: data.current.is_day !== 0,
        highC:
          typeof data.daily?.temperature_2m_max?.[0] === 'number'
            ? Number(data.daily.temperature_2m_max[0].toFixed(1))
            : null,
        lowC:
          typeof data.daily?.temperature_2m_min?.[0] === 'number'
            ? Number(data.daily.temperature_2m_min[0].toFixed(1))
            : null,
        observedAt: data.current.time || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        source: 'Open-Meteo Live',
      };

      weatherCache.set(cacheKey, {
        expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
        payload,
      });

      res.json(payload);
    } catch {
      res.status(502).json({
        error: 'Unable to reach live weather telemetry service right now.',
      });
    }
  });

  // AUTH-1..6
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const {
      name,
      email,
      password,
      role,
      company,
      phone,
      category,
      description,
      website,
      logoColor,
      products,
      documents,
      organizerInviteCode,
      gdprConsent,
    } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      company?: string;
      phone?: string;
      category?: ServerDatabase['exhibitors'][number]['category'];
      description?: string;
      website?: string;
      logoColor?: string;
      products?: string[];
      documents?: string[];
      organizerInviteCode?: string;
      gdprConsent?: boolean;
    };
    if (!name || !email || !password || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required.' });
      return;
    }
    if (!gdprConsent) {
      res.status(400).json({ error: 'GDPR data-processing consent is required to register.' });
      return;
    }

    if (role === 'admin') {
      if (!organizerInviteCode || organizerInviteCode.trim() !== ORGANIZER_SETUP_CODE) {
        res.status(403).json({
          error: 'Valid Organizer provisioning invite code is required for Organizer accounts.',
        });
        return;
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const assignedRole: UserRole =
      role === 'admin' ? 'admin' : role === 'exhibitor' ? 'exhibitor' : 'attendee';

    const encryptedPhone = encryptPii(phone?.trim().slice(0, 32));
    const user: StoredUser = {
      id: `usr-${Date.now()}`,
      name: name.trim().slice(0, 80),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role: assignedRole,
      company: company?.trim().slice(0, 80),
      phone: encryptedPhone,
      gdprConsent: true,
      analyticsTelemetry: true,
      marketingEmails: true,
      consentUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);

    if (assignedRole === 'exhibitor') {
      const validColor = logoColor && /^#[0-9a-fA-F]{6}$/.test(logoColor) ? logoColor : '#10B981';
      db.exhibitors.push({
        id: `exh-${Date.now()}`,
        userId: user.id,
        companyName: user.company || `${user.name} Co.`,
        category: category || 'Robotics & AI',
        tagline: (description || 'New EventSphere Exhibitor Partner').slice(0, 95),
        description: (description || 'Exhibitor profile awaiting booth setup.').trim(),
        logoColor: validColor,
        contactEmail: user.email,
        phone: encryptedPhone,
        website: (website || '').trim(),
        products: Array.isArray(products) ? products.filter(Boolean).slice(0, 12) : [],
        staff: [user.name],
        documents: Array.isArray(documents) ? documents.filter(Boolean).slice(0, 10) : [],
        profileViews: 1,
      });
    }

    pushLog(user.name, 'USER_REGISTERED', `Registered as ${assignedRole}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email === cleanEmail);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    pushLog(user.name, 'USER_LOGIN', `Signed in (${user.role})`);
    saveDatabase(db);
    res.json({ token: signToken(user), user: sanitizeUser(user) });
  });

  const OTP_TTL_MS = 5 * 60 * 1000;
  const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
  const OTP_MAX_ATTEMPTS = 5;
  const RESET_SESSION_TTL_MS = 10 * 60 * 1000;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  app.post('/api/auth/forgot-password', otpRequestLimiter, async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid registered email address.' });
      return;
    }

    if (!isSmtpConfigured()) {
      res.status(503).json({
        error: 'Email delivery is not configured on the server. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.',
      });
      return;
    }

    const now = Date.now();
    // Prune expired reset records
    db.resetTokens = db.resetTokens.filter(
      (t) => !t.used && (t.expiresAt > now || (t.verified && t.resetSessionExpiresAt && t.resetSessionExpiresAt > now)),
    );

    const user = db.users.find((u) => u.email === cleanEmail);
    if (!user) {
      // Generic response prevents account/email enumeration
      res.json({
        ok: true,
        message:
          'If an account with that email exists, a 6-digit verification code has been sent to your Gmail inbox.',
        cooldownSeconds: 60,
        expiresInSeconds: 300,
      });
      return;
    }

    const existing = db.resetTokens.find((t) => t.email === cleanEmail && !t.used);
    if (existing && existing.resendAvailableAt > now) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resendAvailableAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Please wait ${retryAfterSec}s before requesting another verification code.`,
        retryAfterSec,
      });
      return;
    }

    const otp = generateSixDigitOtp();
    const record: ResetTokenRecord = {
      id: `rst-${now}-${crypto.randomBytes(4).toString('hex')}`,
      userId: user.id,
      email: cleanEmail,
      otpHash: hashOtp(cleanEmail, otp),
      expiresAt: now + OTP_TTL_MS,
      resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      verified: false,
      resetSessionHash: null,
      resetSessionExpiresAt: null,
      used: false,
      createdAt: now,
    };

    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);
    db.resetTokens.push(record);
    saveDatabase(db);

    const emailSent = await sendResetCodeEmail(user.email, user.name, otp);
    if (!emailSent) {
      db.resetTokens = db.resetTokens.filter((t) => t.id !== record.id);
      saveDatabase(db);
      res.status(502).json({
        error: 'Unable to send verification email via Gmail SMTP. Please verify server mail credentials and try again.',
      });
      return;
    }

    pushLog(user.name, 'PASSWORD_RESET_OTP_SENT', 'Sent 6-digit password reset OTP via Gmail SMTP');
    saveDatabase(db);

    res.json({
      ok: true,
      message:
        'If an account with that email exists, a 6-digit verification code has been sent to your Gmail inbox.',
      cooldownSeconds: 60,
      expiresInSeconds: 300,
    });
  });

  app.post('/api/auth/verify-reset-otp', otpVerifyLimiter, (req: Request, res: Response) => {
    const { email, otp } = req.body as { email?: string; otp?: string };
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({ error: 'Please enter the 6-digit verification code sent to your email.' });
      return;
    }

    const now = Date.now();
    const user = db.users.find((u) => u.email === cleanEmail);
    const rec = db.resetTokens.find((t) => t.email === cleanEmail);

    if (
      !user ||
      !rec ||
      rec.userId !== user.id ||
      rec.used ||
      rec.verified ||
      !rec.otpHash ||
      rec.expiresAt <= now
    ) {
      res.status(400).json({ error: 'Verification code is invalid or has expired.' });
      return;
    }

    if (rec.attempts >= rec.maxAttempts) {
      rec.used = true;
      rec.otpHash = '';
      saveDatabase(db);
      res.status(429).json({
        error: 'Maximum verification attempts exceeded. Please request a new verification code.',
      });
      return;
    }

    const candidateHash = hashOtp(cleanEmail, cleanOtp);
    if (!verifyHashEqual(rec.otpHash, candidateHash)) {
      rec.attempts += 1;
      const remaining = Math.max(0, rec.maxAttempts - rec.attempts);
      if (remaining === 0) {
        rec.used = true;
        rec.otpHash = '';
        saveDatabase(db);
        res.status(429).json({
          error: 'Maximum verification attempts exceeded. Please request a new verification code.',
        });
        return;
      }
      saveDatabase(db);
      res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
      return;
    }

    const resetSessionToken = crypto.randomBytes(32).toString('hex');
    rec.verified = true;
    rec.otpHash = ''; // Invalidate OTP immediately upon verification so it can never be reused
    rec.resetSessionHash = hashResetSessionToken(resetSessionToken);
    rec.resetSessionExpiresAt = now + RESET_SESSION_TTL_MS;

    pushLog(user.name, 'PASSWORD_RESET_OTP_VERIFIED', 'Verified 6-digit email OTP for password reset');
    saveDatabase(db);

    res.json({
      ok: true,
      resetSessionToken,
      message: 'Verification code confirmed. You may now create your new password.',
    });
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    const { email, resetSessionToken, newPassword, confirmPassword } = req.body as {
      email?: string;
      resetSessionToken?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawSession = String(resetSessionToken || '').trim();

    if (!cleanEmail || !rawSession) {
      res.status(400).json({ error: 'Verified reset session is required. Please verify your OTP first.' });
      return;
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const strength = validatePasswordStrength(String(newPassword || ''));
    if (!strength.valid) {
      res.status(400).json({ error: strength.error || 'Password does not meet security requirements.' });
      return;
    }

    const now = Date.now();
    const user = db.users.find((u) => u.email === cleanEmail);
    const rec = db.resetTokens.find((t) => t.email === cleanEmail);

    if (
      !user ||
      !rec ||
      rec.userId !== user.id ||
      rec.used ||
      !rec.verified ||
      !rec.resetSessionHash ||
      !rec.resetSessionExpiresAt ||
      rec.resetSessionExpiresAt <= now ||
      !verifyHashEqual(rec.resetSessionHash, hashResetSessionToken(rawSession))
    ) {
      res.status(400).json({ error: 'Password reset session is invalid or has expired. Please restart the reset flow.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    rec.used = true;
    rec.otpHash = '';
    rec.resetSessionHash = null;
    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);

    pushLog(user.name, 'PASSWORD_RESET', 'Completed email OTP verified password reset');
    saveDatabase(db);

    res.json({ ok: true, message: 'Your password has been updated. You may now sign in.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
    const user = db.users.find((u) => u.id === req.authUser?.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user: sanitizeUser(user) });
  });

  app.put('/api/auth/profile', requireAuth, (req: AuthRequest, res: Response) => {
    const user = db.users.find((u) => u.id === req.authUser?.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const { name, company, title, phone } = req.body as {
      name?: string;
      company?: string;
      title?: string;
      phone?: string;
    };
    if (name && name.trim()) user.name = name.trim().slice(0, 80);
    if (company !== undefined) user.company = company.trim().slice(0, 80);
    if (title !== undefined) user.title = title.trim().slice(0, 80);
    if (phone !== undefined) user.phone = encryptPii(phone.trim().slice(0, 32));
    saveDatabase(db);
    res.json({ user: sanitizeUser(user), token: signToken(user) });
  });

  // GDPR Privacy & Consent Management
  app.put('/api/auth/privacy/consent', requireAuth, (req: AuthRequest, res: Response) => {
    const user = db.users.find((u) => u.id === req.authUser?.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const { gdprConsent, analyticsTelemetry, marketingEmails } = req.body as {
      gdprConsent?: boolean;
      analyticsTelemetry?: boolean;
      marketingEmails?: boolean;
    };
    if (typeof gdprConsent === 'boolean') user.gdprConsent = gdprConsent;
    if (typeof analyticsTelemetry === 'boolean') user.analyticsTelemetry = analyticsTelemetry;
    if (typeof marketingEmails === 'boolean') user.marketingEmails = marketingEmails;
    user.consentUpdatedAt = new Date().toISOString();
    pushLog(user.name, 'PRIVACY_CONSENT_UPDATED', 'Updated GDPR consent preferences');
    saveDatabase(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.get('/api/auth/privacy/export', requireAuth, (req: AuthRequest, res: Response) => {
    const user = db.users.find((u) => u.id === req.authUser?.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const uid = user.id;
    const payload = {
      exportedAt: new Date().toISOString(),
      regulation: 'GDPR Article 20 Data Portability Export',
      profile: sanitizeUser(user),
      registrations: db.registrations.filter((r) => r.userId === uid),
      registeredExpos: db.expos
        .filter((e) => e.registeredUserIds.includes(uid))
        .map((e) => ({ id: e.id, title: e.title, date: e.date, location: e.location })),
      bookmarkedSessions: db.sessions
        .filter((s) => s.bookmarkedUserIds.includes(uid))
        .map((s) => ({ id: s.id, title: s.title, startTime: s.startTime, location: s.location })),
      messagesSent: db.messages.filter((m) => m.senderId === uid),
      feedbackSubmitted: db.feedback.filter((f) => f.userId === uid),
    };
    pushLog(user.name, 'GDPR_DATA_EXPORTED', 'Downloaded personal data archive');
    saveDatabase(db);
    res.json(payload);
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthRequest, res: Response) => {
    const uid = req.authUser!.id;
    const user = db.users.find((u) => u.id === uid);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const cleanEmail = user.email;
    db.users = db.users.filter((u) => u.id !== uid);
    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);
    db.expos.forEach((e) => {
      e.registeredUserIds = e.registeredUserIds.filter((id) => id !== uid);
    });
    db.sessions.forEach((s) => {
      s.registeredUserIds = s.registeredUserIds.filter((id) => id !== uid);
      s.bookmarkedUserIds = s.bookmarkedUserIds.filter((id) => id !== uid);
    });
    db.registrations.forEach((r) => {
      if (r.userId === uid) {
        r.userName = 'Deleted User';
        r.userEmail = 'deleted@erased.local';
        r.status = 'cancelled';
      }
    });
    db.messages.forEach((m) => {
      if (m.senderId === uid) {
        m.senderName = 'Former Participant';
      }
    });
    db.feedback.forEach((f) => {
      if (f.userId === uid) {
        f.userName = 'Deleted User';
      }
    });
    pushLog('Privacy Officer', 'GDPR_ACCOUNT_ERASED', `Erased PII for user ${uid}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true, message: 'Account and personal data permanently erased.' });
  });

  // ADM-1: Create/Edit/Delete Expos
  app.post('/api/expos', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const { title, date, endDate, location, description, theme, category, status, capacity, bannerAccent } =
      req.body as {
        title?: string;
        date?: string;
        endDate?: string;
        location?: string;
        description?: string;
        theme?: string;
        category?: string;
        status?: ExpoStatus;
        capacity?: number;
        bannerAccent?: string;
      };
    if (!title || !date || !location) {
      res.status(400).json({ error: 'Title, date, and location are required.' });
      return;
    }
    const expo = {
      id: `expo-${Date.now()}`,
      title: title.trim(),
      date,
      endDate: endDate || date,
      location: location.trim(),
      description: (description || '').trim(),
      theme: (theme || 'Enterprise Tech').trim(),
      category: (category || 'Robotics & AI').trim(),
      status: (status || 'upcoming') as ExpoStatus,
      capacity: Number(capacity) || 800,
      bannerAccent: bannerAccent || '#10B981',
      registeredUserIds: [],
    };
    db.expos.unshift(expo);
    pushLog(req.authUser!.name, 'EXPO_CREATED', `Created expo "${expo.title}"`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(expo);
  });

  app.put('/api/expos/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const expo = db.expos.find((e) => e.id === req.params.id);
    if (!expo) {
      res.status(404).json({ error: 'Expo not found.' });
      return;
    }
    const { title, date, endDate, location, description, theme, category, status, capacity } =
      req.body as Partial<typeof expo>;
    if (title && title.trim()) expo.title = title.trim();
    if (date) expo.date = date;
    if (endDate) expo.endDate = endDate;
    if (location && location.trim()) expo.location = location.trim();
    if (description !== undefined) expo.description = description.trim();
    if (theme !== undefined) expo.theme = theme.trim();
    if (category !== undefined) expo.category = category.trim();
    if (status) expo.status = status;
    if (typeof capacity === 'number' && capacity > 0) expo.capacity = capacity;
    pushLog(req.authUser!.name, 'EXPO_UPDATED', `Updated expo "${expo.title}"`);
    pushNotification('all', 'Expo Details Updated', `${expo.title} (${expo.date} · ${expo.location})`, 'system');
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(expo);
  });

  app.delete('/api/expos/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    db.expos = db.expos.filter((e) => e.id !== req.params.id);
    pushLog(req.authUser!.name, 'EXPO_DELETED', `Deleted expo ${req.params.id}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true });
  });

  // ADM-2 & ADM-4: Booth Management & Assignment
  app.post('/api/booths', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const { expoId, number, zone, size, priceUsd } = req.body as {
      expoId?: string;
      number?: string;
      zone?: string;
      size?: '3x3m Standard' | '6x3m Corner' | '6x6m Island';
      priceUsd?: number;
    };
    if (!number || !number.trim()) {
      res.status(400).json({ error: 'Booth number is required.' });
      return;
    }
    const cleanNum = number.trim().toUpperCase().slice(0, 8);
    if (db.booths.some((b) => b.number.toUpperCase() === cleanNum)) {
      res.status(409).json({ error: `Booth ${cleanNum} already exists.` });
      return;
    }
    const idx = db.booths.length;
    const booth = {
      id: `booth-${cleanNum}-${Date.now().toString().slice(-4)}`,
      expoId: expoId || db.expos[0]?.id || 'expo-2026-global',
      number: cleanNum,
      zone: (zone || 'Central Atrium').trim(),
      size: size || '3x3m Standard',
      priceUsd: Number(priceUsd) || 2800,
      status: 'available' as BoothStatus,
      row: Math.floor(idx / 6) % 4,
      col: idx % 6,
      exhibitorId: null,
      exhibitorName: null,
      trafficCount: 0,
    };
    db.booths.push(booth);
    pushLog(req.authUser!.name, 'BOOTH_CREATED', `Created Booth ${booth.number} (${booth.zone})`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(booth);
  });

  app.put('/api/booths/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const booth = db.booths.find((b) => b.id === req.params.id);
    if (!booth) {
      res.status(404).json({ error: 'Booth not found.' });
      return;
    }
    const { size, priceUsd, status, exhibitorId, zone } = req.body as {
      size?: '3x3m Standard' | '6x3m Corner' | '6x6m Island';
      priceUsd?: number;
      status?: BoothStatus;
      exhibitorId?: string | null;
      zone?: string;
    };
    if (size) booth.size = size;
    if (zone && zone.trim()) booth.zone = zone.trim();
    if (typeof priceUsd === 'number' && priceUsd > 0) booth.priceUsd = priceUsd;
    if (status) booth.status = status;
    if (exhibitorId !== undefined) {
      if (exhibitorId) {
        const exh = db.exhibitors.find((e) => e.id === exhibitorId);
        booth.exhibitorId = exh ? exh.id : exhibitorId;
        booth.exhibitorName = exh ? exh.companyName : 'Assigned Exhibitor';
        if (booth.status === 'available' || booth.status === 'pending') booth.status = 'reserved';
      } else {
        booth.exhibitorId = null;
        booth.exhibitorName = null;
        if (booth.status === 'reserved' || booth.status === 'occupied') booth.status = 'available';
      }
    }
    pushLog(req.authUser!.name, 'BOOTH_UPDATED', `Updated Booth ${booth.number} (${booth.status})`);
    pushNotification('all', `Booth ${booth.number} Updated`, `Status is now ${booth.status}.`, 'booth');
    saveDatabase(db);
    io.emit('booth:updated', booth);
    io.emit('state:sync', getPublicSnapshot());
    res.json(booth);
  });

  app.delete('/api/booths/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const booth = db.booths.find((b) => b.id === req.params.id);
    if (!booth) {
      res.status(404).json({ error: 'Booth not found.' });
      return;
    }
    if (booth.status === 'reserved' || booth.status === 'occupied') {
      res.status(409).json({ error: 'Release reserved/occupied booth before deleting.' });
      return;
    }
    db.booths = db.booths.filter((b) => b.id !== req.params.id);
    pushLog(req.authUser!.name, 'BOOTH_DELETED', `Deleted Booth ${booth.number}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true });
  });

  // EXH-3: Atomic Booth Reservation
  app.post('/api/booths/:id/reserve', requireAuth, (req: AuthRequest, res: Response) => {
    const booth = db.booths.find((b) => b.id === req.params.id);
    if (!booth) {
      res.status(404).json({ error: 'Booth not found.' });
      return;
    }
    if (booth.status !== 'available') {
      res.status(409).json({ error: `Booth ${booth.number} is already ${booth.status}.` });
      return;
    }

    let exhibitor = db.exhibitors.find((e) => e.userId === req.authUser!.id);
    if (!exhibitor && req.authUser!.role === 'admin') {
      exhibitor = db.exhibitors[0];
    }
    if (req.authUser!.role === 'exhibitor' && exhibitor) {
      const appRec = db.applications.find((a) => a.exhibitorId === exhibitor!.id);
      if (appRec && appRec.status !== 'approved') {
        res.status(403).json({ error: 'Your exhibitor application must be approved before reserving a booth.' });
        return;
      }
    }

    booth.status = 'reserved';
    booth.exhibitorId = exhibitor ? exhibitor.id : req.authUser!.id;
    booth.exhibitorName = exhibitor ? exhibitor.companyName : req.authUser!.name;
    booth.trafficCount += 1;

    const latestDay = db.analyticsSeries[db.analyticsSeries.length - 1];
    if (latestDay) latestDay.boothTraffic += 12;

    pushLog(req.authUser!.name, 'BOOTH_RESERVED', `Reserved Booth ${booth.number} for ${booth.exhibitorName}`);
    pushNotification(
      'all',
      `Booth ${booth.number} Reserved`,
      `${booth.exhibitorName} has claimed Booth ${booth.number} in ${booth.zone}.`,
      'booth',
    );
    saveDatabase(db);
    io.emit('booth:updated', booth);
    io.emit('state:sync', getPublicSnapshot());
    res.json(booth);
  });

  app.post('/api/booths/:id/release', requireAuth, (req: AuthRequest, res: Response) => {
    const booth = db.booths.find((b) => b.id === req.params.id);
    if (!booth) {
      res.status(404).json({ error: 'Booth not found.' });
      return;
    }
    const exhibitor = db.exhibitors.find((e) => e.userId === req.authUser!.id);
    const ownsBooth =
      req.authUser!.role === 'admin' ||
      booth.exhibitorId === req.authUser!.id ||
      (exhibitor && booth.exhibitorId === exhibitor.id);
    if (!ownsBooth) {
      res.status(403).json({ error: 'Only the booth owner or organizer can release this booth.' });
      return;
    }
    booth.status = 'available';
    booth.exhibitorId = null;
    booth.exhibitorName = null;
    pushLog(req.authUser!.name, 'BOOTH_RELEASED', `Released Booth ${booth.number}`);
    saveDatabase(db);
    io.emit('booth:updated', booth);
    io.emit('state:sync', getPublicSnapshot());
    res.json(booth);
  });

  // ADM-3 & EXH-1: Exhibitor Applications
  app.post('/api/applications', requireAuth, requireRole('exhibitor', 'admin'), (req: AuthRequest, res: Response) => {
    const { expoId, companyName, category, productsSummary, documents } = req.body as {
      expoId?: string;
      companyName?: string;
      category?: ServerDatabase['exhibitors'][number]['category'];
      productsSummary?: string;
      documents?: string[];
    };
    if (!companyName || !productsSummary) {
      res.status(400).json({ error: 'Company name and products summary are required.' });
      return;
    }
    let exhibitor = db.exhibitors.find((e) => e.userId === req.authUser!.id);
    if (!exhibitor) {
      exhibitor = {
        id: `exh-${Date.now()}`,
        userId: req.authUser!.id,
        companyName: companyName.trim(),
        category: category || 'Robotics & AI',
        tagline: productsSummary.slice(0, 90),
        description: productsSummary,
        logoColor: '#10B981',
        contactEmail: req.authUser!.email,
        website: '',
        products: [],
        staff: [req.authUser!.name],
        documents: Array.isArray(documents) ? documents : [],
        profileViews: 1,
      };
      db.exhibitors.push(exhibitor);
    }
    const application = {
      id: `app-${Date.now()}`,
      expoId: expoId || db.expos[0]?.id || 'expo-2026-global',
      exhibitorId: exhibitor.id,
      companyName: companyName.trim(),
      category: category || exhibitor.category,
      productsSummary: productsSummary.trim(),
      documents: Array.isArray(documents) && documents.length > 0 ? documents : ['Company-Deck.pdf'],
      status: 'pending' as const,
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    db.applications.unshift(application);
    pushLog(req.authUser!.name, 'APPLICATION_SUBMITTED', `Applied for ${application.companyName}`);
    pushNotification('all', 'New Exhibitor Application', `${application.companyName} applied for an expo booth.`, 'application');
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(application);
  });

  app.put('/api/applications/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const appRec = db.applications.find((a) => a.id === req.params.id);
    if (!appRec) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    const { status, rejectionReason, reviewerNote } = req.body as {
      status?: 'approved' | 'rejected' | 'info_requested';
      rejectionReason?: string;
      reviewerNote?: string;
    };
    if (status !== 'approved' && status !== 'rejected' && status !== 'info_requested') {
      res.status(400).json({ error: 'Status must be approved, rejected, or info_requested.' });
      return;
    }
    appRec.status = status;
    appRec.rejectionReason = status === 'rejected' ? rejectionReason || 'Floor capacity constraints' : undefined;
    if (reviewerNote !== undefined) appRec.reviewerNote = reviewerNote.trim();
    pushLog(req.authUser!.name, `APPLICATION_${status.toUpperCase()}`, `${appRec.companyName} (${status})`);
    const exhOwner = db.exhibitors.find((e) => e.id === appRec.exhibitorId);
    const detailMsg =
      status === 'approved'
        ? 'Ready to select a booth on the live floor plan.'
        : status === 'info_requested'
          ? appRec.reviewerNote || 'Please provide updated compliance documents.'
          : appRec.rejectionReason || 'Floor capacity constraints';
    pushNotification(
      exhOwner?.userId || 'all',
      `Application ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Info Requested'}`,
      `${appRec.companyName}: ${detailMsg}`,
      'application',
    );
    if (exhOwner?.contactEmail) {
      void sendApplicationStatusEmail(exhOwner.contactEmail, appRec.companyName, status, detailMsg);
    }
    saveDatabase(db);
    io.emit('application:updated', appRec);
    io.emit('state:sync', getPublicSnapshot());
    res.json(appRec);
  });

  app.post('/api/applications/:id/request-info', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const appRec = db.applications.find((a) => a.id === req.params.id);
    if (!appRec) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    const { reviewerNote } = req.body as { reviewerNote?: string };
    appRec.status = 'info_requested';
    appRec.reviewerNote = (reviewerNote || 'Please upload updated safety certification and power draw spec.').trim();
    const exhOwner = db.exhibitors.find((e) => e.id === appRec.exhibitorId);
    pushNotification(
      exhOwner?.userId || 'all',
      'Application Info Requested',
      `${appRec.companyName}: ${appRec.reviewerNote}`,
      'application',
    );
    if (exhOwner?.contactEmail) {
      void sendApplicationStatusEmail(
        exhOwner.contactEmail,
        appRec.companyName,
        'info_requested',
        appRec.reviewerNote,
      );
    }
    pushLog(req.authUser!.name, 'APPLICATION_INFO_REQUESTED', `${appRec.companyName}: ${appRec.reviewerNote}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(appRec);
  });

  // EXH-2 & EXH-4: Exhibitor Profile
  app.put('/api/exhibitors/:id', requireAuth, requireRole('exhibitor', 'admin'), (req: AuthRequest, res: Response) => {
    const exh = db.exhibitors.find((e) => e.id === req.params.id);
    if (!exh) {
      res.status(404).json({ error: 'Exhibitor profile not found.' });
      return;
    }
    if (req.authUser!.role !== 'admin' && exh.userId !== req.authUser!.id) {
      res.status(403).json({ error: 'You can only update your own exhibitor profile.' });
      return;
    }
    const {
      companyName,
      category,
      tagline,
      description,
      products,
      staff,
      documents,
      website,
      contactEmail,
      phone,
      logoColor,
    } = req.body as Partial<typeof exh>;
    if (companyName && companyName.trim()) {
      exh.companyName = companyName.trim();
      db.booths.forEach((b) => {
        if (b.exhibitorId === exh.id) b.exhibitorName = exh.companyName;
      });
    }
    if (category) exh.category = category;
    if (tagline !== undefined) exh.tagline = tagline.trim();
    if (description !== undefined) exh.description = description.trim();
    if (website !== undefined) exh.website = website.trim();
    if (contactEmail !== undefined) exh.contactEmail = contactEmail.trim();
    if (phone !== undefined) exh.phone = encryptPii(phone.trim());
    if (logoColor && /^#[0-9a-fA-F]{6}$/.test(logoColor)) exh.logoColor = logoColor;
    if (Array.isArray(products)) exh.products = products.slice(0, 12);
    if (Array.isArray(staff)) exh.staff = staff.slice(0, 12);
    if (Array.isArray(documents)) exh.documents = documents.slice(0, 12);
    pushLog(req.authUser!.name, 'EXHIBITOR_UPDATED', `Updated profile for ${exh.companyName}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ...exh, phone: decryptPii(exh.phone) });
  });

  app.post('/api/exhibitors/:id/view', (req: Request, res: Response) => {
    const exh = db.exhibitors.find((e) => e.id === req.params.id);
    if (!exh) {
      res.status(404).json({ error: 'Exhibitor not found.' });
      return;
    }
    exh.profileViews += 1;
    const latestDay = db.analyticsSeries[db.analyticsSeries.length - 1];
    if (latestDay) latestDay.profileViews += 1;
    saveDatabase(db);
    res.json({ id: exh.id, profileViews: exh.profileViews });
  });

  // ADM-5 & ADM-6: Sessions & Real-time Schedule Broadcasts
  app.post('/api/sessions', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const { expoId, title, speaker, speakerRole, topic, startTime, endTime, location, capacity } = req.body as {
      expoId?: string;
      title?: string;
      speaker?: string;
      speakerRole?: string;
      topic?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      capacity?: number;
    };
    if (!title || !speaker || !startTime || !location) {
      res.status(400).json({ error: 'Title, speaker, startTime, and location are required.' });
      return;
    }
    const session = {
      id: `ses-${Date.now()}`,
      expoId: expoId || db.expos[0]?.id || 'expo-2026-global',
      title: title.trim(),
      speaker: speaker.trim(),
      speakerRole: (speakerRole || 'Guest Speaker').trim(),
      topic: (topic || 'Innovation').trim(),
      startTime,
      endTime: endTime || startTime,
      location: location.trim(),
      capacity: Number(capacity) || 150,
      registeredUserIds: [],
      bookmarkedUserIds: [],
      updatedAt: new Date().toISOString(),
    };
    db.sessions.push(session);
    pushLog(req.authUser!.name, 'SESSION_CREATED', `Added "${session.title}" at ${session.startTime}`);
    pushNotification('all', 'New Session Published', `${session.title} (${session.startTime} · ${session.location})`, 'schedule');
    saveDatabase(db);
    io.emit('schedule:updated', session);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(session);
  });

  app.put('/api/sessions/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const session = db.sessions.find((s) => s.id === req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    const { title, speaker, speakerRole, startTime, endTime, location, topic, capacity } =
      req.body as Partial<typeof session>;
    if (title) session.title = title.trim();
    if (speaker) session.speaker = speaker.trim();
    if (speakerRole) session.speakerRole = speakerRole.trim();
    if (startTime) session.startTime = startTime;
    if (endTime) session.endTime = endTime;
    if (location) session.location = location.trim();
    if (topic) session.topic = topic.trim();
    if (typeof capacity === 'number' && capacity > 0) session.capacity = capacity;
    session.updatedAt = new Date().toISOString();

    pushLog(req.authUser!.name, 'SESSION_UPDATED', `Moved/updated "${session.title}" -> ${session.startTime} @ ${session.location}`);
    pushNotification(
      'all',
      'Live Schedule Update',
      `"${session.title}" updated to ${session.startTime} at ${session.location}.`,
      'schedule',
    );
    saveDatabase(db);
    io.emit('schedule:updated', session);
    io.emit('state:sync', getPublicSnapshot());
    res.json(session);
  });

  app.delete('/api/sessions/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    db.sessions = db.sessions.filter((s) => s.id !== req.params.id);
    pushLog(req.authUser!.name, 'SESSION_DELETED', `Removed session ${req.params.id}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true });
  });

  // Speakers CRUD (Admin)
  app.post('/api/speakers', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const { expoId, name, role, company, topic, bio } = req.body as {
      expoId?: string;
      name?: string;
      role?: string;
      company?: string;
      topic?: string;
      bio?: string;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Speaker name is required.' });
      return;
    }
    const speaker = {
      id: `spk-${Date.now()}`,
      expoId: expoId || db.expos[0]?.id || 'expo-2026-global',
      name: name.trim(),
      role: (role || 'Keynote Speaker').trim(),
      company: (company || 'Industry Partner').trim(),
      topic: (topic || 'Innovation').trim(),
      bio: (bio || '').trim(),
    };
    db.speakers.push(speaker);
    pushLog(req.authUser!.name, 'SPEAKER_CREATED', `Added speaker ${speaker.name}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(speaker);
  });

  app.put('/api/speakers/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const spk = db.speakers.find((s) => s.id === req.params.id);
    if (!spk) {
      res.status(404).json({ error: 'Speaker not found.' });
      return;
    }
    const { name, role, company, topic, bio } = req.body as Partial<typeof spk>;
    if (name && name.trim()) spk.name = name.trim();
    if (role !== undefined) spk.role = role.trim();
    if (company !== undefined) spk.company = company.trim();
    if (topic !== undefined) spk.topic = topic.trim();
    if (bio !== undefined) spk.bio = bio.trim();
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(spk);
  });

  app.delete('/api/speakers/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    db.speakers = db.speakers.filter((s) => s.id !== req.params.id);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true });
  });

  // Admin Attendee Directory & Reliability/Monitoring Endpoints
  app.get('/api/admin/attendees', requireAuth, requireRole('admin'), (_req: AuthRequest, res: Response) => {
    const attendees = db.users
      .filter((u) => u.role === 'attendee')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        company: u.company,
        title: u.title,
        phone: decryptPii(u.phone),
        createdAt: u.createdAt,
        registeredExpoIds: db.expos.filter((e) => e.registeredUserIds.includes(u.id)).map((e) => e.id),
        bookmarkedSessionCount: db.sessions.filter((s) => s.bookmarkedUserIds.includes(u.id)).length,
      }));
    res.json({ attendees });
  });

  app.get('/api/admin/monitoring', requireAuth, requireRole('admin'), (_req: AuthRequest, res: Response) => {
    const backups = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort().reverse()
      : [];
    res.json({
      service: 'eventsphere',
      encryptionAtRest: 'aes-256-gcm',
      concurrentUsers: Math.max(1, concurrentUsers),
      database: getMongoStoreStatus(),
      smtp: getMailerStatus(),
      backupFiles: backups,
      ...monitor.getSummary(),
    });
  });

  app.post('/api/admin/backup', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `eventsphere-manual-${stamp}.json`;
    fs.writeFileSync(path.join(BACKUPS_DIR, filename), JSON.stringify(db, null, 2), 'utf8');
    await queueSyncDatabaseToMongo(db);
    pushLog(req.authUser!.name, 'BACKUP_CREATED', `Triggered snapshot backup ${filename}`);
    saveDatabase(db);
    res.status(201).json({ ok: true, filename, createdAt: new Date().toISOString() });
  });

  // ATT-2 & ATT-5: Expo/Session Registration, Ticket Generation & Bookmarks
  app.post('/api/expos/:id/register', requireAuth, (req: AuthRequest, res: Response) => {
    const expo = db.expos.find((e) => e.id === req.params.id);
    if (!expo) {
      res.status(404).json({ error: 'Expo not found.' });
      return;
    }
    const uid = req.authUser!.id;
    if (!expo.registeredUserIds.includes(uid)) {
      expo.registeredUserIds.push(uid);
    }
    let reg = db.registrations.find((r) => r.expoId === expo.id && r.userId === uid);
    if (!reg) {
      reg = {
        id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        expoId: expo.id,
        userId: uid,
        userName: req.authUser!.name,
        userEmail: req.authUser!.email,
        ticketCode: `ES-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
        status: 'confirmed',
        registeredAt: new Date().toISOString().slice(0, 10),
      };
      db.registrations.unshift(reg);
    } else {
      reg.status = 'confirmed';
    }
    pushLog(req.authUser!.name, 'EXPO_REGISTERED', `Registered for ${expo.title} (${reg.ticketCode})`);
    pushNotification(uid, 'Ticket Confirmed', `Pass ${reg.ticketCode} is active for ${expo.title}.`, 'system');
    void sendTicketConfirmationEmail(
      req.authUser!.email,
      req.authUser!.name,
      expo.title,
      expo.date,
      expo.location,
      reg.ticketCode,
    );
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ expo, registration: reg });
  });

  app.delete('/api/expos/:id/register', requireAuth, (req: AuthRequest, res: Response) => {
    const expo = db.expos.find((e) => e.id === req.params.id);
    if (!expo) {
      res.status(404).json({ error: 'Expo not found.' });
      return;
    }
    const uid = req.authUser!.id;
    expo.registeredUserIds = expo.registeredUserIds.filter((id) => id !== uid);
    const reg = db.registrations.find((r) => r.expoId === expo.id && r.userId === uid);
    if (reg) reg.status = 'cancelled';
    pushLog(req.authUser!.name, 'EXPO_CANCELLED', `Cancelled ticket for ${expo.title}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true, expo });
  });

  app.post('/api/sessions/:id/register', requireAuth, (req: AuthRequest, res: Response) => {
    const session = db.sessions.find((s) => s.id === req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    const uid = req.authUser!.id;
    const idx = session.registeredUserIds.indexOf(uid);
    if (idx === -1) {
      session.registeredUserIds.push(uid);
      pushLog(req.authUser!.name, 'SESSION_REGISTERED', `Registered for "${session.title}"`);
    } else {
      session.registeredUserIds.splice(idx, 1);
    }
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(session);
  });

  app.post('/api/sessions/:id/bookmark', requireAuth, (req: AuthRequest, res: Response) => {
    const session = db.sessions.find((s) => s.id === req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    const uid = req.authUser!.id;
    const idx = session.bookmarkedUserIds.indexOf(uid);
    if (idx === -1) {
      session.bookmarkedUserIds.push(uid);
      const latestDay = db.analyticsSeries[db.analyticsSeries.length - 1];
      if (latestDay) latestDay.sessionBookmarks += 1;
      pushNotification(
        uid,
        'Session Reminder Scheduled',
        `We will remind you 15 minutes before "${session.title}" (${session.startTime} at ${session.location}).`,
        'reminder',
      );
    } else {
      session.bookmarkedUserIds.splice(idx, 1);
    }
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(session);
  });

  // EXH-5 & ATT-6: Live Chat
  app.post('/api/messages', requireAuth, (req: AuthRequest, res: Response) => {
    const { recipientChannel, recipientLabel, body } = req.body as {
      recipientChannel?: string;
      recipientLabel?: string;
      body?: string;
    };
    if (!body || !body.trim()) {
      res.status(400).json({ error: 'Message body cannot be empty.' });
      return;
    }
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: req.authUser!.id,
      senderName: req.authUser!.name,
      senderRole: req.authUser!.role,
      recipientChannel: (recipientChannel || 'organizer').slice(0, 64),
      recipientLabel: (recipientLabel || 'Organizer Desk').slice(0, 80),
      body: body.trim().slice(0, 800),
      createdAt: new Date().toISOString(),
    };
    db.messages.push(msg);
    db.messages = db.messages.slice(-150);
    saveDatabase(db);
    io.emit('chat:message', msg);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(msg);
  });

  // SYS-2: Feedback & Support
  app.post('/api/feedback', (req: Request, res: Response) => {
    const viewer = decodeOptionalAuth(req);
    const { userName, category, message } = req.body as {
      userName?: string;
      category?: 'Suggestion' | 'Technical Issue' | 'Booth Inquiry';
      message?: string;
    };
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Please provide feedback details.' });
      return;
    }
    const entry = {
      id: `fb-${Date.now()}`,
      userId: viewer?.id || 'guest',
      userName: (userName || viewer?.name || 'Expo Visitor').trim().slice(0, 64),
      category: category || 'Suggestion',
      message: message.trim().slice(0, 1000),
      createdAt: new Date().toISOString(),
      status: 'open' as const,
    };
    db.feedback.unshift(entry);
    pushLog(entry.userName, 'FEEDBACK_SUBMITTED', `${entry.category}: ${entry.message.slice(0, 60)}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.status(201).json(entry);
  });

  app.put('/api/feedback/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const entry = db.feedback.find((f) => f.id === req.params.id);
    if (!entry) {
      res.status(404).json({ error: 'Feedback entry not found.' });
      return;
    }
    const { status } = req.body as { status?: 'open' | 'resolved' };
    entry.status = status === 'open' ? 'open' : 'resolved';
    pushLog(req.authUser!.name, 'FEEDBACK_STATUS', `Marked feedback ${entry.id} as ${entry.status}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(entry);
  });

  app.post('/api/notifications/read', requireAuth, (req: AuthRequest, res: Response) => {
    const uid = req.authUser!.id;
    db.notifications.forEach((n) => {
      if (!n.readBy.includes(uid)) n.readBy.push(uid);
    });
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json({ ok: true });
  });

  // Cross-Device Cloud Sync Backup Vault
  app.get('/api/sync/:syncKey', async (req: Request, res: Response) => {
    const syncKey = String(req.params.syncKey || '').toUpperCase().trim();
    if (!SYNC_KEY_REGEX.test(syncKey)) {
      res.status(400).json({ error: 'Invalid sync key format.' });
      return;
    }
    const mongoRecord = await getSyncRecordFromMongo(syncKey);
    if (mongoRecord) {
      res.json(mongoRecord);
      return;
    }
    const vault = loadVault();
    const record = vault[syncKey];
    if (!record) {
      res.status(404).json({ error: 'No cloud backup found for this sync key.' });
      return;
    }
    res.json(record);
  });

  app.put('/api/sync/:syncKey', async (req: Request, res: Response) => {
    const syncKey = String(req.params.syncKey || '').toUpperCase().trim();
    if (!SYNC_KEY_REGEX.test(syncKey)) {
      res.status(400).json({ error: 'Invalid sync key format.' });
      return;
    }
    const body = req.body as Partial<SyncRecord>;
    if (!body || !body.payload || typeof body.payload !== 'object') {
      res.status(400).json({ error: 'Missing sync payload.' });
      return;
    }
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(body.payload))
      .digest('hex')
      .slice(0, 16);
    const updatedAt = new Date().toISOString();
    const record: SyncRecord = {
      syncKey,
      updatedAt,
      deviceLabel: typeof body.deviceLabel === 'string' ? body.deviceLabel.slice(0, 64) : 'Web Client',
      checksum,
      payload: body.payload,
    };
    const vault = loadVault();
    vault[syncKey] = record;
    saveVault(vault);
    await upsertSyncRecordToMongo(record);
    res.json({ ok: true, syncKey, updatedAt, checksum });
  });

  // EventSphere Gemini AI Concierge (Text + Voice)
  type AssistantPersona = 'concierge' | 'exhibitor' | 'organizer';
  const VALID_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);

  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  const buildEventSphereSystemInstruction = (
    persona: AssistantPersona,
    viewer: AuthUserClaims | undefined,
    activeView?: string,
    selectedBoothId?: string | null,
    voiceMode?: boolean,
  ): string => {
    const availableBooths = db.booths.filter((b) => b.status === 'available');
    const reservedBooths = db.booths.filter((b) => b.status === 'reserved' || b.status === 'occupied');
    const pendingBooths = db.booths.filter((b) => b.status === 'pending');

    const expoSummary = db.expos
      .map(
        (e) =>
          `- ${e.title} (${e.status.toUpperCase()}) | ${e.date} to ${e.endDate} | ${e.location} | Category: ${e.category} | Registered: ${e.registeredUserIds.length}/${e.capacity || 800}`,
      )
      .join('\n');

    const boothSummary = db.booths
      .map(
        (b) =>
          `- Booth ${b.number} (${b.id}): ${b.status.toUpperCase()} | Zone: ${b.zone} | Size: ${b.size} | $${b.priceUsd}${b.exhibitorName ? ` | Exhibitor: ${b.exhibitorName}` : ''}`,
      )
      .join('\n');

    const exhibitorSummary = db.exhibitors
      .map(
        (ex) =>
          `- ${ex.companyName} (${ex.category}): ${ex.tagline}. Products: ${ex.products.join(', ')}. Staff: ${ex.staff.join(', ')}.`,
      )
      .join('\n');

    const sessionSummary = db.sessions
      .map(
        (s) =>
          `- ${s.startTime}-${s.endTime}: "${s.title}" by ${s.speaker} (${s.speakerRole}) @ ${s.location} | Topic: ${s.topic} | Seats: ${s.registeredUserIds.length}/${s.capacity}`,
      )
      .join('\n');

    const selectedBooth = selectedBoothId ? db.booths.find((b) => b.id === selectedBoothId) : null;

    const personaDirective =
      persona === 'exhibitor'
        ? 'You are the EventSphere Exhibitor Advisor. Specialize in helping companies pick the ideal booth size (3x3m Standard $2,800, 6x3m Corner $4,200, 6x6m Island $6,800), compare floor zones, explain the application/approval flow, and reserve open booths.'
        : persona === 'organizer'
          ? 'You are the EventSphere Operations Guide. Specialize in expo management, booth allocation, schedule broadcasts, exhibitor application approvals, live analytics, and GDPR/JWT/Socket.io platform architecture.'
          : 'You are the EventSphere Floor Concierge. Specialize in helping attendees and visitors discover expos, locate exhibitors and booths on the 3D floor, plan keynote schedules, get digital QR passes, and navigate the 3D hall.';

    return `${personaDirective}

Website Context & Live Floor State:
- Platform: EventSphere Management — interactive 3D expo floor plan, real-time Socket.io booth reservations, exhibitor showcase directory, session timetable, and organizer analytics.
- Navigation Views: "Home" (Scroll Tour over 3D Expo Sphere), "Explore Expos", "3D Floor" (interactive OrbitControls + Zoom + Zone Borders), "Exhibitors", "Schedule", "Analytics", and Role Portals (Attendee Hub, Exhibitor Portal, Organizer Command Center).
- Current User: ${viewer ? `${viewer.name} (${viewer.role}, ${viewer.email})` : 'Guest Visitor (not signed in)'}
- Current Page View: ${activeView || 'voyage'}
${selectedBooth ? `- Currently Selected Booth: Booth ${selectedBooth.number} (${selectedBooth.status}, ${selectedBooth.zone}, ${selectedBooth.size}, $${selectedBooth.priceUsd}${selectedBooth.exhibitorName ? `, ${selectedBooth.exhibitorName}` : ''})` : ''}

Live Expos (${db.expos.length}):
${expoSummary}

Live Booth Floor Summary (${availableBooths.length} available, ${reservedBooths.length} reserved/occupied, ${pendingBooths.length} pending out of ${db.booths.length} total):
${boothSummary}

Verified Exhibitors (${db.exhibitors.length}):
${exhibitorSummary}

Keynote & Technical Sessions (${db.sessions.length}):
${sessionSummary}

Response Guidelines:
- Answer strictly using accurate live EventSphere website data above. Never invent fake booths, fake prices, or fake sessions.
- Mention exact booth codes like "Booth A2" or "Booth B1" when relevant so the UI can link directly to them on the 3D floor.
- ${voiceMode ? 'Voice Mode is active: keep responses concise (2–4 natural spoken sentences), clear, and easy to listen to without heavy markdown symbols.' : 'Keep responses crisp, well-structured, and actionable.'}`;
  };

  const formatGeminiError = (err: unknown): { status: number; message: string } => {
    const raw = err instanceof Error ? err.message : String(err || 'Gemini request failed');
    const lower = raw.toLowerCase();
    if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('api key')) {
      return {
        status: 400,
        message: 'Gemini API key is missing or invalid. Please check GEMINI_API_KEY in Settings > Secrets.',
      };
    }
    if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
      return {
        status: 429,
        message: 'Gemini quota limit reached. Please retry shortly or check your API key tier in Settings > Secrets.',
      };
    }
    if (lower.includes('not_found') || lower.includes('404')) {
      return {
        status: 404,
        message: `Requested Gemini model unavailable: ${raw}`,
      };
    }
    return { status: 500, message: raw };
  };

  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Settings > Secrets to enable the EventSphere AI assistant.',
      });
      return;
    }

    const viewer = decodeOptionalAuth(req);
    const { messages, persona, fastMode, activeView, selectedBoothId, voiceMode } = req.body as {
      messages?: Array<{ role: 'user' | 'model'; text: string }>;
      persona?: AssistantPersona;
      fastMode?: boolean;
      activeView?: string;
      selectedBoothId?: string | null;
      voiceMode?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Conversation messages array is required.' });
      return;
    }

    const sanitized = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
      .slice(-20);

    const latest = sanitized[sanitized.length - 1];
    if (!latest || latest.role !== 'user') {
      res.status(400).json({ error: 'Last message must be from the user.' });
      return;
    }

    const history = sanitized.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text.trim() }],
    }));

    const selectedPersona: AssistantPersona =
      persona === 'exhibitor' || persona === 'organizer' ? persona : 'concierge';
    const model = fastMode ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
    const systemInstruction = buildEventSphereSystemInstruction(
      selectedPersona,
      viewer,
      activeView,
      selectedBoothId,
      voiceMode,
    );

    try {
      const chat = ai.chats.create({
        model,
        config: { systemInstruction },
        history,
      });
      const response = await chat.sendMessage({ message: latest.text.trim() });
      const replyText = (response.text || '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'Assistant returned an empty response.' });
        return;
      }

      const mentionedBoothIds = db.booths
        .filter((b) => new RegExp(`\\b(?:booth\\s+)?${b.number}\\b`, 'i').test(replyText))
        .map((b) => b.id);

      res.json({
        reply: replyText,
        model,
        mentionedBoothIds: Array.from(new Set(mentionedBoothIds)).slice(0, 6),
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/assistant/transcribe', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Settings > Secrets to use voice input.',
      });
      return;
    }

    const { audioBase64, mimeType } = req.body as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ error: 'audioBase64 payload is required.' });
      return;
    }

    const safeMime = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe the spoken user question about the EventSphere expo accurately. Return only the spoken words.',
            },
          ],
        },
      });
      const text = (response.text || '').trim();
      if (!text) {
        res.status(422).json({ error: 'Could not detect clear speech in the audio clip. Please try again.' });
        return;
      }
      res.json({ text });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  app.post('/api/assistant/tts', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Settings > Secrets to enable voice replies.',
      });
      return;
    }

    const { text, voiceName } = req.body as {
      text?: string;
      voiceName?: string;
    };

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Text is required for speech synthesis.' });
      return;
    }

    const cleanSpokenText = text
      .replace(/\[BOOTH:([A-Z0-9]+)\]/gi, 'Booth $1')
      .replace(/[*_`#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);

    const chosenVoice = voiceName && VALID_VOICES.has(voiceName) ? voiceName : 'Kore';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanSpokenText,
                speechMetadata: {
                  style: 'Clear, friendly, concise exhibition concierge',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const audioBase64 = inlineData?.data;
      if (!audioBase64) {
        res.status(502).json({ error: 'Voice synthesizer did not return audio data.' });
        return;
      }

      res.json({
        audioBase64,
        mimeType: inlineData?.mimeType || 'audio/wav',
      });
    } catch (err) {
      const parsed = formatGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const dbStatus = getMongoStoreStatus();
    const smtpStatus = getMailerStatus();
    console.log(
      `EventSphere Management server + Socket.io listening on http://0.0.0.0:${PORT} | DB=${dbStatus.mode}${dbStatus.database ? ` (${dbStatus.database})` : ''} | SMTP=${smtpStatus.configured ? 'ready' : 'inactive'}`,
    );
  });

  const gracefulShutdown = async () => {
    await closeMongoStore();
    httpServer.close(() => process.exit(0));
  };
  process.once('SIGTERM', () => void gracefulShutdown());
  process.once('SIGINT', () => void gracefulShutdown());
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
