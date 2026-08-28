/**
 * SentinelOps Mobile — Tracking Service
 *
 * Puerto directo de trackingService.js del proyecto web principal.
 * Persiste las posiciones GPS del guardia en Firestore para que el
 * mapa táctico web pueda leerlas en tiempo real.
 *
 * Colecciones escritas:
 *   - liveGuardPositions/{live_guardId}   → posición actual (leída por el mapa web)
 *   - rondaExecutions/{id}                → gpsTrack + lastPosition (historial)
 */

import {
  doc,
  setDoc,
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

interface PositionMetadata {
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

/**
 * Escribe la posición actual del guardia en `liveGuardPositions`.
 * Esta es la colección que lee el mapa táctico web para mostrar
 * el punto en tiempo real con su color de estado.
 *
 * @param guardId   - UID del guardia
 * @param position  - { lat, lng }
 * @param metadata  - accuracy, heading, speed opcionales
 */
export async function updateLivePosition(
  guardId: string,
  guardCode: string,
  guardName: string,
  position: GeoPoint,
  metadata: PositionMetadata = {},
): Promise<void> {
  try {
    const liveRef = doc(db, COLLECTIONS.LIVE_GUARDS, `live_${guardId}`);

    await setDoc(
      liveRef,
      {
        guardCode,
        guardId,
        guardName,
        location: {
          lat: position.lat,
          lng: position.lng,
        },
        status: 'tracking',
        lastUpdate: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    // Non-blocking — el GPS trail puede continuar aunque este write falle
    console.error(`${LOG_PREFIX} Failed to update live position:`, error);
  }
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

/**
 * Marca al guardia como offline en `liveGuardPositions`.
 * Debe llamarse al completar, cancelar o pausar la ronda.
 *
 * @param guardId - UID del guardia
 */
export async function clearLivePosition(guardId: string): Promise<void> {
  try {
    const liveRef = doc(db, COLLECTIONS.LIVE_GUARDS, `live_${guardId}`);
    await setDoc(
      liveRef,
      {
        guardId,
        status: 'offline',
        location: null,
        lastUpdate: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to clear live position:`, error);
  }
}
