import { useEffect } from 'react';
import ReactGA from 'react-ga4';

/**
 * Call this once in App.tsx to send a page_view event
 * every time the URL hash/path changes.
 */
export function usePageTracking() {
  useEffect(() => {
    const sendPageView = () => {
      ReactGA.send({
        hitType: 'pageview',
        page: window.location.pathname + window.location.hash,
        title: document.title,
      });
    };

    // Send on first load
    sendPageView();

    // Re-send on hash changes (your app likely uses hash routing)
    window.addEventListener('hashchange', sendPageView);
    return () => window.removeEventListener('hashchange', sendPageView);
  }, []);
}
