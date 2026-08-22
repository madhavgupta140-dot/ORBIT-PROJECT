import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, Post, Story, Conversation, OrbitNotification, OrbitSettings } from '../types';

// 1. Initialize Firebase Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Operation Types for error diagnosis
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[ORBIT Backend Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 2. Validate Connection to Firestore on Boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[ORBIT Backend] Connected to Cloud Firestore database.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[ORBIT Backend] Offline / unable to reach server directly, operating with local cache.');
    } else {
      console.log('[ORBIT Backend] Initial probe response:', error);
    }
    return false;
  }
}

// Run connection probe
testConnection();

// 3. Auth Helpers
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return result.user;
  } catch (err: unknown) {
    console.error('[ORBIT Auth] Google Sign-In error:', err);
    throw err;
  }
}

export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err: unknown) {
    console.error('[ORBIT Auth] Sign-Out error:', err);
    throw err;
  }
}

// 4. User Profile & Username Registry Helpers
export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const path = `usernames/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', normalized));
    return !snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function registerUsername(username: string, uid: string): Promise<void> {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const path = `usernames/${normalized}`;
  try {
    await setDoc(doc(db, 'usernames', normalized), {
      uid,
      username: normalized,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!normalized) return null;
  const path = `usernames/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', normalized));
    if (!snap.exists()) return null;
    const uid = snap.data()?.uid;
    if (!uid) return null;
    return await getUserProfile(uid);
  } catch (err) {
    console.warn(`[ORBIT Backend] Failed to look up username @${normalized}:`, err);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.id}`;
  try {
    const sanitized = sanitizeFirestoreData(profile);
    await setDoc(doc(db, 'users', profile.id), sanitized, { merge: true });
    // Also update private PII partition if authenticated
    if (auth.currentUser && auth.currentUser.uid === profile.id) {
      await setDoc(
        doc(db, 'users', profile.id, 'private', 'info'),
        {
          email: auth.currentUser.email || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
