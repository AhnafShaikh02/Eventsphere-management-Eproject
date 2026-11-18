import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
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
];

let firebaseApp = null;
let firebaseAuth = null;

function getFirebaseAuth() {
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
let cachedAccessToken = null;
let cachedGoogleUser = null;

const subscribers = new Set();

function notifySubscribers() {
  for (const cb of subscribers) {
    cb(cachedGoogleUser, cachedAccessToken);
  }
}

export function subscribeGmailAuth(cb) {
  subscribers.add(cb);
  cb(cachedGoogleUser, cachedAccessToken);
  return () => {
    subscribers.delete(cb);
  };
}

let authListenerAttached = false;

export function initGmailAuth(onAuthSuccess, onAuthCleared) {
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

export async function googleSignInForGmail() {
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

export function getGmailAccessToken() {
  return cachedAccessToken;
}

export function getGmailUser() {
  return cachedGoogleUser;
}

export async function disconnectGmailAuth() {
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
