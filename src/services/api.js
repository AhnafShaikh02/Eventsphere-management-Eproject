import axios from 'axios';

export const AUTH_TOKEN_STORAGE_KEY = 'eventsphere_auth_token_v1';

/**
 * Base URL for the Node.js / Express backend.
 * Defaults to same-origin ('') when Vite middleware runs inside server.js,
 * or honors VITE_API_BASE_URL (e.g. 'http://localhost:3000') when decoupled.
 */
export const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

function readStoredToken() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function withAuthToken(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export function getErrorMessage(error, fallback = 'Unexpected network error') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error.error === 'string' && error.error) return error.error;

  const responseData = error.response?.data;
  if (typeof responseData?.error === 'string' && responseData.error) {
    return responseData.error;
  }
  if (typeof responseData?.message === 'string' && responseData.message) {
    return responseData.message;
  }
  if (typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return fallback;
}

export function normalizeApiError(error) {
  if (axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') {
    return {
      ok: false,
      error: 'Request cancelled',
      status: 0,
      code: 'ERR_CANCELED',
      details: null,
      isNetworkError: false,
    };
  }

  if (error?.response) {
    const status = error.response.status || 500;
    const data = error.response.data || {};
    const message =
      typeof data?.error === 'string' && data.error
        ? data.error
        : typeof data?.message === 'string' && data.message
          ? data.message
          : `Request failed (${status})`;

    return {
      ok: false,
      error: message,
      status,
      code: error.code || data?.code || null,
      details: data?.details ?? null,
      isNetworkError: false,
    };
  }

  if (error?.request) {
    const timedOut = error.code === 'ECONNABORTED';
    return {
      ok: false,
      error: timedOut
        ? 'Backend request timed out. Please try again.'
        : 'Unable to reach EventSphere Express server.',
      status: 0,
      code: error.code || 'NETWORK_ERROR',
      details: null,
      isNetworkError: true,
    };
  }

  return {
    ok: false,
    error: getErrorMessage(error),
    status: 0,
    code: error?.code || 'UNKNOWN_ERROR',
    details: null,
    isNetworkError: false,
  };
}

export function isNetworkError(resultOrError) {
  if (!resultOrError) return false;
  return Boolean(resultOrError.isNetworkError || resultOrError.status === 0);
}

export function isAuthError(resultOrError) {
  const status = resultOrError?.status ?? resultOrError?.response?.status;
  return status === 401 || status === 403;
}

export async function executeRequest(requestPromise) {
  try {
    const response = await requestPromise;
    return {
      ok: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    return error?.normalized || normalizeApiError(error);
  }
}

export const executeApiCall = executeRequest;

/**
 * Factory to build modular Axios instances per backend resource domain
 * with consistent base URL resolution, Bearer auth injection, and error normalization.
 */
export function createApiClient({ basePath = '', timeout = 15000, headers = {} } = {}) {
  const normalizedPath = basePath ? `/${String(basePath).replace(/^\/+/, '').replace(/\/+$/, '')}` : '';
  const baseURL = `${API_BASE_URL}${normalizedPath}` || '/';

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  instance.interceptors.request.use(
    (config) => {
      const nextHeaders = config.headers || {};
      const hasAuthHeader = Boolean(
        nextHeaders.Authorization ||
          nextHeaders.authorization ||
          (typeof nextHeaders.get === 'function' && nextHeaders.get('Authorization')),
      );

      if (!hasAuthHeader) {
        const storedToken = readStoredToken();
        if (storedToken) {
          if (typeof nextHeaders.set === 'function') {
            nextHeaders.set('Authorization', `Bearer ${storedToken}`);
          } else {
            nextHeaders.Authorization = `Bearer ${storedToken}`;
          }
        }
      }

      config.headers = nextHeaders;
      return config;
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      error.normalized = normalizeApiError(error);
      return Promise.reject(error);
    },
  );

  return instance;
}

// Modular domain-specific Axios instances
export const rootHttpClient = createApiClient({ basePath: '' });
export const apiClient = createApiClient({ basePath: '/api' });
export const authApiClient = createApiClient({ basePath: '/api/auth' });
export const expoApiClient = createApiClient({ basePath: '/api/expos' });
export const boothApiClient = createApiClient({ basePath: '/api/booths' });
export const exhibitorApiClient = createApiClient({ basePath: '/api/exhibitors' });
export const applicationApiClient = createApiClient({ basePath: '/api/applications' });
export const sessionApiClient = createApiClient({ basePath: '/api/sessions' });
export const speakerApiClient = createApiClient({ basePath: '/api/speakers' });
export const adminApiClient = createApiClient({ basePath: '/api/admin', timeout: 25000 });
export const assistantApiClient = createApiClient({ basePath: '/api/assistant', timeout: 30000 });
export const syncApiClient = createApiClient({ basePath: '/api/sync' });

const ALL_API_CLIENTS = [
  rootHttpClient,
  apiClient,
  authApiClient,
  expoApiClient,
  boothApiClient,
  exhibitorApiClient,
  applicationApiClient,
  sessionApiClient,
  speakerApiClient,
  adminApiClient,
  assistantApiClient,
  syncApiClient,
];

export function setGlobalAuthToken(token) {
  ALL_API_CLIENTS.forEach((client) => {
    if (token) {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete client.defaults.headers.common.Authorization;
    }
  });
}

// Modular endpoint helpers organized by backend router
export const authApi = {
  register: (payload) => executeRequest(authApiClient.post('/register', payload)),
  login: (payload) => executeRequest(authApiClient.post('/login', payload)),
  forgotPassword: (email) => executeRequest(authApiClient.post('/forgot-password', { email })),
  verifyResetOtp: (payload) => executeRequest(authApiClient.post('/verify-reset-otp', payload)),
  resetPassword: (payload) => executeRequest(authApiClient.post('/reset-password', payload)),
  getMe: (token) => executeRequest(authApiClient.get('/me', withAuthToken(token))),
  updateProfile: (token, payload) =>
    executeRequest(authApiClient.put('/profile', payload, withAuthToken(token))),
  updatePrivacyConsent: (token, payload) =>
    executeRequest(authApiClient.put('/privacy/consent', payload, withAuthToken(token))),
  exportPrivacyData: (token) =>
    executeRequest(authApiClient.get('/privacy/export', withAuthToken(token))),
  deleteAccount: (token) =>
    executeRequest(authApiClient.delete('/account', withAuthToken(token))),
};

export const expoApi = {
  create: (token, payload) => executeRequest(expoApiClient.post('/', payload, withAuthToken(token))),
  update: (token, expoId, payload) =>
    executeRequest(
      expoApiClient.put(`/${encodeURIComponent(expoId)}`, payload, withAuthToken(token)),
    ),
  remove: (token, expoId) =>
    executeRequest(expoApiClient.delete(`/${encodeURIComponent(expoId)}`, withAuthToken(token))),
  registerAttendee: (token, expoId) =>
    executeRequest(
      expoApiClient.post(`/${encodeURIComponent(expoId)}/register`, undefined, withAuthToken(token)),
    ),
  cancelRegistration: (token, expoId) =>
    executeRequest(
      expoApiClient.delete(`/${encodeURIComponent(expoId)}/register`, withAuthToken(token)),
    ),
};

export const boothApi = {
  create: (token, payload) =>
    executeRequest(boothApiClient.post('/', payload, withAuthToken(token))),
  update: (token, boothId, payload) =>
    executeRequest(
      boothApiClient.put(`/${encodeURIComponent(boothId)}`, payload, withAuthToken(token)),
    ),
  remove: (token, boothId) =>
    executeRequest(boothApiClient.delete(`/${encodeURIComponent(boothId)}`, withAuthToken(token))),
  reserve: (token, boothId) =>
    executeRequest(
      boothApiClient.post(`/${encodeURIComponent(boothId)}/reserve`, undefined, withAuthToken(token)),
    ),
  release: (token, boothId) =>
    executeRequest(
      boothApiClient.post(`/${encodeURIComponent(boothId)}/release`, undefined, withAuthToken(token)),
    ),
};

export const exhibitorApi = {
  updateProfile: (token, exhibitorId, payload) =>
    executeRequest(
      exhibitorApiClient.put(`/${encodeURIComponent(exhibitorId)}`, payload, withAuthToken(token)),
    ),
  recordView: (exhibitorId) =>
    executeRequest(exhibitorApiClient.post(`/${encodeURIComponent(exhibitorId)}/view`)),
};

export const applicationApi = {
  submit: (token, payload) =>
    executeRequest(applicationApiClient.post('/', payload, withAuthToken(token))),
  review: (token, appId, payload) =>
    executeRequest(
      applicationApiClient.put(`/${encodeURIComponent(appId)}`, payload, withAuthToken(token)),
    ),
  requestInfo: (token, appId, reviewerNote) =>
    executeRequest(
      applicationApiClient.post(
        `/${encodeURIComponent(appId)}/request-info`,
        { reviewerNote },
        withAuthToken(token),
      ),
    ),
};

export const sessionApi = {
  create: (token, payload) =>
    executeRequest(sessionApiClient.post('/', payload, withAuthToken(token))),
  update: (token, sessionId, payload) =>
    executeRequest(
      sessionApiClient.put(`/${encodeURIComponent(sessionId)}`, payload, withAuthToken(token)),
    ),
  remove: (token, sessionId) =>
    executeRequest(
      sessionApiClient.delete(`/${encodeURIComponent(sessionId)}`, withAuthToken(token)),
    ),
  toggleRegister: (token, sessionId) =>
    executeRequest(
      sessionApiClient.post(
        `/${encodeURIComponent(sessionId)}/register`,
        undefined,
        withAuthToken(token),
      ),
    ),
  toggleBookmark: (token, sessionId) =>
    executeRequest(
      sessionApiClient.post(
        `/${encodeURIComponent(sessionId)}/bookmark`,
        undefined,
        withAuthToken(token),
      ),
    ),
};

export const speakerApi = {
  create: (token, payload) =>
    executeRequest(speakerApiClient.post('/', payload, withAuthToken(token))),
  update: (token, speakerId, payload) =>
    executeRequest(
      speakerApiClient.put(`/${encodeURIComponent(speakerId)}`, payload, withAuthToken(token)),
    ),
  remove: (token, speakerId) =>
    executeRequest(
      speakerApiClient.delete(`/${encodeURIComponent(speakerId)}`, withAuthToken(token)),
    ),
};

export const adminApi = {
  getAttendees: (token) =>
    executeRequest(adminApiClient.get('/attendees', withAuthToken(token))),
  getMonitoring: (token) =>
    executeRequest(adminApiClient.get('/monitoring', withAuthToken(token))),
  triggerBackup: (token) =>
    executeRequest(adminApiClient.post('/backup', undefined, withAuthToken(token))),
};

export const assistantApi = {
  chat: (payload, token) =>
    executeRequest(assistantApiClient.post('/chat', payload, withAuthToken(token))),
  transcribe: (payload) => executeRequest(assistantApiClient.post('/transcribe', payload)),
  tts: (payload) => executeRequest(assistantApiClient.post('/tts', payload)),
};

export const commsApi = {
  sendMessage: (token, payload) =>
    executeRequest(apiClient.post('/messages', payload, withAuthToken(token))),
  submitFeedback: (payload) => executeRequest(apiClient.post('/feedback', payload)),
  updateFeedbackStatus: (token, feedbackId, status) =>
    executeRequest(
      apiClient.put(
        `/feedback/${encodeURIComponent(feedbackId)}`,
        { status },
        withAuthToken(token),
      ),
    ),
  markNotificationsRead: (token) =>
    executeRequest(apiClient.post('/notifications/read', undefined, withAuthToken(token))),
};

export const weatherApi = {
  getVenueWeather: (location, refresh = false) =>
    executeRequest(
      apiClient.get('/weather', {
        params: {
          location,
          ...(refresh ? { refresh: 1 } : {}),
        },
      }),
    ),
};

export const syncApi = {
  push: (syncKey, deviceLabel, payload) =>
    executeRequest(
      syncApiClient.put(`/${encodeURIComponent(syncKey.toUpperCase().trim())}`, {
        deviceLabel,
        payload,
      }),
    ),
  pull: (syncKey) =>
    executeRequest(syncApiClient.get(`/${encodeURIComponent(syncKey.toUpperCase().trim())}`)),
};

export const coreApi = {
  getHealth: () => executeRequest(apiClient.get('/health')),
  getState: (token) => executeRequest(apiClient.get('/state', withAuthToken(token))),
};

export default apiClient;
