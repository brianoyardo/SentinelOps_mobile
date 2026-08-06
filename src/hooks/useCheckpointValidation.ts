import { useState, useCallback, useEffect } from 'react';
import { haversineDistance } from '@/utils/haversine';
import type { GeoPoint } from '@/types';

interface CheckpointItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius?: number;
  order?: number;
}

interface ValidationResult {
  canComplete: boolean;
  checkpointId?: string;
  reason?: string;
  results?: {
    proximity: { valid: boolean; distance?: number; message?: string };
    order: { valid: boolean; message?: string };
    gps: { valid: boolean; message?: string };
    geofence: { valid: boolean; message?: string };
  };
  progress?: { completed: number; total: number; percentage: number };
}

interface UseCheckpointValidationOptions {
  checkpoints?: CheckpointItem[];
  checkpointOrder?: string[];
  initialCompletedIds?: string[];
  geofencePolygon?: GeoPoint[] | null;
}

export function useCheckpointValidation(options: UseCheckpointValidationOptions = {}) {
  const {
    checkpoints = [],
    checkpointOrder = [],
    initialCompletedIds = [],
    geofencePolygon = null,
  } = options;

  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (initialCompletedIds && initialCompletedIds.length > 0) {
      setCompletedIds(initialCompletedIds);
    }
  }, [initialCompletedIds]);

  function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
    if (!polygon || polygon.length === 0) return true;
    let isInside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) isInside = !isInside;
    }
    return isInside;
  }

  const validate = useCallback(
    (checkpointId: string, guardPosition: GeoPoint, gpsAccuracy?: number): ValidationResult => {
      const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);

      if (!checkpoint) {
        const result: ValidationResult = {
          canComplete: false,
          reason: 'Checkpoint no encontrado',
        };
        setLastValidation(result);
        return result;
      }

      const cpPosition: GeoPoint = { lat: checkpoint.lat, lng: checkpoint.lng };
      const radius = checkpoint.radius ?? 50;

      const distance = haversineDistance(
        guardPosition.lat,
        guardPosition.lng,
        cpPosition.lat,
        cpPosition.lng,
      );
      const proximity = {
        valid: distance <= radius,
        distance,
        message:
          distance <= radius
            ? `A ${Math.round(distance)} m del checkpoint`
            : `Fuera de rango: ${Math.round(distance)} m (máx ${radius} m)`,
      };

      const expectedNext = checkpointOrder.find((id) => !completedIds.includes(id));
      const order = {
        valid: expectedNext === checkpointId || completedIds.length === 0,
        message:
          expectedNext === checkpointId
            ? 'En orden'
            : 'Debe completar los checkpoints en orden',
      };

      const gps = {
        valid: (gpsAccuracy ?? 0) <= 50,
        message: (gpsAccuracy ?? 0) <= 50 ? 'GPS OK' : 'Precisión GPS insuficiente',
      };

      const geofence = geofencePolygon
        ? {
            valid: isPointInPolygon(guardPosition, geofencePolygon),
            message: isPointInPolygon(guardPosition, geofencePolygon)
              ? 'Dentro de geocerca'
              : 'Fuera de la geocerca asignada',
          }
        : { valid: true, message: 'Sin geocerca' };

      const canComplete = proximity.valid && order.valid && gps.valid;

      const result: ValidationResult = {
        canComplete,
        checkpointId,
        results: { proximity, order, gps, geofence },
        reason: !canComplete
          ? [proximity.message, order.message, gps.message, geofence.message]
              .filter(Boolean)
              .join(' | ')
          : undefined,
      };

      setLastValidation(result);
      return result;
    },
    [checkpoints, checkpointOrder, completedIds, geofencePolygon],
  );

  const markCompleted = useCallback((checkpointId: string) => {
    setCompletedIds((prev) => [...prev, checkpointId]);
  }, []);

  const reset = useCallback(() => {
    setCompletedIds([]);
    setLastValidation(null);
  }, []);

  const nextCheckpoint = useCallback(() => {
    const completedSet = new Set(completedIds);
    const nextId = checkpointOrder.find((id) => !completedSet.has(id));
    if (!nextId) return null;
    return checkpoints.find((cp) => cp.id === nextId) ?? null;
  }, [completedIds, checkpointOrder, checkpoints]);

  const totalCheckpoints = checkpoints.length;
  const completedCount = completedIds.length;
  const percentage = totalCheckpoints > 0 ? Math.round((completedCount / totalCheckpoints) * 100) : 0;
  const isAllComplete = completedCount === totalCheckpoints && totalCheckpoints > 0;

  return {
    completedIds,
    completedCount,
    totalCheckpoints,
    progress: { completed: completedCount, total: totalCheckpoints, percentage },
    isAllComplete,
    lastValidation,
    nextCheckpoint: nextCheckpoint(),
    validate,
    markCompleted,
    reset,
  };
}
