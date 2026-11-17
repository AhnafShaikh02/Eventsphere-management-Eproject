import { type Db, MongoClient, type Document } from 'mongodb';
import type { ServerDatabase, SyncRecord } from './types';

export type StorageMode = 'mongodb' | 'json-fallback';

interface MongoStoreState {
  client: MongoClient | null;
  db: Db | null;
  mode: StorageMode;
  dbName: string | null;
  lastError: string | null;
  lastSyncedAt: string | null;
  flushQueue: Promise<void>;
}

const state: MongoStoreState = {
  client: null,
  db: null,
  mode: 'json-fallback',
  dbName: null,
  lastError: null,
  lastSyncedAt: null,
  flushQueue: Promise.resolve(),
};

const COLLECTIONS = {
  users: 'es_users',
  resetTokens: 'es_reset_tokens',
  expos: 'es_expos',
  booths: 'es_booths',
  exhibitors: 'es_exhibitors',
  applications: 'es_applications',
  registrations: 'es_registrations',
  sessions: 'es_sessions',
  speakers: 'es_speakers',
  messages: 'es_messages',
  notifications: 'es_notifications',
  feedback: 'es_feedback',
  activityLogs: 'es_activity_logs',
  analyticsSeries: 'es_analytics_series',
  syncVault: 'es_sync_vault',
} as const;

function stripMongoId<T extends object>(doc: Document): T {
  const copy = { ...doc } as Record<string, unknown>;
  delete copy._id;
  return copy as T;
}

function getMongoUri(): string {
  const raw = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  return raw.trim();
}

export async function connectMongoStore(): Promise<boolean> {
  if (process.env.EVENTSPHERE_DISABLE_MONGO === 'true') {
    state.mode = 'json-fallback';
    state.lastError = 'Disabled via EVENTSPHERE_DISABLE_MONGO';
    return false;
  }

  const uri = getMongoUri();
  if (!uri) {
    state.mode = 'json-fallback';
    state.lastError = 'MONGODB_URI is not configured';
    return false;
  }

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
      maxPoolSize: 10,
    });
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });

    state.client = client;
    state.db = db;
    state.dbName = db.databaseName;
    state.mode = 'mongodb';
    state.lastError = null;
    console.log(`[EventSphere] Connected to MongoDB Atlas database "${db.databaseName}"`);
    return true;
  } catch (err) {
    state.mode = 'json-fallback';
    state.lastError = err instanceof Error ? err.message : 'Unknown MongoDB connection error';
    console.warn(`[EventSphere] MongoDB connection unavailable (${state.lastError}); using JSON fallback.`);
    return false;
  }
}

export async function closeMongoStore(): Promise<void> {
  try {
    await state.flushQueue;
    if (state.client) {
      await state.client.close();
    }
  } catch {
    // Ignore close errors
  } finally {
    state.client = null;
    state.db = null;
    state.mode = 'json-fallback';
  }
}

export function getMongoStoreStatus() {
  return {
    mode: state.mode,
    connected: state.mode === 'mongodb' && state.db !== null,
    database: state.dbName,
    lastSyncedAt: state.lastSyncedAt,
    lastError: state.lastError,
  };
}

export async function loadDatabaseFromMongo(): Promise<ServerDatabase | null> {
  if (!state.db) return null;

  try {
    const [usersCount, boothsCount] = await Promise.all([
      state.db.collection(COLLECTIONS.users).countDocuments(),
      state.db.collection(COLLECTIONS.booths).countDocuments(),
    ]);

    if (usersCount === 0 || boothsCount === 0) {
      return null;
    }

    const [
      users,
      resetTokens,
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
    ] = await Promise.all([
      state.db.collection(COLLECTIONS.users).find().toArray(),
      state.db.collection(COLLECTIONS.resetTokens).find().toArray(),
      state.db.collection(COLLECTIONS.expos).find().toArray(),
      state.db.collection(COLLECTIONS.booths).find().toArray(),
      state.db.collection(COLLECTIONS.exhibitors).find().toArray(),
      state.db.collection(COLLECTIONS.applications).find().toArray(),
      state.db.collection(COLLECTIONS.registrations).find().toArray(),
      state.db.collection(COLLECTIONS.sessions).find().toArray(),
      state.db.collection(COLLECTIONS.speakers).find().toArray(),
      state.db.collection(COLLECTIONS.messages).find().toArray(),
      state.db.collection(COLLECTIONS.notifications).find().toArray(),
      state.db.collection(COLLECTIONS.feedback).find().toArray(),
      state.db.collection(COLLECTIONS.activityLogs).find().toArray(),
      state.db.collection(COLLECTIONS.analyticsSeries).find().toArray(),
    ]);

    return {
      users: users.map((d) => stripMongoId<ServerDatabase['users'][number]>(d)),
      resetTokens: resetTokens.map((d) => stripMongoId<ServerDatabase['resetTokens'][number]>(d)),
      expos: expos.map((d) => stripMongoId<ServerDatabase['expos'][number]>(d)),
      booths: booths.map((d) => stripMongoId<ServerDatabase['booths'][number]>(d)),
      exhibitors: exhibitors.map((d) => stripMongoId<ServerDatabase['exhibitors'][number]>(d)),
      applications: applications.map((d) => stripMongoId<ServerDatabase['applications'][number]>(d)),
      registrations: registrations.map((d) => stripMongoId<ServerDatabase['registrations'][number]>(d)),
      sessions: sessions.map((d) => stripMongoId<ServerDatabase['sessions'][number]>(d)),
      speakers: speakers.map((d) => stripMongoId<ServerDatabase['speakers'][number]>(d)),
      messages: messages.map((d) => stripMongoId<ServerDatabase['messages'][number]>(d)),
      notifications: notifications.map((d) => stripMongoId<ServerDatabase['notifications'][number]>(d)),
      feedback: feedback.map((d) => stripMongoId<ServerDatabase['feedback'][number]>(d)),
      activityLogs: activityLogs.map((d) => stripMongoId<ServerDatabase['activityLogs'][number]>(d)),
      analyticsSeries: analyticsSeries.map((d) => stripMongoId<ServerDatabase['analyticsSeries'][number]>(d)),
    };
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : 'Failed loading from MongoDB';
    console.warn('[EventSphere] Failed to read MongoDB snapshot:', state.lastError);
    return null;
  }
}

async function syncCollection<T extends object>(
  db: Db,
  collectionName: string,
  docs: T[],
  keyFn: (item: T) => string,
): Promise<void> {
  const col = db.collection<Document>(collectionName);
  const keys = docs.map(keyFn);

  if (keys.length === 0) {
    await col.deleteMany({});
    return;
  }

  await col.deleteMany({ _id: { $nin: keys } as unknown as Document['_id'] });
  const ops = docs.map((item) => {
    const key = keyFn(item);
    return {
      replaceOne: {
        filter: { _id: key } as unknown as Document,
        replacement: { _id: key, ...item } as unknown as Document,
        upsert: true,
      },
    };
  });
  await col.bulkWrite(ops, { ordered: false });
}

export function queueSyncDatabaseToMongo(snapshot: ServerDatabase): Promise<void> {
  if (!state.db) return Promise.resolve();

  const cloned = JSON.parse(JSON.stringify(snapshot)) as ServerDatabase;
  state.flushQueue = state.flushQueue
    .then(async () => {
      const db = state.db;
      if (!db) return;

      await Promise.all([
        syncCollection(db, COLLECTIONS.users, cloned.users, (u) => u.id),
        syncCollection(db, COLLECTIONS.resetTokens, cloned.resetTokens, (t) => t.email),
        syncCollection(db, COLLECTIONS.expos, cloned.expos, (e) => e.id),
        syncCollection(db, COLLECTIONS.booths, cloned.booths, (b) => b.id),
        syncCollection(db, COLLECTIONS.exhibitors, cloned.exhibitors, (e) => e.id),
        syncCollection(db, COLLECTIONS.applications, cloned.applications, (a) => a.id),
        syncCollection(db, COLLECTIONS.registrations, cloned.registrations, (r) => r.id),
        syncCollection(db, COLLECTIONS.sessions, cloned.sessions, (s) => s.id),
        syncCollection(db, COLLECTIONS.speakers, cloned.speakers, (s) => s.id),
        syncCollection(db, COLLECTIONS.messages, cloned.messages, (m) => m.id),
        syncCollection(db, COLLECTIONS.notifications, cloned.notifications, (n) => n.id),
        syncCollection(db, COLLECTIONS.feedback, cloned.feedback, (f) => f.id),
        syncCollection(db, COLLECTIONS.activityLogs, cloned.activityLogs, (l) => l.id),
        syncCollection(db, COLLECTIONS.analyticsSeries, cloned.analyticsSeries, (a) => a.date),
      ]);

      state.lastSyncedAt = new Date().toISOString();
      state.lastError = null;
    })
    .catch((err) => {
      state.lastError = err instanceof Error ? err.message : 'MongoDB write failed';
      console.warn('[EventSphere] MongoDB sync warning:', state.lastError);
    });

  return state.flushQueue;
}

export async function getSyncRecordFromMongo(syncKey: string): Promise<SyncRecord | null> {
  if (!state.db) return null;
  try {
    const doc = await state.db
      .collection<Document>(COLLECTIONS.syncVault)
      .findOne({ _id: syncKey } as unknown as Document);
    if (!doc) return null;
    return stripMongoId<SyncRecord>(doc);
  } catch {
    return null;
  }
}

export async function upsertSyncRecordToMongo(record: SyncRecord): Promise<void> {
  if (!state.db) return;
  try {
    await state.db
      .collection<Document>(COLLECTIONS.syncVault)
      .replaceOne(
        { _id: record.syncKey } as unknown as Document,
        { _id: record.syncKey, ...record } as unknown as Document,
        { upsert: true },
      );
  } catch (err) {
    console.warn('[EventSphere] MongoDB sync-vault write warning:', err instanceof Error ? err.message : err);
  }
}
