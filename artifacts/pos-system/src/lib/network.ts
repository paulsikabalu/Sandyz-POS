/**
 * Network status hook that provides reactive online/offline state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

type NetworkStatus = {
  isOnline: boolean;
  wasOffline: boolean;
};

/**
 * Hook that tracks navigator.onLine state and online/offline events.
 * Returns { isOnline, wasOffline } where wasOffline indicates if
 * the connection was just restored after being offline.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const wasOfflineRef = useRef(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      if (!navigator.onLine) return; // guard
      wasOfflineRef.current = true;
      setIsOnline(true);
      // Reset the "wasOffline" flag after a short delay so consumers can react
      setTimeout(() => {
        wasOfflineRef.current = false;
        setWasOffline(false);
      }, 3000);
      setWasOffline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check on visibility change (background tabs may not get the event)
    const handleVisibility = () => {
      if (!document.hidden) {
        const online = navigator.onLine;
        if (online !== isOnline) {
          setIsOnline(online);
          if (online) {
            wasOfflineRef.current = true;
            setTimeout(() => {
              wasOfflineRef.current = false;
              setWasOffline(false);
            }, 3000);
            setWasOffline(true);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}

/**
 * Check if the browser is currently online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Trigger a sync callback when the network comes back online.
 * Returns an unsubscribe function.
 */
export function onNetworkRestored(callback: () => void): () => void {
  const handler = () => {
    if (navigator.onLine) {
      callback();
    }
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

