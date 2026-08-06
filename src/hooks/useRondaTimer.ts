import { useState, useEffect, useCallback, useRef } from 'react';

interface RondaTimerOptions {
  scheduledEnd?: number | null;
  startTime?: number | null;
  isRunning?: boolean;
  updateInterval?: number;
}

export function useRondaTimer(options: RondaTimerOptions = {}) {
  const {
    scheduledEnd = null,
    startTime = null,
    isRunning = false,
    updateInterval = 1000,
  } = options;

  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [urgency, setUrgency] = useState<'normal' | 'critical' | 'overdue'>('normal');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(startTime ?? Date.now());

  useEffect(() => {
    if (startTime) startRef.current = startTime;
  }, [startTime]);

  const tick = useCallback(() => {
    const now = Date.now();
    const elapsedMs = now - startRef.current;
    setElapsed(elapsedMs);

    if (scheduledEnd) {
      const remainMs = scheduledEnd - now;
      setRemaining(Math.max(0, remainMs));
      setIsLate(remainMs < 0);

      if (remainMs < 0) {
        setUrgency('overdue');
      } else if (remainMs < 5 * 60 * 1000) {
        setUrgency('critical');
      } else {
        setUrgency('normal');
      }
    }
  }, [scheduledEnd]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    tick();
    intervalRef.current = setInterval(tick, updateInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning, tick, updateInterval]);

  const formatElapsed = (ms?: number): string => {
    const totalSec = Math.floor((ms ?? elapsed) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRemaining = (ms?: number): string => {
    const totalSec = Math.ceil((ms ?? remaining ?? 0) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    elapsed,
    remaining,
    isLate,
    urgency,
    elapsedFormatted: formatElapsed(),
    remainingFormatted: formatRemaining(),
  };
}
