import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { initializeAuthListener } from '@/services/authService';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    const cleanup = initializeAuthListener();
    return cleanup;
  }, []);

  return store;
}
