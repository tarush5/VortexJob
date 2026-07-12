import { useEffect, useRef, useState } from 'react';

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  deps: unknown[] = []
) {
  const [isPolling, setIsPolling] = useState(true);
  const callbackRef = useRef(callback);
  const intervalRef = useRef<number | null>(null);

  // Keep callback ref fresh
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let active = true;

    function start() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        if (active && !document.hidden) {
          callbackRef.current();
        }
      }, intervalMs);
      setIsPolling(true);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPolling(false);
      } else {
        // Resume polling and immediately refresh
        callbackRef.current();
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { isPolling };
}
