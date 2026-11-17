import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
] as const;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
}

const provider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: 'select_account' });

// Strict in-memory cache for the Google OAuth access token (never localStorage/sessionStorage).
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

const subscribers = new Set<(user: User | null, token: string | null) => void>();

function notifySubscribers() {
  for (const cb of subscribers) {
    cb(cachedGoogleUser, cachedAccessToken);
  }
}

export function subscribeGmailAuth(
  cb: (user: User | null, token: string | null) => void,
): () => void {
  subscribers.add(cb);
  cb(cachedGoogleUser, cachedAccessToken);
  return () => {
    subscribers.delete(cb);
  };
}

let authListenerAttached = false;

export function initGmailAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthCleared?: () => void,
): () => void {
  const auth = getFirebaseAuth();
  if (!authListenerAttached) {
    authListenerAttached = true;
    onAuthStateChanged(auth, (user) => {
      if (user) {
        cachedGoogleUser = user;
        if (cachedAccessToken) {
          onAuthSuccess?.(user, cachedAccessToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          onAuthCleared?.();
        }
      } else {
        cachedGoogleUser = null;
        cachedAccessToken = null;
        onAuthCleared?.();
      }
      notifySubscribers();
    });
  }
  return subscribeGmailAuth((user, token) => {
    if (user && token) {
      onAuthSuccess?.(user, token);
    } else if (!user || !token) {
      onAuthCleared?.();
    }
  });
}

export async function googleSignInForGmail(): Promise<{ user: User; accessToken: string }> {
  const auth = getFirebaseAuth();
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return a Gmail access token. Please allow Gmail permissions and try again.');
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifySubscribers();
    return { user: result.user, accessToken: credential.accessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getGmailAccessToken(): string | null {
  return cachedAccessToken;
}

export function getGmailUser(): User | null {
  return cachedGoogleUser;
}

export async function disconnectGmailAuth(): Promise<void> {
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifySubscribers();
  try {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // Ignore sign-out cleanup failures if Firebase Auth had no active session
  }
}
