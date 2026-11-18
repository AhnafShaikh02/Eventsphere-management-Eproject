import { createOfflineFallbackSnapshot } from '../data/offlineFallbackSeed';
import {
  adminApi,
  applicationApi,
  assistantApi,
  AUTH_TOKEN_STORAGE_KEY,
  authApi,
  boothApi,
  commsApi,
  coreApi,
  exhibitorApi,
  expoApi,
  sessionApi,
  setGlobalAuthToken,
  speakerApi,
  syncApi,
  weatherApi,
} from './api';

const STORAGE_AUTH_TOKEN = AUTH_TOKEN_STORAGE_KEY;
const STORAGE_AUTH_USER = 'eventsphere_auth_user_v1';
const STORAGE_SNAPSHOT = 'eventsphere_snapshot_cache_v1';
const STORAGE_WORKSPACE = 'eventsphere_workspace_v1';
const STORAGE_SYNC_META = 'eventsphere_sync_meta_v1';

export function getDefaultWorkspace() {
  return {
    favoriteBoothIds: ['booth-A2', 'booth-B3'],
    favoriteExhibitorIds: ['exh-1', 'exh-2'],
    favoriteSessionIds: ['ses-1', 'ses-3'],
    notes: {
      'booth-A2': 'Schedule robotics pick-and-place live demo at 11:30.',
      'booth-B3': 'Request 480V solid-state microgrid spec sheet.',
    },
    preferences: {
      nightMode: true,
      trussAndVisitors: true,
      showFloorGrid: true,
    },
  };
}

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_WORKSPACE);
    if (!raw) {
      const defaults = getDefaultWorkspace();
      localStorage.setItem(STORAGE_WORKSPACE, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    const defaults = getDefaultWorkspace();
    return {
      favoriteBoothIds: Array.isArray(parsed.favoriteBoothIds)
        ? parsed.favoriteBoothIds
        : defaults.favoriteBoothIds,
      favoriteExhibitorIds: Array.isArray(parsed.favoriteExhibitorIds)
        ? parsed.favoriteExhibitorIds
        : defaults.favoriteExhibitorIds,
      favoriteSessionIds: Array.isArray(parsed.favoriteSessionIds)
        ? parsed.favoriteSessionIds
        : defaults.favoriteSessionIds,
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : defaults.notes,
      preferences: {
        nightMode: parsed.preferences?.nightMode ?? defaults.preferences.nightMode,
        trussAndVisitors: parsed.preferences?.trussAndVisitors ?? defaults.preferences.trussAndVisitors,
        showFloorGrid: parsed.preferences?.showFloorGrid ?? defaults.preferences.showFloorGrid,
      },
    };
  } catch {
    return getDefaultWorkspace();
  }
}

export function saveWorkspace(state) {
  try {
    localStorage.setItem(STORAGE_WORKSPACE, JSON.stringify(state));
  } catch {
    // Ignore storage quota exceptions
  }
}

export function loadCachedSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_SNAPSHOT);
    if (raw) {
      const parsed = JSON.parse(raw);
      const fallback = createOfflineFallbackSnapshot();
      if (Array.isArray(parsed.booths) && Array.isArray(parsed.sessions)) {
        return {
          ...fallback,
          ...parsed,
          registrations: Array.isArray(parsed.registrations)
            ? parsed.registrations
            : fallback.registrations,
          speakers: Array.isArray(parsed.speakers) ? parsed.speakers : fallback.speakers,
        };
      }
    }
  } catch {
    // Fallback to offline seed
  }
  const seed = createOfflineFallbackSnapshot();
  saveCachedSnapshot(seed);
  return seed;
}

export function saveCachedSnapshot(snapshot) {
  try {
    localStorage.setItem(STORAGE_SNAPSHOT, JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors
  }
}

export function loadAuthSession() {
  try {
    const token = localStorage.getItem(STORAGE_AUTH_TOKEN);
    const rawUser = localStorage.getItem(STORAGE_AUTH_USER);
    const user = rawUser ? JSON.parse(rawUser) : null;
    setGlobalAuthToken(token);
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function saveAuthSession(token, user) {
  try {
    if (token && user) {
      localStorage.setItem(STORAGE_AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
      setGlobalAuthToken(token);
    } else {
      localStorage.removeItem(STORAGE_AUTH_TOKEN);
      localStorage.removeItem(STORAGE_AUTH_USER);
      setGlobalAuthToken(null);
    }
  } catch {
    // Ignore
  }
}

export function generateSyncKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `SPHERE-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}`;
}

export function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_META);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fallback
  }
  const initial = {
    syncKey: generateSyncKey(),
    lastSyncedAt: null,
    pendingSync: false,
    checksum: null,
  };
  saveSyncMeta(initial);
  return initial;
}

export function saveSyncMeta(meta) {
  try {
    localStorage.setItem(STORAGE_SYNC_META, JSON.stringify(meta));
  } catch {
    // Ignore
  }
}

export const eventSphereApi = {
  getHealth: () => coreApi.getHealth(),
  getState: (token) => coreApi.getState(token),

  getVenueWeather: (location, refresh = false) =>
    weatherApi.getVenueWeather(location, refresh),

  register: (payload) => authApi.register(payload),
  login: (payload) => authApi.login(payload),
  forgotPassword: (email) => authApi.forgotPassword(email),
  verifyResetOtp: (payload) => authApi.verifyResetOtp(payload),
  resetPassword: (payload) => authApi.resetPassword(payload),
  getMe: (token) => authApi.getMe(token),
  updateProfile: (token, payload) => authApi.updateProfile(token, payload),

  createExpo: (token, payload) => expoApi.create(token, payload),
  updateExpo: (token, expoId, payload) => expoApi.update(token, expoId, payload),
  deleteExpo: (token, expoId) => expoApi.remove(token, expoId),
  registerForExpo: (token, expoId) => expoApi.registerAttendee(token, expoId),
  cancelExpoRegistration: (token, expoId) => expoApi.cancelRegistration(token, expoId),

  createBooth: (token, payload) => boothApi.create(token, payload),
  updateBooth: (token, boothId, payload) => boothApi.update(token, boothId, payload),
  deleteBooth: (token, boothId) => boothApi.remove(token, boothId),
  reserveBooth: (token, boothId) => boothApi.reserve(token, boothId),
  releaseBooth: (token, boothId) => boothApi.release(token, boothId),

  submitApplication: (token, payload) => applicationApi.submit(token, payload),
  reviewApplication: (token, appId, payload) => applicationApi.review(token, appId, payload),
  requestApplicationInfo: (token, appId, reviewerNote) =>
    applicationApi.requestInfo(token, appId, reviewerNote),

  updateExhibitorProfile: (token, exhibitorId, payload) =>
    exhibitorApi.updateProfile(token, exhibitorId, payload),
  recordExhibitorView: (exhibitorId) => exhibitorApi.recordView(exhibitorId),

  createSession: (token, payload) => sessionApi.create(token, payload),
  updateSession: (token, sessionId, payload) => sessionApi.update(token, sessionId, payload),
  deleteSession: (token, sessionId) => sessionApi.remove(token, sessionId),
  toggleSessionRegister: (token, sessionId) => sessionApi.toggleRegister(token, sessionId),
  toggleSessionBookmark: (token, sessionId) => sessionApi.toggleBookmark(token, sessionId),

  createSpeaker: (token, payload) => speakerApi.create(token, payload),
  updateSpeaker: (token, speakerId, payload) => speakerApi.update(token, speakerId, payload),
  deleteSpeaker: (token, speakerId) => speakerApi.remove(token, speakerId),

  getAdminAttendees: (token) => adminApi.getAttendees(token),
  getAdminMonitoring: (token) => adminApi.getMonitoring(token),
  triggerManualBackup: (token) => adminApi.triggerBackup(token),

  sendMessage: (token, payload) => commsApi.sendMessage(token, payload),
  submitFeedback: (payload) => commsApi.submitFeedback(payload),
  updateFeedbackStatus: (token, feedbackId, status) =>
    commsApi.updateFeedbackStatus(token, feedbackId, status),
  markNotificationsRead: (token) => commsApi.markNotificationsRead(token),

  assistantChat: (payload, token) => assistantApi.chat(payload, token),
  assistantTranscribe: (payload) => assistantApi.transcribe(payload),
  assistantTts: (payload) => assistantApi.tts(payload),

  updatePrivacyConsent: (token, payload) => authApi.updatePrivacyConsent(token, payload),
  exportPrivacyData: (token) => authApi.exportPrivacyData(token),
  deleteAccount: (token) => authApi.deleteAccount(token),
};

export async function pushCloudBackup(syncKey, payload) {
  const res = await syncApi.push(
    syncKey,
    navigator.platform || 'Web Browser',
    payload,
  );
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  return { ok: true, updatedAt: res.data.updatedAt, checksum: res.data.checksum };
}

export async function pullCloudBackup(syncKey) {
  const res = await syncApi.pull(syncKey);
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  return {
    ok: true,
    payload: res.data.payload,
    updatedAt: res.data.updatedAt,
    checksum: res.data.checksum,
  };
}

export function getRoleLabel(role) {
  if (role === 'admin') return 'Organizer';
  if (role === 'exhibitor') return 'Exhibitor';
  return 'Attendee';
}
