export const RONDA_STATES = {
  PENDING: 'pending',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  LATE: 'late',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
  VALIDATING_VOICE: 'validating_voice',
} as const;

export type RondaState = (typeof RONDA_STATES)[keyof typeof RONDA_STATES];

export const STATE_LABELS: Record<RondaState, string> = {
  [RONDA_STATES.PENDING]: 'Pendiente',
  [RONDA_STATES.AVAILABLE]: 'Disponible',
  [RONDA_STATES.IN_PROGRESS]: 'En Progreso',
  [RONDA_STATES.PAUSED]: 'Pausada',
  [RONDA_STATES.COMPLETED]: 'Completada',
  [RONDA_STATES.LATE]: 'Completada con Retraso',
  [RONDA_STATES.MISSED]: 'No Realizada',
  [RONDA_STATES.CANCELLED]: 'Cancelada',
  [RONDA_STATES.FAILED]: 'Fallida',
  [RONDA_STATES.VALIDATING_VOICE]: 'Validando Voz',
};

export const STATE_COLORS: Record<RondaState, string> = {
  [RONDA_STATES.PENDING]: '#64748b',
  [RONDA_STATES.AVAILABLE]: '#3380ff',
  [RONDA_STATES.IN_PROGRESS]: '#22c55e',
  [RONDA_STATES.PAUSED]: '#f59e0b',
  [RONDA_STATES.COMPLETED]: '#16a34a',
  [RONDA_STATES.LATE]: '#f97316',
  [RONDA_STATES.MISSED]: '#ef4444',
  [RONDA_STATES.CANCELLED]: '#94a3b8',
  [RONDA_STATES.FAILED]: '#dc2626',
  [RONDA_STATES.VALIDATING_VOICE]: '#8b5cf6',
};

const TERMINAL_STATES = new Set<RondaState>([
  RONDA_STATES.COMPLETED,
  RONDA_STATES.LATE,
  RONDA_STATES.MISSED,
  RONDA_STATES.CANCELLED,
  RONDA_STATES.FAILED,
]);

const TRANSITIONS: Record<RondaState, RondaState[]> = {
  [RONDA_STATES.PENDING]: [
    RONDA_STATES.AVAILABLE,
    RONDA_STATES.CANCELLED,
    RONDA_STATES.VALIDATING_VOICE,
  ],
  [RONDA_STATES.AVAILABLE]: [
    RONDA_STATES.IN_PROGRESS,
    RONDA_STATES.MISSED,
    RONDA_STATES.CANCELLED,
    RONDA_STATES.VALIDATING_VOICE,
  ],
  [RONDA_STATES.IN_PROGRESS]: [
    RONDA_STATES.PAUSED,
    RONDA_STATES.COMPLETED,
    RONDA_STATES.LATE,
    RONDA_STATES.FAILED,
    RONDA_STATES.CANCELLED,
  ],
  [RONDA_STATES.PAUSED]: [
    RONDA_STATES.IN_PROGRESS,
    RONDA_STATES.CANCELLED,
    RONDA_STATES.FAILED,
  ],
  [RONDA_STATES.VALIDATING_VOICE]: [
    RONDA_STATES.IN_PROGRESS,
    RONDA_STATES.PENDING,
    RONDA_STATES.FAILED,
  ],
  [RONDA_STATES.COMPLETED]: [],
  [RONDA_STATES.LATE]: [],
  [RONDA_STATES.MISSED]: [],
  [RONDA_STATES.CANCELLED]: [],
  [RONDA_STATES.FAILED]: [],
};

export const RONDA_EVENTS = {
  ASSIGN: 'ronda.assigned',
  MAKE_AVAILABLE: 'ronda.available',
  START: 'ronda.started',
  PAUSE: 'ronda.paused',
  RESUME: 'ronda.resumed',
  COMPLETE: 'ronda.completed',
  COMPLETE_LATE: 'ronda.completed_late',
  MISS: 'ronda.missed',
  CANCEL: 'ronda.cancelled',
  FAIL: 'ronda.failed',
  CHECKPOINT_REACHED: 'checkpoint.reached',
  CHECKPOINT_VALIDATED: 'checkpoint.validated',
  CHECKPOINT_SKIPPED: 'checkpoint.skipped',
  GPS_UPDATE: 'gps.update',
  GEOFENCE_EXIT: 'geofence.exit',
  INCIDENT_REPORTED: 'incident.reported',
  VOICE_START: 'voice.validation_started',
  VOICE_PASS: 'voice.validation_passed',
  VOICE_FAIL: 'voice.validation_failed',
} as const;

export function canTransition(currentState: RondaState, nextState: RondaState): boolean {
  const allowed = TRANSITIONS[currentState];
  if (!allowed) return false;
  return allowed.includes(nextState);
}

export function isTerminalState(state: RondaState): boolean {
  return TERMINAL_STATES.has(state);
}

export function isActiveState(state: RondaState): boolean {
  return state === RONDA_STATES.IN_PROGRESS || state === RONDA_STATES.PAUSED;
}

export function canBeStarted(state: RondaState): boolean {
  return state === RONDA_STATES.AVAILABLE || state === RONDA_STATES.VALIDATING_VOICE;
}

export function requiresVoiceValidation(state: RondaState): boolean {
  return state === RONDA_STATES.VALIDATING_VOICE;
}
