import * as Location from 'expo-location';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Camera } from 'expo-camera';

export interface PermissionsResult {
  location: boolean;
  microphone: boolean;
  camera: boolean;
}

export async function ensureRequiredPermissions(): Promise<PermissionsResult> {
  const result: PermissionsResult = { location: false, microphone: false, camera: false };

  try {
    const current = await Location.getForegroundPermissionsAsync();
    result.location = current.granted;
    if (!current.granted) {
      const requested = await Location.requestForegroundPermissionsAsync();
      result.location = requested.granted;
    }
  } catch {
    result.location = false;
  }

  try {
    const current = await getRecordingPermissionsAsync();
    result.microphone = current.granted;
    if (!current.granted) {
      const requested = await requestRecordingPermissionsAsync();
      result.microphone = requested.granted;
    }
  } catch {
    result.microphone = false;
  }

  try {
    const current = await Camera.getCameraPermissionsAsync();
    result.camera = current.granted;
    if (!current.granted) {
      const requested = await Camera.requestCameraPermissionsAsync();
      result.camera = requested.granted;
    }
  } catch {
    result.camera = false;
  }

  return result;
}
