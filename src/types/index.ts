import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'operations_chief' | 'supervisor' | 'guard';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  clientId: string | null;
  locationId: string | null;
  deviceToken: string | null;
  voiceProfileId: string | null;
  biometricEnrolled: boolean;
  voicePassphrase: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  guardId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin: Timestamp;
  lastVoiceScore: number | null;
  lastVoiceVerified: boolean | null;
  lastVoiceVerifiedAt: Timestamp | null;
}

export interface Ronda {
  id: string;
  name: string;
  description?: string;
  routeId: string;
  checkpointIds: string[];
  estimatedDuration?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  strictTimeSync?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RondaAssignmentStatus =
  | 'pending'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'late'
  | 'missed'
  | 'cancelled'
  | 'failed'
  | 'validating_voice';

export interface RondaAssignment {
  id: string;
  rondaId: string;
  guardId: string;
  guardName: string;
  guardCode: string;
  routeId: string;
  routeName: string;
  geofenceName: string;
  scheduledStart: number;
  scheduledEnd: number;
  assignedBy: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: RondaAssignmentStatus;
  executionId: string | null;
  notes: string;
  strictTimeSync: boolean;
  actualStart?: Timestamp;
  actualEnd?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GpsPoint extends GeoPoint {
  timestamp: number;
  accuracy?: number;
}

export type ExecutionStatus =
  | 'pending'
  | 'available'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'late'
  | 'missed'
  | 'cancelled'
  | 'failed'
  | 'validating_voice';

export type PatrolType = 'A_PIE' | 'MOTORIZADO';
export type ShiftType = 'DIURNO' | 'NOCTURNO' | 'PRIMER_TURNO' | 'SEGUNDO_TURNO';
export type ReportState = 'S_N' | 'C_N' | 'PENDIENTE' | 'INCOMPLETO';

export interface RondaExecution {
  id: string;
  assignmentId: string;
  rondaId: string;
  routeId: string;
  guardId: string;
  guardName: string;
  guardCode: string;
  routeName: string;
  geofenceName: string;
  status: ExecutionStatus;
  checkpointIds: string[];
  completedCheckpoints: string[];
  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  startPosition: GeoPoint | null;
  lastPosition: GpsPoint | null;
  gpsTrack: GpsPoint[];
  totalDistance: number;
  events: RondaEvent[];
  clientId: string | null;
  patrolType: PatrolType;
  vehicleId: string | null;
  trackerId: string | null;
  shift: ShiftType;
  reportState: ReportState;
  voiceValidated: boolean;
  voiceMatchScore: number | null;
  audioEvidenceUrl: string | null;
  voicePassphrase: string | null;
  startedLate: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RondaEvent {
  type: string;
  timestamp: number;
  position?: GeoPoint;
  details?: Record<string, unknown>;
}

export type IncidentType = 'security' | 'maintenance' | 'emergency' | 'observation';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus =
  | 'open'
  | 'in_progress'
  | 'investigating'
  | 'escalated'
  | 'resolved'
  | 'closed';

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy: string;
  guardName: string;
  guardCode: string;
  routeName: string;
  geofenceName: string;
  assignedTo: string | null;
  location: GeoPoint | null;
  evidenceIds: string[];
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: Timestamp | null;
  tags: string[];
  rondaId: string | null;
  executionId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GeofenceType = 'restricted' | 'patrol' | 'monitoring';
export type SpatialStatus = 'active' | 'inactive';

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[][] | number[][][] | number[];
  coordinatesFirestore?: GeoPoint[];
}

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  status: SpatialStatus;
  geometry: GeoJSONGeometry;
  routeId: string | null;
  geometryVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  status: SpatialStatus;
  qrCode: string | null;
  radius: number;
  geometry: GeoJSONGeometry;
  routeId: string | null;
  order: number;
  geometryVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  status: SpatialStatus;
  geometry: GeoJSONGeometry;
  geometryVersion: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GuardPresenceStatus = 'online' | 'in_progress' | 'validating_voice' | 'offline';

export interface GuardPresence {
  guardId: string;
  guardName: string;
  guardCode: string;
  status: GuardPresenceStatus;
  location: GeoPoint | null;
  lastUpdate: Timestamp;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface Attendance {
  guardId: string;
  guardName: string;
  guardCode: string;
  date: string;
  clockIn: Timestamp;
  clockOut: Timestamp | null;
  shiftStart: string;
  shiftEnd: string;
  status: AttendanceStatus;
  createdAt: Timestamp;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  initialized: boolean;
}
