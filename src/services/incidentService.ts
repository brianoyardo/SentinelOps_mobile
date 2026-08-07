import { collection, addDoc, serverTimestamp, type FieldValue } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import { uploadEvidence } from '@/services/appwriteStorage';
import type { Incident, IncidentType, IncidentSeverity } from '@/types';

interface CreateIncidentInput {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  reportedBy: string;
  guardName: string;
  guardCode: string;
  location: { lat: number; lng: number } | null;
  evidenceUris?: Array<{ uri: string; name: string; mimeType: string }>;
  rondaId?: string | null;
  executionId?: string | null;
  routeId?: string | null;
  routeName?: string | null;
  geofenceName?: string | null;
}

export async function createIncident(input: CreateIncidentInput): Promise<string> {
  const evidenceIds: string[] = [];

  if (input.evidenceUris && input.evidenceUris.length > 0) {
    for (const ev of input.evidenceUris) {
      const fileUrl = await uploadEvidence(ev.uri, ev.name, ev.mimeType);
      evidenceIds.push(fileUrl);
    }
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.INCIDENTS), {
    title: input.title,
    description: input.description,
    type: input.type,
    severity: input.severity,
    status: 'open',
    reportedBy: input.reportedBy,
    guardName: input.guardName,
    guardCode: input.guardCode,
    routeName: input.routeName ?? '',
    geofenceName: input.geofenceName ?? '',
    assignedTo: null,
    location: input.location,
    evidenceIds,
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    tags: [],
    rondaId: input.rondaId ?? null,
    executionId: input.executionId ?? null,
    routeId: input.routeId ?? null,
    createdAt: serverTimestamp() as FieldValue,
    updatedAt: serverTimestamp() as FieldValue,
  });

  return docRef.id;
}
