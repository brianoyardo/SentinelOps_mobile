import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import type { GeoPoint } from '@/types';

interface GeolocationState {
  position: GeoPoint | null;
  accuracy: number | null;
  error: string | null;
  isTracking: boolean;
}

export function useGeolocation(enableWatch = false) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    accuracy: null,
    error: null,
    isTracking: false,
  });
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const [manualTracking, setManualTracking] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState((prev) => ({ ...prev, error: 'Permiso de ubicación denegado' }));
      return false;
    }
    return true;
  }, []);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setManualTracking(false);
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  const startTracking = useCallback(async () => {
    const permitted = await requestPermission();
    if (!permitted) return;

    setManualTracking(true);

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setState({
      position: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      accuracy: loc.coords.accuracy,
      error: null,
      isTracking: true,
    });

    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
    }

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (newLoc) => {
        setState({
          position: { lat: newLoc.coords.latitude, lng: newLoc.coords.longitude },
          accuracy: newLoc.coords.accuracy,
          error: null,
          isTracking: true,
        });
      },
    );
    subscriptionRef.current = sub;
  }, [requestPermission]);

  const getCurrentPosition = useCallback(async (): Promise<GeoPoint> => {
    const permitted = await requestPermission();
    if (!permitted) throw new Error('GPS requerido');

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  }, [requestPermission]);

  useEffect(() => {
    if (!enableWatch) return;
    startTracking();
    return () => stopTracking();
  }, [enableWatch, startTracking, stopTracking]);

  const shouldTrack = enableWatch || manualTracking;

  useEffect(() => {
    if (!shouldTrack) {
      stopTracking();
    }
  }, [shouldTrack, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    getCurrentPosition,
    isTracking: state.isTracking,
  };
}
