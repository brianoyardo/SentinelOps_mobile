import { Platform } from 'react-native';
import { getN8nWebhookUrl } from '@/config/n8n';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';

export async function requestAudioPermission(): Promise<boolean> {
  try {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) return true;
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

export async function sendVoiceReport(
  audioUri: string,
  metadata: Record<string, unknown>,
): Promise<{ transcription?: string; riskScore?: number }> {
  const url = getN8nWebhookUrl('cierreRonda');

  const isWeb = Platform.OS === 'web';
  const filename = `voice_${Date.now()}.${isWeb ? 'webm' : 'm4a'}`;

  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    name: filename,
    type: isWeb ? 'audio/webm' : 'audio/m4a',
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
