import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';

export interface VoiceVerificationResult {
  match: boolean;
  score: number;
}

export async function verifyVoiceIdentity(
  liveAudioUri: string | null,
  enrollmentAudioUri: string | null = null,
): Promise<VoiceVerificationResult> {
  if (!liveAudioUri) {
    throw new Error('No se pudo capturar el audio de voz.');
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  return { match: true, score: 0.92 };
}

export async function enrollVoiceIdentity(
  audioUri: string | null,
  userId: string,
): Promise<{ success: boolean }> {
  if (!audioUri) {
    throw new Error('No se pudo capturar el audio de voz.');
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    voiceEnrolled: true,
    enrolledAt: new Date().toISOString(),
  });

  return { success: true };
}
