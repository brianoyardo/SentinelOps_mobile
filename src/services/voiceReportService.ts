/**
 * SentinelOps Mobile — Voice Report Service
 *
 * Envía el audio del guardia (reporte de cierre de ronda) al webhook de n8n
 * para transcripción y análisis con IA.
 */

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

  if (!url) {
    throw new Error('URL de cierre de ronda no configurada en .env.');
  }

  const isWeb = Platform.OS === 'web';
  const mimeType = isWeb ? 'audio/webm' : 'audio/m4a';
  const filename = `reporte.${isWeb ? 'webm' : 'm4a'}`;

  const finalUri =
    isWeb || audioUri.startsWith('file://') || audioUri.startsWith('http')
      ? audioUri
      : `file://${audioUri}`;

  return new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));

      if (isWeb) {
        // 🌐 WEB: fetch URI -> Blob -> FormData
        const fileResponse = await fetch(finalUri);
        if (!fileResponse.ok) {
          return reject(new Error(`Error leyendo audio (Web): ${fileResponse.status}`));
        }
        const audioBlob = await fileResponse.blob();
        const typedBlob = audioBlob.type === mimeType ? audioBlob : new Blob([audioBlob], { type: mimeType });
        formData.append('audio', typedBlob, filename);
      } else {
        // 📱 NATIVE: FormData accepts { uri, name, type }
        // Se usa XMLHttpRequest porque el fetch moderno de RN 0.76 arroja 'Unsupported FormDataPart implementation'
        formData.append('audio', {
          uri: finalUri,
          name: filename,
          type: mimeType,
        } as any);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const contentType = xhr.getResponseHeader('content-type') || '';
            if (contentType.includes('application/json')) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              resolve({});
            }
          } catch (e) {
            reject(new Error('Respuesta inválida del servidor webhook'));
          }
        } else {
          let errorBody = xhr.responseText.slice(0, 200);
          reject(new Error(`Error del servidor n8n [${xhr.status}]: ${errorBody}`));
        }
      };

      xhr.onerror = () => reject(new Error('Error de red al conectar con el webhook de n8n'));
      xhr.send(formData);
    } catch (err) {
      reject(err);
    }
  });
}
