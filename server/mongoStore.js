import { MongoClient } from 'mongodb';

const state = {
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
};

function stripMongoId(doc) {
  const copy = { ...doc };
  delete copy._id;
  return copy;
}

function getMongoUri() {
  const raw = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  return raw.trim();
}

export async function connectMongoStore() {
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

export async function closeMongoStore() {
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

export async function loadDatabaseFromMongo() {
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
      users: users.map((d) => stripMongoId(d)),
      resetTokens: resetTokens.map((d) => stripMongoId(d)),
      expos: expos.map((d) => stripMongoId(d)),
      booths: booths.map((d) => stripMongoId(d)),
      exhibitors: exhibitors.map((d) => stripMongoId(d)),
      applications: applications.map((d) => stripMongoId(d)),
      registrations: registrations.map((d) => stripMongoId(d)),
      sessions: sessions.map((d) => stripMongoId(d)),
      speakers: speakers.map((d) => stripMongoId(d)),
      messages: messages.map((d) => stripMongoId(d)),
      notifications: notifications.map((d) => stripMongoId(d)),
      feedback: feedback.map((d) => stripMongoId(d)),
      activityLogs: activityLogs.map((d) => stripMongoId(d)),
      analyticsSeries: analyticsSeries.map((d) => stripMongoId(d)),
    };
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : 'Failed loading from MongoDB';
    console.warn('[EventSphere] Failed to read MongoDB snapshot:', state.lastError);
    return null;
  }
}

async function syncCollection(db, collectionName, docs, keyFn) {
  const col = db.collection(collectionName);
  const keys = docs.map(keyFn);

  if (keys.length === 0) {
    await col.deleteMany({});
    return;
  }

  await col.deleteMany({ _id: { $nin: keys } });
  const ops = docs.map((item) => {
    const key = keyFn(item);
    return {
      replaceOne: {
        filter: { _id: key },
        replacement: { _id: key, ...item },
        upsert: true,
      },
    };
  });
  await col.bulkWrite(ops, { ordered: false });
}

export function queueSyncDatabaseToMongo(snapshot) {
  if (!state.db) return Promise.resolve();

  const cloned = JSON.parse(JSON.stringify(snapshot));
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

export async function getSyncRecordFromMongo(syncKey) {
  if (!state.db) return null;
  try {
    const doc = await state.db
      .collection(COLLECTIONS.syncVault)
      .findOne({ _id: syncKey });
    if (!doc) return null;
    return stripMongoId(doc);
  } catch {
    return null;
  }
}

export async function upsertSyncRecordToMongo(record) {
  if (!state.db) return;
  try {
    await state.db
      .collection(COLLECTIONS.syncVault)
      .replaceOne(
        { _id: record.syncKey },
        { _id: record.syncKey, ...record },
        { upsert: true },
      );
  } catch (err) {
    console.warn('[EventSphere] MongoDB sync-vault write warning:', err instanceof Error ? err.message : err);
  }
}
