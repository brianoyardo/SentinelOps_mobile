import { Platform } from 'react-native';
import { getN8nWebhookUrl } from '@/config/n8n';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

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
  
  const finalUri = audioUri.startsWith('file://') || isWeb ? audioUri : `file://${audioUri}`;

  if (isWeb) {
    const fileResponse = await fetch(finalUri);
    const audioBlob = await fileResponse.blob();

    const formData = new FormData();
    formData.append('audio', audioBlob, filename);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Voice report error: ${response.status}`);
    return response.json();
  } else {
    const uploadTask = await FileSystem.uploadAsync(
      url,
      finalUri,
      {
        httpMethod: 'POST',
        uploadType: 1 as any, // 1 === MULTIPART
        fieldName: 'audio',
        mimeType: 'audio/m4a',
        parameters: {
          metadata: JSON.stringify(metadata),
        },
      }
    );

    if (uploadTask.status !== 200 && uploadTask.status !== 201) {
      throw new Error(`Voice report error: ${uploadTask.status}`);
    }
    
    return JSON.parse(uploadTask.body);
  }
}
