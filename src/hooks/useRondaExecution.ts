import { useState, useCallback, useEffect, useRef } from 'react';
import {
  startExecution,
  registerCheckpoint,
  completeExecution,
  updateExecutionPosition,
  transitionExecution,
} from '@/services/rondaExecutionService';
import { updateLivePosition, appendTrackPoint, clearLivePosition } from '@/services/trackingService';
import { useRondaTimer } from '@/hooks/useRondaTimer';
import { useCheckpointValidation } from '@/hooks/useCheckpointValidation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { RONDA_STATES, isActiveState, isTerminalState, type RondaState } from '@/utils/rondaStateMachine';
import { POSITION_SYNC_INTERVAL } from '@/config/constants';
import { getN8nWebhookUrl } from '@/config/n8n';
import type { GeoPoint } from '@/types';

const MOVEMENT_THRESHOLD_M = 15;
const INACTIVITY_THRESHOLD_MS = 30_000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

interface CheckpointInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius?: number;
  order?: number;
}

interface RondaExecutionOptions {
  assignmentId: string;
  rondaId: string;
  routeId: string;
  guardId: string;
  guardName?: string;
  guardCode?: string;
  geofenceName?: string;
  checkpoints?: CheckpointInput[];
  scheduledEnd?: number | null;
  executionId?: string | null;
  geofencePolygon?: GeoPoint[] | null;
  initialCompletedIds?: string[];
  initialTrail?: GeoPoint[];
}

export function useRondaExecution(options: RondaExecutionOptions) {
  const {
    assignmentId,
    rondaId,
    routeId,
    guardId,
    guardName = 'Desconocido',
    guardCode = 'SIN-CODIGO',
    geofenceName = 'Geocerca no identificada',
    checkpoints = [],
    scheduledEnd = null,
    executionId: preExistingExecutionId = null,
    geofencePolygon = null,
    initialCompletedIds = [],
    initialTrail = [],
  } = options;

  const [executionId, setExecutionId] = useState<string | null>(preExistingExecutionId);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string>(
    preExistingExecutionId ? RONDA_STATES.IN_PROGRESS : RONDA_STATES.AVAILABLE,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trail, setTrail] = useState<GeoPoint[]>(initialTrail);

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestGeoRef = useRef({ position: null as GeoPoint | null, accuracy: null as number | null });

  const checkpointOrder = checkpoints.map((cp) => cp.id);

  const geo = useGeolocation(false);
  const timer = useRondaTimer({
    scheduledEnd,
    startTime: startedAt,
    isRunning: isActiveState(status as RondaState),
  });
  const validation = useCheckpointValidation({
    checkpoints,
    checkpointOrder,
    geofencePolygon,
    initialCompletedIds,
  });

  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startPos = await geo.getCurrentPosition();

      const execId = await startExecution({
        assignmentId,
        rondaId,
        routeId,
        guardId,
        guardName,
        guardCode,
        geofenceName,
        checkpointIds: checkpointOrder,
        startPosition: startPos,
      });

      setExecutionId(execId);
      setStartedAt(Date.now());
      setStatus(RONDA_STATES.IN_PROGRESS);
      geo.startTracking();
      setTrail([startPos]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar ronda');
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, rondaId, routeId, guardId, guardName, guardCode, geofenceName, checkpointOrder, geo]);

  const startWithExecutionId = useCallback(
    async (existingExecId: string) => {
      setExecutionId(existingExecId);
      setStartedAt(Date.now());
      setStatus(RONDA_STATES.IN_PROGRESS);

      try {
        const pos = await geo.getCurrentPosition();
        geo.startTracking();
        setTrail((prev) => (prev.length ? prev : [pos]));
        updateExecutionPosition(existingExecId, pos, geo.accuracy).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'GPS no disponible');
      }
    },
    [geo],
  );

  const finishRonda = useCallback(async () => {
    if (!executionId) return;
    try {
      geo.stopTracking();
      await completeExecution(executionId, status, geo.position);
      setStatus(RONDA_STATES.COMPLETED);
      clearLivePosition(guardId); // Marca guardia como offline en mapa web
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar ronda');
    }
  }, [executionId, status, geo, guardId]);

  const registerCheckpointHit = useCallback(
    async (checkpointId: string) => {
      if (!executionId || !geo.position) {
        const reason = !executionId ? 'No hay executionId activo' : 'GPS no disponible';
        setError(reason);
        return { success: false, reason };
      }

      const cp = checkpoints.find((c) => c.id === checkpointId);
      if (!cp) {
        const reason = `Checkpoint ID "${checkpointId}" no existe en la lista`;
        setError(reason);
        return { success: false, reason };
      }

      const result = validation.validate(checkpointId, geo.position, geo.accuracy ?? undefined);

      if (!result.canComplete) {
        setError(result.reason ?? 'Validación fallida');
        return { success: false, validation: result };
      }

      try {
        const distance = result.results?.proximity.distance ?? 0;
        await registerCheckpoint(executionId, checkpointId, geo.position, distance);
        validation.markCompleted(checkpointId);
        setError(null);
        return { success: true, validation: result };
      } catch (err) {
        const message =
          err && typeof err === 'object' && 'code' in err && err.code === 'permission-denied'
            ? 'Error de permisos. Contacte al administrador.'
            : err instanceof Error
              ? `Error registrando checkpoint: ${err.message}`
              : 'Error desconocido';
        setError(message);
        return { success: false, reason: message };
      }
    },
    [executionId, geo.position, geo.accuracy, validation, checkpoints],
  );

  const pause = useCallback(async () => {
    if (!executionId) return;
    try {
      await transitionExecution(executionId, status, RONDA_STATES.PAUSED, { position: geo.position });
      setStatus(RONDA_STATES.PAUSED);
      geo.stopTracking();
      clearLivePosition(guardId); // Pausa: quitar del mapa web
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al pausar');
    }
  }, [executionId, status, geo, guardId]);

  const resume = useCallback(async () => {
    if (!executionId) return;
    try {
      await transitionExecution(executionId, status, RONDA_STATES.IN_PROGRESS, { position: geo.position });
      setStatus(RONDA_STATES.IN_PROGRESS);
      geo.startTracking();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reanudar');
    }
  }, [executionId, status, geo]);

  const cancel = useCallback(async (reason = '') => {
    if (!executionId) return;
    try {
      await transitionExecution(executionId, status, RONDA_STATES.CANCELLED, {
        position: geo.position,
        reason,
      });
      setStatus(RONDA_STATES.CANCELLED);
      geo.stopTracking();
      clearLivePosition(guardId); // Cancelación: quitar del mapa web
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar');
    }
  }, [executionId, status, geo, guardId]);

  useEffect(() => {
    latestGeoRef.current = { position: geo.position, accuracy: geo.accuracy };
  }, [geo.position, geo.accuracy]);

  useEffect(() => {
    if (status === RONDA_STATES.IN_PROGRESS && geo.position) {
      setTrail((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.lat === geo.position!.lat && last.lng === geo.position!.lng) return prev;
        return [...prev.slice(-999), geo.position!];
      });
    }
  }, [status, geo.position]);

  useEffect(() => {
    if (status !== RONDA_STATES.IN_PROGRESS || !executionId) return;

    syncIntervalRef.current = setInterval(() => {
      const { position, accuracy } = latestGeoRef.current;
      if (position) {
        // 1. Actualiza el documento de ejecución (status interno)
        updateExecutionPosition(executionId, position, accuracy).catch(() => {});
        // 2. Escribe en liveGuardPositions → leída por el mapa táctico web
        updateLivePosition(guardId, guardCode, guardName, position, { accuracy: accuracy ?? undefined });
        // 3. Agrega punto al trail GPS del execution en Firestore
        appendTrackPoint(executionId, position, accuracy);
      }
    }, POSITION_SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    };
  }, [status, executionId, guardId]);

  const buildPayload = useCallback(
    (tipoEvento: string, extras: Record<string, unknown> = {}, currentLat: number, currentLng: number) => ({
      tipoEvento,
      nombreGuardia: guardName,
      codigoGuardia: guardCode,
      nombreGeocerca: geofenceName,
      horaExacta: new Date().toLocaleString('es-BO'),
      coordenadas: { lat: currentLat, lng: currentLng },
      ...extras,
    }),
    [guardName, guardCode, geofenceName],
  );

  const fireWebhook = useCallback((payload: Record<string, unknown>) => {
    fetch(getN8nWebhookUrl('alerta'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => console.warn('[Alertas] Webhook falló:', err));
  }, []);

  const isOutdoorsRef = useRef(false);
  const lastMoveCoordsRef = useRef<GeoPoint | null>(null);
  const lastMoveTimeRef = useRef<number | null>(null);
  const inactivityAlertFiredRef = useRef(false);

  useEffect(() => {
    if (status !== RONDA_STATES.IN_PROGRESS || !geo.position) return;

    const currentLat = geo.position.lat;
    const currentLng = geo.position.lng;

    if (geofencePolygon && geofencePolygon.length > 0) {
      const isInside = isPointInPolygon(geo.position, geofencePolygon);
      if (!isInside && !isOutdoorsRef.current) {
        isOutdoorsRef.current = true;
        fireWebhook(buildPayload('Abandono de Geocerca', {}, currentLat, currentLng));
      } else if (isInside && isOutdoorsRef.current) {
        isOutdoorsRef.current = false;
      }
    }

    if (!lastMoveCoordsRef.current) {
      lastMoveCoordsRef.current = { lat: currentLat, lng: currentLng };
      lastMoveTimeRef.current = Date.now();
      return;
    }

    const distanceMoved = haversineDistance(
      lastMoveCoordsRef.current.lat,
      lastMoveCoordsRef.current.lng,
      currentLat,
      currentLng,
    );

    if (distanceMoved > MOVEMENT_THRESHOLD_M) {
      lastMoveCoordsRef.current = { lat: currentLat, lng: currentLng };
      lastMoveTimeRef.current = Date.now();
      inactivityAlertFiredRef.current = false;
    } else {
      const timeElapsed = Date.now() - (lastMoveTimeRef.current ?? Date.now());
      if (timeElapsed > INACTIVITY_THRESHOLD_MS && !inactivityAlertFiredRef.current) {
        inactivityAlertFiredRef.current = true;
        fireWebhook(
          buildPayload(
            'Inactividad Prolongada',
            { tiempoInactivoSegundos: Math.floor(timeElapsed / 1000) },
            currentLat,
            currentLng,
          ),
        );
      }
    }
  }, [status, geo.position, geofencePolygon, buildPayload, fireWebhook]);

  return {
    executionId,
    status,
    isActive: isActiveState(status as RondaState),
    isTerminal: isTerminalState(status as RondaState),
    isPaused: status === RONDA_STATES.PAUSED,
    error,
    isLoading,
    position: geo.position,
    accuracy: geo.accuracy,
    isTracking: geo.isTracking,
    timer,
    validation,
    nextCheckpoint: validation.nextCheckpoint,
    progress: validation.progress,
    trail,
    start,
    startWithExecutionId,
    pause,
    resume,
    finishRonda,
    cancel,
    registerCheckpointHit,
  };
}
