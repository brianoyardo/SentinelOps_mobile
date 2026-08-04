import { Platform } from 'react-native';
import { getN8nWebhookUrl } from '@/config/n8n';

let AudioModule: typeof import('expo-av') | null = null;
let recording: object | null = null;

async function getAudio(): Promise<typeof import('expo-av')> {
  if (!AudioModule) {
    try {
      AudioModule = await import('expo-av');
    } catch {
      throw new Error('Módulo de audio no disponible en este entorno. Use un development build.');
    }
  }
  return AudioModule;
}

export async function requestAudioPermission(): Promise<boolean> {
  try {
    const audio = await getAudio();
    const { status } = await audio.Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function startVoiceRecording(): Promise<void> {
  const audio = await getAudio();
  const permitted = await requestAudioPermission();
  if (!permitted) throw new Error('Permiso de micrófono denegado');

  await audio.Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const result = await audio.Audio.Recording.createAsync(
    audio.Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  recording = result.recording;
}

export async function stopVoiceRecording(): Promise<string | null> {
  if (!recording) return null;

  const audio = await getAudio();
  const rec = recording as {
    stopAndUnloadAsync: () => Promise<void>;
    getURI: () => string | null;
  };
  await rec.stopAndUnloadAsync();
  const uri = rec.getURI();
  recording = null;

  await audio.Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
    staysActiveInBackground: false,
    shouldDuckAndroid: false,
  });

  return uri;
}

export async function sendVoiceReport(
  audioUri: string,
  metadata: {
    guardId?: string;
    guardName?: string;
    executionId?: string;
  },
): Promise<{ transcription?: string; riskScore?: number }> {
  const url = getN8nWebhookUrl('cierreRonda');

  const formData = new FormData();
  const filename = `voice_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'mp4'}`;

  formData.append('audio', {
    uri: audioUri,
    name: filename,
    type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
  } as unknown as Blob);
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  });

  if (!response.ok) throw new Error(`Voice report error: ${response.status}`);

  return response.json();
}
