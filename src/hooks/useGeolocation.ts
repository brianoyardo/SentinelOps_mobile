import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import type { GeoPoint } from '@/types';

interface GeolocationState {
  location: GeoPoint | null;
  error: string | null;
  isTracking: boolean;
}

export function useGeolocation(shouldTrack = false) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isTracking: false,
  });
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState((prev) => ({ ...prev, error: 'Permiso de ubicación denegado' }));
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (!shouldTrack) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setState((prev) => ({ ...prev, isTracking: false }));
      return;
    }

    let cancelled = false;

    async function start() {
      const permitted = await requestPermission();
      if (!permitted || cancelled) return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!cancelled) {
        setState({
          location: { lat: loc.coords.latitude, lng: loc.coords.longitude },
          error: null,
          isTracking: true,
        });
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (newLoc) => {
          if (!cancelled) {
            setState({
              location: { lat: newLoc.coords.latitude, lng: newLoc.coords.longitude },
              error: null,
              isTracking: true,
            });
          }
        },
      );

      if (!cancelled) {
        subscriptionRef.current = sub;
      } else {
        sub.remove();
      }
    }

    start();

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [shouldTrack, requestPermission]);

  return state;
}
