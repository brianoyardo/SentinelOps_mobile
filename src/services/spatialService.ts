import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import type { Route, Checkpoint, Geofence } from '@/types';

type FirestorePoint = { lng: number; lat: number };

function deserializeGeometry<T>(geometry: T | null | undefined): T | null | undefined {
  if (!geometry || typeof geometry !== 'object') return geometry;
  const g = geometry as Record<string, unknown>;
  const cf = g.coordinatesFirestore as FirestorePoint | FirestorePoint[] | null | undefined;
  if (!cf) return geometry;

  let coordinates: unknown = null;
  if (g.type === 'LineString' && Array.isArray(cf)) {
    coordinates = (cf as FirestorePoint[]).map((p) => [p.lng, p.lat]);
  } else if (g.type === 'Polygon' && Array.isArray(cf)) {
    coordinates = [(cf as FirestorePoint[]).map((p) => [p.lng, p.lat])];
  } else if (g.type === 'Point' && !Array.isArray(cf)) {
    coordinates = [cf.lng, cf.lat];
  }

  return { ...g, coordinates } as T;
}

export async function getRoute(routeId: string): Promise<Route | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.ROUTES, routeId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    geometry: deserializeGeometry(data.geometry),
  } as Route;
}

export async function getCheckpointsByRoute(routeId: string): Promise<Checkpoint[]> {
  const q = query(
    collection(db, COLLECTIONS.CHECKPOINTS),
    where('routeId', '==', routeId),
    orderBy('order', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, geometry: deserializeGeometry(data.geometry) } as Checkpoint;
  });
}

export async function getGeofences(): Promise<Geofence[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.GEOFENCES));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, geometry: deserializeGeometry(data.geometry) } as Geofence;
  });
}
export async function getGeofenceByRoute(routeId: string): Promise<Geofence | null> {
  // 1. Intentar query directo
  const q = query(collection(db, COLLECTIONS.GEOFENCES), where('routeId', '==', routeId));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data(), geometry: deserializeGeometry(d.data().geometry) } as Geofence;
  }
  // 2. Fallback: buscar en memoria (a veces routeId es referencial o fallan indices)
  const all = await getGeofences();
  const found = all.find(g => g.routeId === routeId);
  return found || null;
}
