'use client';

import { useEffect } from 'react';
import { classifyZiiplyWake } from './ziiplyWakePolicy';
import { recoverZiiplyStalledRequests } from './ziiplyRequestRecovery';

type WakeDetail = {
  kind: 'light' | 'full';
  reason: string;
  idleMs: number;
  at: number;
  location?: { latitude: number; longitude: number; accuracyMeters: number };
  networkReady?: boolean;
};
declare global {
  interface WindowEventMap {
    'ziiply:wake': CustomEvent<WakeDetail>;
  }
}

/**
 * Resume notification, not a page reload.
 * Never refreshes basket prices, changes the selected store or clears state.
 * Consumers can subscribe to ziiply:wake to revalidate their own safe caches.
 */
export default function ZiiplyWakeUp() {
  useEffect(() => {
    let lastActivity = Date.now();
    let hiddenSince: number | null = document.hidden ? Date.now() : null;
    let lastWake = 0;
    let probeController: AbortController | null = null;
    let disposed = false;

    const dispatch = (detail: WakeDetail) => {
      if (!disposed) window.dispatchEvent(new CustomEvent<WakeDetail>('ziiply:wake', { detail }));
    };
    const resume = (reason: string) => {
      if (document.hidden) return;
      const now = Date.now();
      const idleMs = Math.max(0, now - Math.min(lastActivity, hiddenSince ?? now));
      hiddenSince = null;
      const kind = classifyZiiplyWake(idleMs, lastWake ? now - lastWake : Number.POSITIVE_INFINITY);
      if (!kind) return;
      lastWake = now;
      if (kind === 'full') recoverZiiplyStalledRequests(now);
      const detail: WakeDetail = { kind, reason, idleMs, at: now };
      dispatch(detail);
      // Probe the origin without navigating or touching cart/offer caches.
      // A previously suspended browser may have a stale connection.
      probeController?.abort();
      const controller = new AbortController();
      probeController = controller;
      void fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store', signal: controller.signal })
        .then(response => {
          if (!disposed && !controller.signal.aborted)
            dispatch({ ...detail, reason: 'network-resumed', networkReady: response.ok });
        })
        .catch(() => {
          if (!disposed && !controller.signal.aborted)
            dispatch({ ...detail, reason: 'network-resumed', networkReady: false });
        });
      // Full wake silently probes current location if the browser already has permission.
      // Never prompt for permission simply because the app became visible.
      if (kind !== 'full' || !navigator.geolocation || !navigator.permissions) return;
      void navigator.permissions.query({ name: 'geolocation' }).then(permission => {
        if (disposed || permission.state !== 'granted' || document.hidden) return;
        navigator.geolocation.getCurrentPosition(
          position => {
            if (disposed || document.hidden) return;
            dispatch({
              ...detail, reason: 'gps-resumed',
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: position.coords.accuracy,
              },
            });
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 },
        );
      }).catch(() => {});
    };
    const visibility = () => {
      if (document.hidden) hiddenSince = Date.now();
      else resume('visibilitychange');
    };
    const onFocus = () => resume('focus');
    const onPageShow = () => resume('pageshow');
    const onOnline = () => resume('online');
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity >= 30_000) resume('activity');
      lastActivity = now;
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      probeController?.abort();
    };
  }, []);
  return null;
}
