import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAes98Y-p_8M6lcRxoaPbC87GPLYkYKKBA',
  authDomain: 'guardias-prueba.firebaseapp.com',
  projectId: 'guardias-prueba',
  storageBucket: 'guardias-prueba.firebasestorage.app',
  messagingSenderId: '693842246915',
  appId: '1:693842246915:web:5e7eb2f598dc7031397d36',
};

const app = initializeApp(firebaseConfig);

let authInstance: ReturnType<typeof getAuth>;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export default app;
