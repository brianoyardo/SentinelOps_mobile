import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import type { Route, Checkpoint, Geofence } from '@/types';

export async function getRoute(routeId: string): Promise<Route | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.ROUTES, routeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Route;
}

export async function getCheckpointsByRoute(routeId: string): Promise<Checkpoint[]> {
  const q = query(collection(db, COLLECTIONS.CHECKPOINTS), where('routeId', '==', routeId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Checkpoint[];
}

export async function getGeofences(): Promise<Geofence[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.GEOFENCES));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Geofence[];
}
