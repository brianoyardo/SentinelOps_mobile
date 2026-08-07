import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import { RONDA_STATES, RONDA_EVENTS } from '@/utils/rondaStateMachine';
import { updateAssignmentStatus } from '@/services/rondaAssignmentService';
import type { GeoPoint, RondaExecution, RondaEvent } from '@/types';

interface StartExecutionInput {
  assignmentId: string;
  rondaId: string;
  routeId: string;
  guardId: string;
  guardName?: string;
  guardCode?: string;
  routeName?: string;
  geofenceName?: string;
  checkpointIds: string[];
  startPosition: GeoPoint;
  initialState?: RondaExecution['status'];
  patrolType?: string;
  vehicleId?: string | null;
  trackerId?: string | null;
  shift?: string;
  clientId?: string | null;
  voicePassphrase?: string;
  startedLate?: boolean;
}

export async function startExecution(input: StartExecutionInput): Promise<string> {
  const initialState = input.initialState ?? RONDA_STATES.IN_PROGRESS;
  const guardCodeClean = input.guardCode || 'guard';
  const execId = `execution_${guardCodeClean}_${Date.now()}`;
  const execRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, execId);

  const initialEvent: RondaEvent = {
    type: initialState === RONDA_STATES.VALIDATING_VOICE ? RONDA_EVENTS.VOICE_START : RONDA_EVENTS.START,
    timestamp: Date.now(),
    position: input.startPosition,
    details: { assignmentId: input.assignmentId },
  };

  await setDoc(execRef, {
    assignmentId: input.assignmentId,
    rondaId: input.rondaId,
    routeId: input.routeId,
    guardId: input.guardId,
    guardName: input.guardName ?? '',
    guardCode: input.guardCode ?? '',
    routeName: input.routeName ?? '',
    geofenceName: input.geofenceName ?? '',
    status: initialState,
    checkpointIds: input.checkpointIds,
    completedCheckpoints: [],
    startedAt: initialState === RONDA_STATES.IN_PROGRESS ? serverTimestamp() : null,
    startPosition: input.startPosition,
    lastPosition: input.startPosition,
    gpsTrack: [{ ...input.startPosition, timestamp: Date.now() }],
    endedAt: null,
    totalDistance: 0,
    events: [initialEvent],
    clientId: input.clientId ?? null,
    patrolType: input.patrolType ?? 'A_PIE',
    vehicleId: input.vehicleId ?? null,
    trackerId: input.trackerId ?? null,
    shift: input.shift ?? 'DIURNO',
    reportState: 'PENDIENTE',
    voiceValidated: false,
    voiceMatchScore: null,
    audioEvidenceUrl: null,
    voicePassphrase: input.voicePassphrase ?? null,
    startedLate: input.startedLate ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateAssignmentStatus(input.assignmentId, initialState, {
    executionId: execRef.id,
    actualStart: serverTimestamp(),
  });

  return execRef.id;
}

export async function getExecution(executionId: string): Promise<RondaExecution | null> {
  const docRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RondaExecution;
}

export async function findActiveExecutionByAssignment(
  assignmentId: string,
): Promise<RondaExecution | null> {
  const q = query(
    collection(db, COLLECTIONS.RONDA_EXECUTIONS),
    where('assignmentId', '==', assignmentId),
    where(
      'status',
      'in',
      [RONDA_STATES.IN_PROGRESS, RONDA_STATES.PAUSED, RONDA_STATES.VALIDATING_VOICE],
    ),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const first = snapshot.docs[0];
  return { id: first.id, ...first.data() } as RondaExecution;
}

export async function abortVoiceSession(executionId: string, assignmentId?: string | null): Promise<void> {
  if (!executionId) return;
  try {
    const execRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
    await updateDoc(execRef, {
      status: RONDA_STATES.PENDING,
      updatedAt: serverTimestamp(),
    });
    if (assignmentId) {
      await updateAssignmentStatus(assignmentId, RONDA_STATES.AVAILABLE, { executionId: null });
    }
  } catch (e) {
    console.warn('[RondaExecution] Could not revert voice state:', e);
  }
}

export async function transitionExecution(
  executionId: string,
  currentStatus: string,
  nextStatus: string,
  context?: { position?: GeoPoint | null; reason?: string; completedAt?: number },
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
  const event: RondaEvent = {
    type: `${currentStatus}_${nextStatus}`,
    timestamp: Date.now(),
    position: context?.position ?? null,
    details: { previousState: currentStatus, ...(context?.reason ? { reason: context.reason } : {}) },
  };

  const updates: Record<string, unknown> = {
    status: nextStatus,
    events: arrayUnion(event),
    updatedAt: serverTimestamp(),
  };

  if ([RONDA_STATES.COMPLETED, RONDA_STATES.LATE, RONDA_STATES.FAILED, RONDA_STATES.CANCELLED].includes(nextStatus as never)) {
    updates.endedAt = serverTimestamp();
  }

  await updateDoc(docRef, updates);

  const execSnap = await getDoc(docRef);
  if (execSnap.exists()) {
    const { assignmentId } = execSnap.data();
    if (assignmentId) {
      await updateAssignmentStatus(assignmentId, nextStatus as RondaExecution['status']);
    }
  }
}

export async function registerCheckpoint(
  executionId: string,
  checkpointId: string,
  position: GeoPoint,
  distanceMeters: number,
  notes = '',
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
  const event: RondaEvent = {
    type: RONDA_EVENTS.CHECKPOINT_VALIDATED,
    timestamp: Date.now(),
    position,
    details: { checkpointId, distanceMeters },
  };

  await updateDoc(docRef, {
    completedCheckpoints: arrayUnion(checkpointId),
    lastPosition: { ...position, timestamp: Date.now() },
    events: arrayUnion(event),
    updatedAt: serverTimestamp(),
  });

  const logId = `log_${executionId}_${checkpointId}_${Date.now()}`;
  await setDoc(doc(db, COLLECTIONS.CHECKPOINT_LOGS, logId), {
    executionId,
    checkpointId,
    position,
    distance: distanceMeters,
    notes,
    guardId: null,
    timestamp: Date.now(),
    createdAt: serverTimestamp(),
  });
}

export async function updateExecutionPosition(
  executionId: string,
  position: GeoPoint,
  accuracy: number | null,
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
  await updateDoc(docRef, {
    lastPosition: { lat: position.lat, lng: position.lng, timestamp: Date.now(), accuracy },
    updatedAt: serverTimestamp(),
  });
}

export async function completeExecution(
  executionId: string,
  currentStatus: string,
  position: GeoPoint | null,
): Promise<void> {
  const execRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
  const execSnap = await getDoc(execRef);
  if (execSnap.exists()) {
    const { assignmentId } = execSnap.data();
    if (assignmentId) {
      const assignRef = doc(db, COLLECTIONS.RONDA_ASSIGNMENTS, assignmentId);
      await updateDoc(assignRef, {
        actualEnd: serverTimestamp(),
      });
    }
  }

  await transitionExecution(executionId, currentStatus, RONDA_STATES.COMPLETED, {
    position,
    completedAt: Date.now(),
  });
}

export async function recordVoiceValidation(
  executionId: string,
  data: { matchScore: number; passed: boolean; position: GeoPoint | null },
): Promise<void> {
  const execRef = doc(db, COLLECTIONS.RONDA_EXECUTIONS, executionId);
  const execSnap = await getDoc(execRef);
  if (!execSnap.exists()) {
    throw new Error(`Execution ${executionId} not found`);
  }

  const { assignmentId, status: currentStatus } = execSnap.data();
  const nextState = data.passed ? RONDA_STATES.IN_PROGRESS : RONDA_STATES.PENDING;

  await transitionExecution(executionId, currentStatus, nextState, {
    position: data.position,
  });

  const updates: Record<string, unknown> = {
    voiceValidated: data.passed,
    voiceMatchScore: data.matchScore,
    events: arrayUnion({
      type: data.passed ? RONDA_EVENTS.VOICE_PASS : RONDA_EVENTS.VOICE_FAIL,
      timestamp: Date.now(),
      position: data.position ?? null,
      details: { matchScore: data.matchScore, passed: data.passed },
    }),
    updatedAt: serverTimestamp(),
  };

  if (data.passed) {
    updates.startedAt = serverTimestamp();
  }

  await updateDoc(execRef, updates);

  if (data.passed && assignmentId) {
    await updateAssignmentStatus(assignmentId, RONDA_STATES.IN_PROGRESS);
  }
}

export async function getExecutionTelemetry(executionId: string): Promise<Array<{ lat: number; lng: number; timestamp: number }>> {
  const chunksRef = collection(db, COLLECTIONS.RONDA_EXECUTIONS, executionId, 'telemetryChunks');
  const q = query(chunksRef, orderBy('startedAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.flatMap((d) => d.data().points || []);
}
