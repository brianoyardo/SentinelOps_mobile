import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { COLLECTIONS } from '@/config/constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const VOICE_API_URL = process.env.EXPO_PUBLIC_VOICE_API_URL || 'http://localhost:8000';
const ENROLLMENT_FILE = `${FileSystem.documentDirectory}enrolledVoice.m4a`;

export interface VoiceVerificationResult {
  match: boolean;
  score: number;
}

const ensureFileUrl = (uri: string) => (uri.startsWith('file://') ? uri : `file://${uri}`);

export async function verifyVoiceIdentity(
  liveAudioUri: string | null,
  enrollmentAudioUri: string | null = null,
): Promise<VoiceVerificationResult> {
  if (!liveAudioUri) {
    throw new Error('No se pudo capturar el audio de voz.');
  }

  const fileInfo = await FileSystem.getInfoAsync(ENROLLMENT_FILE);
  if (!fileInfo.exists) {
    throw new Error('No se encontró el perfil de voz guardado en este dispositivo. Debe enrolarse nuevamente.');
  }

  const finalLiveUri = ensureFileUrl(liveAudioUri);
  const finalEnrolledUri = ensureFileUrl(ENROLLMENT_FILE);

  const formData = new FormData();
  formData.append('live_audio', {
    uri: finalLiveUri,
    name: 'live_audio.m4a',
    type: 'audio/m4a',
  } as any);
  
  formData.append('enrollment_audio', {
    uri: finalEnrolledUri,
    name: 'enrollment_audio.m4a',
    type: 'audio/m4a',
  } as any);

  try {
    const response = await fetch(`${VOICE_API_URL}/verify-voice/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor de IA: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || String(error));
  }
}

export async function enrollVoiceIdentity(
  audioUri: string | null,
  userId: string,
): Promise<{ success: boolean }> {
  if (!audioUri) {
    throw new Error('No se pudo capturar el audio de voz.');
  }

  const finalUri = ensureFileUrl(audioUri);

  // Guardar copia local del enrolamiento
  await FileSystem.copyAsync({
    from: finalUri,
    to: ENROLLMENT_FILE,
  });

  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    voiceEnrolled: true,
    enrolledAt: new Date().toISOString(),
  });

  return { success: true };
}
