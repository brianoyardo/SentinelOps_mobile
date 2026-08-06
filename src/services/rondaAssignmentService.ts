import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import type { RondaAssignment } from '@/types';

export function subscribeToGuardAssignments(
  guardId: string,
  onData: (assignments: RondaAssignment[]) => void,
): () => void {
  const q = query(
    collection(db, COLLECTIONS.RONDA_ASSIGNMENTS),
    where('guardId', '==', guardId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const assignments = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RondaAssignment[];
      onData(assignments);
    },
    (err) => {
      console.error('[rondaAssignmentService] Error:', err);
      onData([]);
    },
  );
}

export async function getAssignment(assignmentId: string): Promise<RondaAssignment | null> {
  const docRef = doc(db, COLLECTIONS.RONDA_ASSIGNMENTS, assignmentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as RondaAssignment;
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: RondaAssignment['status'],
  extra?: Record<string, unknown>,
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.RONDA_ASSIGNMENTS, assignmentId);
  await updateDoc(docRef, {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}
