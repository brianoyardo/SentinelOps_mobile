/**
 * SentinelOps Mobile — Tracking Service
 *
 * Persiste las posiciones GPS del guardia en Firestore.
 * Colecciones escritas:
 *   - rondaExecutions/{id} ? gpsTrack + lastPosition (historial)
 */

import {
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';

const LOG_PREFIX = '[TrackingService]';

interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Agrega un punto al trail GPS del execution en Firestore.
 * Actualiza también `lastPosition` en el documento raíz del execution.
 *
 * @param executionId - ID del documento de ejecución
 * @param position    - { lat, lng }
 * @param accuracy    - precisión GPS en metros
 */
export async function appendTrackPoint(
  executionId: string,
  position: GeoPoint,
  accuracy: number | null = null,
): Promise<void> {
  try {
    const execRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);

    const trackPoint = {
      lat: position.lat,
      lng: position.lng,
      accuracy,
      timestamp: Date.now(),
    };

    await updateDoc(execRef, {
      gpsTrack: arrayUnion(trackPoint),
      lastPosition: trackPoint,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking
    console.error(`${LOG_PREFIX} Failed to append track point:`, error);
  }
}
