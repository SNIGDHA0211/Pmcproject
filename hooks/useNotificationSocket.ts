import { useEffect, useRef } from 'react';
import {
  notificationSocketService,
  type NotificationData,
} from '../services/websocket';

export interface UseNotificationSocketOptions {
  /** Connect only when the user is authenticated. */
  enabled: boolean;
  onMessage: (data: NotificationData) => void;
}

/**
 * Connects the global notifications WebSocket after login and disconnects on
 * logout / when `enabled` becomes false. Prevents duplicate listeners and
 * reconnects after unexpected drops (handled inside the socket service).
 */
export function useNotificationSocket({
  enabled,
  onMessage,
}: UseNotificationSocketOptions): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) {
      notificationSocketService.disconnect();
      return;
    }

    if (typeof window === 'undefined' || !('WebSocket' in window)) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // Keep in-app toasts working if the browser denies permission.
      });
    }

    const handler = (data: NotificationData) => {
      onMessageRef.current(data);
    };

    notificationSocketService.onMessage(handler);
    notificationSocketService.connect();

    return () => {
      notificationSocketService.removeMessageListener(handler);
    };
  }, [enabled]);
}
