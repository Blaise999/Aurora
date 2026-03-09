'use client';
import { useEffect, useRef } from 'react';

export default function useVisitorTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const trackVisit = async () => {
      try {
        await fetch('/api/visitor/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_path: window.location.pathname,
            referrer: document.referrer || null,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (e) {
        // Silently fail — visitor tracking should never break the app
      }
    };

    // Small delay so it doesn't block initial render
    const timer = setTimeout(trackVisit, 1500);
    return () => clearTimeout(timer);
  }, []);
}
