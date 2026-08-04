import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types';

function mapFirebaseUser(fbUser: FirebaseUser, profile: User): User {
  return {
    ...profile,
    uid: fbUser.uid,
    email: fbUser.email ?? profile.email,
    photoURL: fbUser.photoURL ?? profile.photoURL,
  };
}

function subscribeToUserProfile(uid: string): () => void {
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const profile = snap.data() as User;
      const store = useAuthStore.getState();
      if (store.user) {
        useAuthStore.getState().setUser({ ...store.user, ...profile });
      }
    }
  }, () => {
    useAuthStore.getState().setUser(null);
  });
}

export async function fetchUserProfile(uid: string): Promise<User | null> {
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export function initializeAuthListener(): () => void {
  let unsubProfile: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
    const store = useAuthStore.getState();

    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }

    if (fbUser) {
      const token = await fbUser.getIdToken();
      store.setToken(token);
      unsubProfile = subscribeToUserProfile(fbUser.uid);

      const profile = await fetchUserProfile(fbUser.uid);
      if (profile) {
        store.setUser(mapFirebaseUser(fbUser, profile));
      } else {
        store.setUser(null);
      }
    } else {
      store.setToken(null);
      store.setUser(null);
    }

    store.setLoading(false);
    store.setInitialized(true);
  });

  return () => {
    unsubAuth();
    if (unsubProfile) unsubProfile();
  };
}

export async function loginUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;
  const token = await fbUser.getIdToken();
  useAuthStore.getState().setToken(token);

  const profile = await fetchUserProfile(fbUser.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('Usuario sin perfil en el sistema');
  }

  const user = mapFirebaseUser(fbUser, profile);
  useAuthStore.getState().setUser(user);
  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  useAuthStore.getState().reset();
}
