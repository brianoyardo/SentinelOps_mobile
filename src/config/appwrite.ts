import { Client, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '');

export const storage = new Storage(client);
export const EVIDENCE_BUCKET_ID = process.env.EXPO_PUBLIC_APPWRITE_BUCKET_EVIDENCE || 'guard-evidences';
export default client;
