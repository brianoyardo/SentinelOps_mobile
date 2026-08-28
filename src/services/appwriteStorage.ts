import { ID } from 'appwrite';
import { storage, EVIDENCE_BUCKET_ID } from '@/config/appwrite';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export async function uploadEvidence(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const fileId = ID.unique();
  const projectId = '6a05456f0033afa2cdcd';
  const endpoint = 'https://nyc.cloud.appwrite.io/v1';

  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('permissions[]', 'read("any")');
    formData.append('file', blob, fileName);

    const uploadRes = await fetch(`${endpoint}/storage/buckets/${EVIDENCE_BUCKET_ID}/files`, {
      method: 'POST',
      headers: { 'X-Appwrite-Project': projectId },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error subiendo foto a Appwrite: ${errText}`);
    }
  } else {
    const uploadTask = await FileSystem.uploadAsync(
      `${endpoint}/storage/buckets/${EVIDENCE_BUCKET_ID}/files`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: 1 as any, // 1 === MULTIPART
        fieldName: 'file',
        mimeType: mimeType || 'image/jpeg',
        headers: { 'X-Appwrite-Project': projectId },
        parameters: { fileId: fileId, 'permissions[]': 'read("any")' },
      }
    );

    if (uploadTask.status !== 200 && uploadTask.status !== 201) {
      throw new Error(`Error subiendo foto a Appwrite: ${uploadTask.body}`);
    }
  }

  // Obtenemos la URL de visualización usando el SDK
  const fileUrl = storage.getFileView(EVIDENCE_BUCKET_ID, fileId);
  return fileUrl.toString();
}
