import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

type UserRole = 'admin' | 'exhibitor' | 'attendee';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  company?: string;
  title?: string;
  gdprConsent: boolean;
  createdAt: string;
}

interface ResetTokenRecord {
  email: string;
  token: string;
  expiresAt: number;
}

interface SyncRecord {
  syncKey: string;
  updatedAt: string;
  deviceLabel: string;
  checksum: string;
  payload: Record<string, unknown>;
}

interface ServerDatabase {
  users: StoredUser[];
  resetTokens: ResetTokenRecord[];
  expos: Array<{
    id: string;
    title: string;
    date: string;
    endDate: string;
    location: string;
    description: string;
    theme: string;
    bannerAccent: string;
    registeredUserIds: string[];
  }>;
  booths: Array<{
    id: string;
    expoId: string;
    number: string;
    zone: string;
    size: '3x3m Standard' | '6x3m Corner' | '6x6m Island';
    priceUsd: number;
    status: 'available' | 'reserved' | 'pending';
    row: number;
    col: number;
    exhibitorId: string | null;
    exhibitorName: string | null;
    trafficCount: number;
  }>;
  exhibitors: Array<{
    id: string;
    userId: string;
    companyName: string;
    category: 'Robotics & AI' | 'Clean Energy' | 'Cloud & Security' | 'Spatial Computing' | 'Biotech & MedTech';
    tagline: string;
    description: string;
    logoColor: string;
    contactEmail: string;
    website: string;
    products: string[];
    staff: string[];
    profileViews: number;
  }>;
  applications: Array<{
    id: string;
    expoId: string;
    exhibitorId: string;
    companyName: string;
    category: 'Robotics & AI' | 'Clean Energy' | 'Cloud & Security' | 'Spatial Computing' | 'Biotech & MedTech';
    productsSummary: string;
    documents: string[];
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    submittedAt: string;
  }>;
  sessions: Array<{
    id: string;
    expoId: string;
    title: string;
    speaker: string;
    speakerRole: string;
    topic: string;
    startTime: string;
    endTime: string;
    location: string;
    capacity: number;
    registeredUserIds: string[];
    bookmarkedUserIds: string[];
    updatedAt: string;
  }>;
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    recipientChannel: string;
    recipientLabel: string;
    body: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    targetUserId: string;
    title: string;
    message: string;
    kind: 'schedule' | 'booth' | 'application' | 'reminder' | 'system';
    readBy: string[];
    createdAt: string;
  }>;
  feedback: Array<{
    id: string;
    userId: string;
    userName: string;
    category: 'Suggestion' | 'Technical Issue' | 'Booth Inquiry';
    message: string;
    createdAt: string;
    status: 'open' | 'resolved';
  }>;
  activityLogs: Array<{
    id: string;
    actor: string;
    action: string;
    detail: string;
    timestamp: string;
  }>;
  analyticsSeries: Array<{
    date: string;
    boothTraffic: number;
    sessionBookmarks: number;
    profileViews: number;
  }>;
}

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'eventsphere-dev-jwt-secret-change-in-prod';
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
      logoColor: '#7B5CFF',
      contactEmail: 'exhibitor@lumina-robotics.io',
      website: 'https://lumina-robotics.example',
      products: ['Lumina Arm M4', 'FleetOS Edge Router', 'VisionPick Sensor Kit'],
      staff: ['Marcus Chen', 'Priya Nair', 'Liam Brooks'],
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
      logoColor: '#4FE3C1',
      contactEmail: 'exhibitor@aethergrid.io',
      website: 'https://aethergrid.example',
      products: ['AetherCell 500kWh', 'GridPulse Telemetry', 'SolarSync Inverter'],
      staff: ['Sora Takahashi', 'Devon Cole'],
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
      logoColor: '#FF6B57',
      contactEmail: 'hello@sentinelmesh.example',
      website: 'https://sentinelmesh.example',
      products: ['MeshGate HSM', 'ZeroTrust CLI', 'AuditStream'],
      staff: ['Aria Novak', 'Julian Cruz'],
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
      website: 'https://prismspatial.example',
      products: ['Prism Twin Studio', 'HoloLink SDK'],
      staff: ['Noah Lindqvist', 'Chloe Park'],
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
      website: 'https://helixbio.example',
      products: ['HelixCartridge Pro', 'BioVault Sync'],
      staff: ['Dr. Amara Osei', 'Kenji Sato'],
      profileViews: 162,
    },
  ];

  // Generate 24 booths across 4 rows x 6 columns
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
      const status: 'available' | 'reserved' | 'pending' = assigned
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
      bannerAccent: '#7B5CFF',
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
      bannerAccent: '#4FE3C1',
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
    sessions,
    messages,
    notifications,
    feedback,
    activityLogs,
    analyticsSeries,
  };
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
    return parsed;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

function saveDatabase(db: ServerDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
  createAutomatedBackup(db);
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

interface AuthRequest extends Request {
  authUser?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
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
    gdprConsent: user.gdprConsent,
    createdAt: user.createdAt,
  };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json({ limit: '512kb' }));

  const serverStartedAt = Date.now();
  let totalApiRequests = 0;
  let totalApiLatencyMs = 0;
  let totalApiErrors = 0;

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const t0 = performance.now();
    totalApiRequests += 1;
    res.on('finish', () => {
      totalApiLatencyMs += performance.now() - t0;
      if (res.statusCode >= 500) totalApiErrors += 1;
    });
    next();
  });

  let db = loadDatabase();
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
    io.emit('notification:new', item);
  };

  const getPublicSnapshot = () => ({
    expos: db.expos,
    booths: db.booths,
    exhibitors: db.exhibitors,
    applications: db.applications,
    sessions: db.sessions,
    messages: db.messages,
    notifications: db.notifications,
    feedback: db.feedback,
    activityLogs: db.activityLogs,
    analyticsSeries: db.analyticsSeries,
    concurrentUsers: Math.max(1, concurrentUsers),
  });

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
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
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
    res.json({ ok: true, service: 'eventsphere', concurrentUsers, timestamp: new Date().toISOString() });
  });

  app.get('/api/metrics', (_req: Request, res: Response) => {
    const backupFiles = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).length
      : 0;
    res.json({
      uptimeSeconds: Math.round((Date.now() - serverStartedAt) / 1000),
      totalApiRequests,
      avgLatencyMs: totalApiRequests > 0 ? Number((totalApiLatencyMs / totalApiRequests).toFixed(2)) : 0,
      totalApiErrors,
      concurrentUsers: Math.max(1, concurrentUsers),
      backupCount: backupFiles,
    });
  });

  app.get('/api/state', (_req: Request, res: Response) => {
    res.json(getPublicSnapshot());
  });

  // AUTH-1..6
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, password, role, company, gdprConsent } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      company?: string;
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
    const cleanEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const assignedRole: UserRole = role === 'exhibitor' ? 'exhibitor' : 'attendee';
    const user: StoredUser = {
      id: `usr-${Date.now()}`,
      name: name.trim().slice(0, 80),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role: assignedRole,
      company: company?.trim().slice(0, 80),
      gdprConsent: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);

    if (assignedRole === 'exhibitor') {
      db.exhibitors.push({
        id: `exh-${Date.now()}`,
        userId: user.id,
        companyName: user.company || `${user.name} Co.`,
        category: 'Robotics & AI',
        tagline: 'New EventSphere Exhibitor Partner',
        description: 'Exhibitor profile awaiting booth setup.',
        logoColor: '#FF6B57',
        contactEmail: user.email,
        website: '',
        products: [],
        staff: [user.name],
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

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = db.users.find((u) => u.email === cleanEmail);
    if (!user) {
      res.json({ ok: true, message: 'If that account exists, a one-time reset link was issued.' });
      return;
    }
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);
    db.resetTokens.push({ email: cleanEmail, token, expiresAt: Date.now() + 15 * 60 * 1000 });
    saveDatabase(db);
    res.json({
      ok: true,
      message: `One-time reset code issued (expires in 15m): ${token}`,
      demoResetCode: token,
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body as {
      email?: string;
      token?: string;
      newPassword?: string;
    };
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Reset code and new password (min 6 chars) required.' });
      return;
    }
    const rec = db.resetTokens.find(
      (t) => t.email === cleanEmail && t.token === token.trim().toUpperCase() && t.expiresAt > Date.now(),
    );
    if (!rec) {
      res.status(400).json({ error: 'Reset code is invalid or expired.' });
      return;
    }
    const user = db.users.find((u) => u.email === cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    db.resetTokens = db.resetTokens.filter((t) => t.email !== cleanEmail);
    pushLog(user.name, 'PASSWORD_RESET', 'Completed one-time password reset');
    saveDatabase(db);
    res.json({ ok: true, message: 'Password updated. You may now sign in.' });
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
    const { name, company, title } = req.body as { name?: string; company?: string; title?: string };
    if (name && name.trim()) user.name = name.trim().slice(0, 80);
    if (company !== undefined) user.company = company.trim().slice(0, 80);
    if (title !== undefined) user.title = title.trim().slice(0, 80);
    saveDatabase(db);
    res.json({ user: sanitizeUser(user), token: signToken(user) });
  });

  // ADM-1: Create/Edit/Delete Expos
  app.post('/api/expos', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const { title, date, endDate, location, description, theme, bannerAccent } = req.body as {
      title?: string;
      date?: string;
      endDate?: string;
      location?: string;
      description?: string;
      theme?: string;
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
      bannerAccent: bannerAccent || '#7B5CFF',
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
    const { title, date, endDate, location, description, theme } = req.body as Partial<typeof expo>;
    if (title && title.trim()) expo.title = title.trim();
    if (date) expo.date = date;
    if (endDate) expo.endDate = endDate;
    if (location && location.trim()) expo.location = location.trim();
    if (description !== undefined) expo.description = description.trim();
    if (theme !== undefined) expo.theme = theme.trim();
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
  app.put('/api/booths/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response) => {
    const booth = db.booths.find((b) => b.id === req.params.id);
    if (!booth) {
      res.status(404).json({ error: 'Booth not found.' });
      return;
    }
    const { size, priceUsd, status, exhibitorId } = req.body as {
      size?: '3x3m Standard' | '6x3m Corner' | '6x6m Island';
      priceUsd?: number;
      status?: 'available' | 'reserved' | 'pending';
      exhibitorId?: string | null;
    };
    if (size) booth.size = size;
    if (typeof priceUsd === 'number' && priceUsd > 0) booth.priceUsd = priceUsd;
    if (status) booth.status = status;
    if (exhibitorId !== undefined) {
      if (exhibitorId) {
        const exh = db.exhibitors.find((e) => e.id === exhibitorId);
        booth.exhibitorId = exh ? exh.id : exhibitorId;
        booth.exhibitorName = exh ? exh.companyName : 'Assigned Exhibitor';
        booth.status = 'reserved';
      } else {
        booth.exhibitorId = null;
        booth.exhibitorName = null;
        if (booth.status === 'reserved') booth.status = 'available';
      }
    }
    pushLog(req.authUser!.name, 'BOOTH_UPDATED', `Updated Booth ${booth.number} (${booth.status})`);
    pushNotification('all', `Booth ${booth.number} Updated`, `Status is now ${booth.status}.`, 'booth');
    saveDatabase(db);
    io.emit('booth:updated', booth);
    io.emit('state:sync', getPublicSnapshot());
    res.json(booth);
  });

  // EXH-3: Atomic Booth Reservation (prevents double booking)
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
        logoColor: '#7B5CFF',
        contactEmail: req.authUser!.email,
        website: '',
        products: [],
        staff: [req.authUser!.name],
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
    const { status, rejectionReason } = req.body as { status?: 'approved' | 'rejected'; rejectionReason?: string };
    if (status !== 'approved' && status !== 'rejected') {
      res.status(400).json({ error: 'Status must be approved or rejected.' });
      return;
    }
    appRec.status = status;
    appRec.rejectionReason = status === 'rejected' ? rejectionReason || 'Floor capacity constraints' : undefined;
    pushLog(req.authUser!.name, `APPLICATION_${status.toUpperCase()}`, `${appRec.companyName} (${status})`);
    pushNotification(
      'all',
      `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      `${appRec.companyName}: ${status === 'approved' ? 'Ready to select a booth on the live floor plan.' : appRec.rejectionReason}`,
      'application',
    );
    saveDatabase(db);
    io.emit('application:updated', appRec);
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
    const { companyName, tagline, description, products, staff, website, contactEmail, logoColor } =
      req.body as Partial<typeof exh>;
    if (companyName && companyName.trim()) {
      exh.companyName = companyName.trim();
      db.booths.forEach((b) => {
        if (b.exhibitorId === exh.id) b.exhibitorName = exh.companyName;
      });
    }
    if (tagline !== undefined) exh.tagline = tagline.trim();
    if (description !== undefined) exh.description = description.trim();
    if (website !== undefined) exh.website = website.trim();
    if (contactEmail !== undefined) exh.contactEmail = contactEmail.trim();
    if (logoColor && /^#[0-9a-fA-F]{6}$/.test(logoColor)) exh.logoColor = logoColor;
    if (Array.isArray(products)) exh.products = products.slice(0, 12);
    if (Array.isArray(staff)) exh.staff = staff.slice(0, 12);
    pushLog(req.authUser!.name, 'EXHIBITOR_UPDATED', `Updated profile for ${exh.companyName}`);
    saveDatabase(db);
    io.emit('state:sync', getPublicSnapshot());
    res.json(exh);
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
    const { title, speaker, startTime, endTime, location, topic } = req.body as Partial<typeof session>;
    if (title) session.title = title.trim();
    if (speaker) session.speaker = speaker.trim();
    if (startTime) session.startTime = startTime;
    if (endTime) session.endTime = endTime;
    if (location) session.location = location.trim();
    if (topic) session.topic = topic.trim();
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

  // ATT-2 & ATT-5: Expo/Session Registration & Bookmarks
  app.post('/api/expos/:id/register', requireAuth, (req: AuthRequest, res: Response) => {
    const expo = db.expos.find((e) => e.id === req.params.id);
    if (!expo) {
      res.status(404).json({ error: 'Expo not found.' });
      return;
    }
    const uid = req.authUser!.id;
    if (!expo.registeredUserIds.includes(uid)) {
      expo.registeredUserIds.push(uid);
      pushLog(req.authUser!.name, 'EXPO_REGISTERED', `Registered for ${expo.title}`);
      saveDatabase(db);
      io.emit('state:sync', getPublicSnapshot());
    }
    res.json(expo);
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
      userId: 'guest',
      userName: (userName || 'Expo Visitor').trim().slice(0, 64),
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
  app.get('/api/sync/:syncKey', (req: Request, res: Response) => {
    const syncKey = String(req.params.syncKey || '').toUpperCase().trim();
    if (!SYNC_KEY_REGEX.test(syncKey)) {
      res.status(400).json({ error: 'Invalid sync key format.' });
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

  app.put('/api/sync/:syncKey', (req: Request, res: Response) => {
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
    res.json({ ok: true, syncKey, updatedAt, checksum });
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
    console.log(`EventSphere Management server + Socket.io listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
