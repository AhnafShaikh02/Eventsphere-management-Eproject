import { createOfflineFallbackSnapshot } from '../data/offlineFallbackSeed';
import type {
  BoothStatus,
  ChatMessage,
  EventSphereSnapshot,
  ExhibitorApplication,
  ExhibitorProfile,
  ExpoBooth,
  ExpoEvent,
  ExpoSession,
  FeedbackEntry,
  UserAccount,
  UserRole,
} from '../types/eventsphere';

export interface WorkspacePreferences {
  nightMode: boolean;
  trussAndVisitors: boolean;
  showFloorGrid: boolean;
}

export interface LocalWorkspaceState {
  favoriteBoothIds: string[];
  favoriteExhibitorIds: string[];
  favoriteSessionIds: string[];
  notes: Record<string, string>;
  preferences: WorkspacePreferences;
}

export interface CloudSyncMeta {
  syncKey: string;
  lastSyncedAt: string | null;
  pendingSync: boolean;
  checksum: string | null;
}

const STORAGE_AUTH_TOKEN = 'eventsphere_auth_token_v1';
const STORAGE_AUTH_USER = 'eventsphere_auth_user_v1';
const STORAGE_SNAPSHOT = 'eventsphere_snapshot_cache_v1';
const STORAGE_WORKSPACE = 'eventsphere_workspace_v1';
const STORAGE_SYNC_META = 'eventsphere_sync_meta_v1';

export function getDefaultWorkspace(): LocalWorkspaceState {
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

export function loadWorkspace(): LocalWorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_WORKSPACE);
    if (!raw) {
      const defaults = getDefaultWorkspace();
      localStorage.setItem(STORAGE_WORKSPACE, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<LocalWorkspaceState>;
    const defaults = getDefaultWorkspace();
    return {
      favoriteBoothIds: Array.isArray(parsed.favoriteBoothIds) ? parsed.favoriteBoothIds : defaults.favoriteBoothIds,
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

export function saveWorkspace(state: LocalWorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_WORKSPACE, JSON.stringify(state));
  } catch {
    // Ignore storage quota exceptions
  }
}

export function loadCachedSnapshot(): EventSphereSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_SNAPSHOT);
    if (raw) {
      const parsed = JSON.parse(raw) as EventSphereSnapshot;
      if (Array.isArray(parsed.booths) && Array.isArray(parsed.sessions)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to offline seed
  }
  const seed = createOfflineFallbackSnapshot();
  saveCachedSnapshot(seed);
  return seed;
}

export function saveCachedSnapshot(snapshot: EventSphereSnapshot): void {
  try {
    localStorage.setItem(STORAGE_SNAPSHOT, JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors
  }
}

export function loadAuthSession(): { token: string | null; user: UserAccount | null } {
  try {
    const token = localStorage.getItem(STORAGE_AUTH_TOKEN);
    const rawUser = localStorage.getItem(STORAGE_AUTH_USER);
    const user = rawUser ? (JSON.parse(rawUser) as UserAccount) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function saveAuthSession(token: string | null, user: UserAccount | null): void {
  try {
    if (token && user) {
      localStorage.setItem(STORAGE_AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_AUTH_TOKEN);
      localStorage.removeItem(STORAGE_AUTH_USER);
    }
  } catch {
    // Ignore
  }
}

export function generateSyncKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `SPHERE-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}`;
}

export function loadSyncMeta(): CloudSyncMeta {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_META);
    if (raw) {
      return JSON.parse(raw) as CloudSyncMeta;
    }
  } catch {
    // Fallback
  }
  const initial: CloudSyncMeta = {
    syncKey: generateSyncKey(),
    lastSyncedAt: null,
    pendingSync: false,
    checksum: null,
  };
  saveSyncMeta(initial);
  return initial;
}

export function saveSyncMeta(meta: CloudSyncMeta): void {
  try {
    localStorage.setItem(STORAGE_SYNC_META, JSON.stringify(meta));
  } catch {
    // Ignore
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, { ...options, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`,
        status: res.status,
      };
    }
    return { ok: true, data: body as T };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
      status: 0,
    };
  }
}

export const eventSphereApi = {
  getState: () => apiRequest<EventSphereSnapshot>('/api/state'),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'exhibitor' | 'attendee';
    company?: string;
    gdprConsent: boolean;
  }) =>
    apiRequest<{ token: string; user: UserAccount }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ token: string; user: UserAccount }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ ok: boolean; message: string; demoResetCode?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { email: string; token: string; newPassword: string }) =>
    apiRequest<{ ok: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: (token: string) => apiRequest<{ user: UserAccount }>('/api/auth/me', {}, token),

  updateProfile: (token: string, payload: { name: string; company?: string; title?: string }) =>
    apiRequest<{ user: UserAccount; token: string }>(
      '/api/auth/profile',
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),

  createExpo: (
    token: string,
    payload: { title: string; date: string; endDate: string; location: string; description: string; theme: string },
  ) =>
    apiRequest<ExpoEvent>(
      '/api/expos',
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),

  updateExpo: (
    token: string,
    expoId: string,
    payload: Partial<Pick<ExpoEvent, 'title' | 'date' | 'endDate' | 'location' | 'description' | 'theme'>>,
  ) =>
    apiRequest<ExpoEvent>(
      `/api/expos/${encodeURIComponent(expoId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),

  deleteExpo: (token: string, expoId: string) =>
    apiRequest<{ ok: boolean }>(`/api/expos/${encodeURIComponent(expoId)}`, { method: 'DELETE' }, token),

  registerForExpo: (token: string, expoId: string) =>
    apiRequest<ExpoEvent>(`/api/expos/${encodeURIComponent(expoId)}/register`, { method: 'POST' }, token),

  updateBooth: (
    token: string,
    boothId: string,
    payload: { size?: ExpoBooth['size']; priceUsd?: number; status?: BoothStatus; exhibitorId?: string | null },
  ) =>
    apiRequest<ExpoBooth>(
      `/api/booths/${encodeURIComponent(boothId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),

  reserveBooth: (token: string, boothId: string) =>
    apiRequest<ExpoBooth>(`/api/booths/${encodeURIComponent(boothId)}/reserve`, { method: 'POST' }, token),

  releaseBooth: (token: string, boothId: string) =>
    apiRequest<ExpoBooth>(`/api/booths/${encodeURIComponent(boothId)}/release`, { method: 'POST' }, token),

  submitApplication: (
    token: string,
    payload: {
      expoId: string;
      companyName: string;
      category: ExhibitorProfile['category'];
      productsSummary: string;
      documents: string[];
    },
  ) =>
    apiRequest<ExhibitorApplication>(
      '/api/applications',
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),

  reviewApplication: (
    token: string,
    appId: string,
    payload: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ) =>
    apiRequest<ExhibitorApplication>(
      `/api/applications/${encodeURIComponent(appId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),

  updateExhibitorProfile: (
    token: string,
    exhibitorId: string,
    payload: Partial<
      Pick<
        ExhibitorProfile,
        'companyName' | 'tagline' | 'description' | 'products' | 'staff' | 'website' | 'contactEmail' | 'logoColor'
      >
    >,
  ) =>
    apiRequest<ExhibitorProfile>(
      `/api/exhibitors/${encodeURIComponent(exhibitorId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),

  recordExhibitorView: (exhibitorId: string) =>
    apiRequest<{ id: string; profileViews: number }>(
      `/api/exhibitors/${encodeURIComponent(exhibitorId)}/view`,
      { method: 'POST' },
    ),

  createSession: (
    token: string,
    payload: {
      expoId: string;
      title: string;
      speaker: string;
      speakerRole: string;
      topic: string;
      startTime: string;
      endTime: string;
      location: string;
      capacity: number;
    },
  ) =>
    apiRequest<ExpoSession>('/api/sessions', { method: 'POST', body: JSON.stringify(payload) }, token),

  updateSession: (
    token: string,
    sessionId: string,
    payload: Partial<Pick<ExpoSession, 'title' | 'speaker' | 'startTime' | 'endTime' | 'location' | 'topic'>>,
  ) =>
    apiRequest<ExpoSession>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),

  deleteSession: (token: string, sessionId: string) =>
    apiRequest<{ ok: boolean }>(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }, token),

  toggleSessionRegister: (token: string, sessionId: string) =>
    apiRequest<ExpoSession>(`/api/sessions/${encodeURIComponent(sessionId)}/register`, { method: 'POST' }, token),

  toggleSessionBookmark: (token: string, sessionId: string) =>
    apiRequest<ExpoSession>(`/api/sessions/${encodeURIComponent(sessionId)}/bookmark`, { method: 'POST' }, token),

  sendMessage: (
    token: string,
    payload: { recipientChannel: string; recipientLabel: string; body: string },
  ) =>
    apiRequest<ChatMessage>('/api/messages', { method: 'POST', body: JSON.stringify(payload) }, token),

  submitFeedback: (payload: {
    userName: string;
    category: FeedbackEntry['category'];
    message: string;
  }) =>
    apiRequest<FeedbackEntry>('/api/feedback', { method: 'POST', body: JSON.stringify(payload) }),

  updateFeedbackStatus: (token: string, feedbackId: string, status: 'open' | 'resolved') =>
    apiRequest<FeedbackEntry>(
      `/api/feedback/${encodeURIComponent(feedbackId)}`,
      { method: 'PUT', body: JSON.stringify({ status }) },
      token,
    ),

  markNotificationsRead: (token: string) =>
    apiRequest<{ ok: boolean }>('/api/notifications/read', { method: 'POST' }, token),
};

export async function pushCloudBackup(
  syncKey: string,
  payload: LocalWorkspaceState,
): Promise<{ ok: boolean; updatedAt?: string; checksum?: string; error?: string }> {
  const res = await apiRequest<{ ok: boolean; updatedAt: string; checksum: string }>(
    `/api/sync/${encodeURIComponent(syncKey.toUpperCase().trim())}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        deviceLabel: navigator.platform || 'Web Browser',
        payload,
      }),
    },
  );
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  return { ok: true, updatedAt: res.data.updatedAt, checksum: res.data.checksum };
}

export async function pullCloudBackup(
  syncKey: string,
): Promise<{ ok: boolean; payload?: LocalWorkspaceState; updatedAt?: string; checksum?: string; error?: string }> {
  const res = await apiRequest<{ updatedAt: string; checksum: string; payload: LocalWorkspaceState }>(
    `/api/sync/${encodeURIComponent(syncKey.toUpperCase().trim())}`,
  );
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

export function getRoleLabel(role: UserRole): string {
  if (role === 'admin') return 'Organizer';
  if (role === 'exhibitor') return 'Exhibitor';
  return 'Attendee';
}
