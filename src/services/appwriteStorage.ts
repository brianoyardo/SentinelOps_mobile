import { ID } from 'appwrite';
import { storage, EVIDENCE_BUCKET_ID } from '@/config/appwrite';

export async function uploadEvidence(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const file = new File([blob], fileName, { type: mimeType });

  const result = await storage.createFile(EVIDENCE_BUCKET_ID, ID.unique(), file);

  const fileUrl = storage.getFileView(EVIDENCE_BUCKET_ID, result.$id);
  return fileUrl.toString();
}
