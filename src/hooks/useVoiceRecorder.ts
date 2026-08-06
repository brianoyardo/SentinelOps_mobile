import { useCallback } from 'react';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async (): Promise<void> => {
    const status = await requestRecordingPermissionsAsync();
    if (!status.granted) {
      throw new Error('Permiso de micrófono denegado');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recorder.isRecording) return null;

    await recorder.stop();
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
    });

    return recorder.uri;
  }, [recorder]);

  return { startRecording, stopRecording };
}
