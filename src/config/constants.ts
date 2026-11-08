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

export const MAP_CONFIG = {
  CARTO_API_KEY: process.env.EXPO_PUBLIC_CARTO_API_KEY || 'cb1_50v6_1_ffabf4b0d4e4977aaf5fe926',
  CARTO_VOYAGER_URL:
    process.env.EXPO_PUBLIC_CARTO_TILE_URL ||
    'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_50v6_1_ffabf4b0d4e4977aaf5fe926',
  CARTO_DARK_URL:
    'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_50v6_1_ffabf4b0d4e4977aaf5fe926',
  CARTO_VECTOR_STYLE_URL:
    process.env.EXPO_PUBLIC_CARTO_VECTOR_STYLE_URL ||
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=cb1_50v6_1_ffabf4b0d4e4977aaf5fe926',
  DEFAULT_LAT: Number(process.env.EXPO_PUBLIC_DEFAULT_LAT) || -16.5,
  DEFAULT_LNG: Number(process.env.EXPO_PUBLIC_DEFAULT_LNG) || -68.15,
  DEFAULT_ZOOM: 16,
} as const;

