import { Client, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('6a05456f0033afa2cdcd');

export const storage = new Storage(client);
export const EVIDENCE_BUCKET_ID = 'guard-evidences';
export default client;
