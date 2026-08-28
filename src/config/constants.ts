export const COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  CLIENTS: 'clients',
  LOCATIONS: 'locations',
  ROUTES: 'routes',
  CHECKPOINTS: 'checkpoints',
  GEOFENCES: 'geofences',
  RONDAS: 'rondas',
  RONDA_ASSIGNMENTS: 'rondaAssignments',
  RONDA_EXECUTIONS: 'rondaExecutions',
  CHECKPOINT_LOGS: 'checkpointLogs',
  INCIDENTS: 'incidents',
  NOTIFICATIONS: 'notifications',
  ATTENDANCE: 'attendance',
  DEVICES: 'devices',
  ACTIVITY_LOGS: 'activityLogs',
  GUARD_PRESENCE: 'guardPresence',
  LIVE_GUARDS: 'guardPresence', // Alineado con Firestore rules match /guardPresence
} as const;


export const SPATIAL_COLLECTIONS = {
  ROUTES: 'routes',
  GEOFENCES: 'geofences',
  CHECKPOINTS: 'checkpoints',
} as const;

export const PATROL_TYPES = {
  A_PIE: 'A_PIE',
  MOTORIZADO: 'MOTORIZADO',
} as const;

export const SHIFT_TYPES = {
  DIURNO: 'DIURNO',
  NOCTURNO: 'NOCTURNO',
  PRIMER_TURNO: 'PRIMER_TURNO',
  SEGUNDO_TURNO: 'SEGUNDO_TURNO',
} as const;

export const VOICE_PASSPHRASES = [
  'Yo confirmo mi identidad biométrica para el sistema SentinelOps',
  'La seguridad del perímetro norte está bajo mi responsabilidad',
  'Autorizo el registro de mi voz para el sistema de vigilancia',
] as const;

export const POSITION_SYNC_INTERVAL = 5000;
