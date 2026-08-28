import { useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import { useAuthStore } from '@/store/useAuthStore';

const COLLECTION_NAME = COLLECTIONS.GUARD_PRESENCE;

export function useGlobalPresence(executionStatus: string | null = null) {
  const { user, initialized } = useAuthStore();
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const presenceDocId = user?.guardId || user?.uid;
  const guardId = user?.uid;
  const guardName = user?.fullName || user?.email || 'Desconocido';
  const guardCode = user?.guardId || (user?.uid ? user.uid.slice(0, 6).toUpperCase() : 'N/A');

  useEffect(() => {
    if (!initialized || !presenceDocId || !user) return;

    const docRef = doc(db, COLLECTION_NAME, presenceDocId);

    // Escribir presencia inicial (offline o estado actual)
    setDoc(
      docRef,
      {
        guardId,
        guardName,
        guardCode,
        status: executionStatus || 'online',
        lastUpdate: serverTimestamp(),
      },
      { merge: true },
    ).catch((err) => console.error('Error al crear presencia inicial:', err));

    let lastUpdateTimestamp = 0;

    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 3,
          timeInterval: 5000,
        },
        (loc) => {
          const now = Date.now();
          if (now - lastUpdateTimestamp < 5000) return;
          lastUpdateTimestamp = now;

          updateDoc(docRef, {
            'location.lat': loc.coords.latitude,
            'location.lng': loc.coords.longitude,
            lastUpdate: serverTimestamp(),
          }).catch((err) => console.error('Error actualizando ubicación en vivo:', err));
        },
      );
    };

    startWatching();

    // Heartbeat cada 5 segundos para mantener status
    const heartbeatInterval = setInterval(() => {
      setDoc(
        docRef,
        {
          status: executionStatus || 'online',
          lastUpdate: serverTimestamp(),
        },
        { merge: true },
      ).catch((err) => console.error('Error latido de presencia:', err));
    }, 5000);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      clearInterval(heartbeatInterval);
    };
  }, [presenceDocId, guardId, guardName, guardCode, executionStatus, initialized, user]);

  const clearPresence = useCallback(async () => {
    if (!presenceDocId) return;
    try {
      await setDoc(
        doc(db, COLLECTION_NAME, presenceDocId),
        {
          status: 'offline',
          lastUpdate: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('[useGlobalPresence] Error clearing presence:', err);
    }
  }, [presenceDocId]);

  return { clearPresence };
}
