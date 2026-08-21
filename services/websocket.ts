/**
 * In-app notification WebSocket for Project / DPR events.
 *
 * Emails remain backend-driven on normal APIs. This socket only feeds toast /
 * badge / panel UI. Derive host from VITE_WS_BASE_URL / API config — do not
 * hardcode per call site. Never call executive-digest from the frontend.
 */
import { getNotificationsWsUrl } from '../config/apiConfig';
import { getAccessToken } from '../utils/authStorage';

export interface NotificationData {
  id?: string | number;
  title: string;
  message: string;
  type?: string;
  notification_type?: string;
  module_name?: string;
  project_name?: string;
  action_type?: string;
  sender?: string;
  sender_username?: string;
  sender_role?: string;
  created_at?: string;
  is_read?: boolean;
  project_id?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export interface WebSocketService {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  onMessage: (callback: (data: NotificationData) => void) => void;
  removeMessageListener: (callback: (data: NotificationData) => void) => void;
}

class WebSocketServiceImpl implements WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectDelay = 3000;
  private messageListeners: ((data: NotificationData) => void)[] = [];
  /** When true, onclose must not schedule reconnect (logout / unmount). */
  private intentionalClose = false;

  private buildUrl(): string {
    const base = getNotificationsWsUrl();
    const token = getAccessToken();
    if (!token) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}token=${encodeURIComponent(token)}`;
  }

  connect(): void {
    if (typeof window === 'undefined' || !('WebSocket' in window)) return;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.intentionalClose = false;

    try {
      const url = this.buildUrl();
      // Never log the JWT query string.
      console.log('Connecting to WebSocket:', getNotificationsWsUrl());
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.reconnectDelay = 3000;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationData;
          this.messageListeners.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error('Error in message listener:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = () => {
        // Browser surfaces details in DevTools; avoid noisy / sensitive logs.
      };

      this.socket.onclose = () => {
        this.socket = null;
        if (this.intentionalClose) return;
        if (this.reconnectTimer) return;

        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  onMessage(callback: (data: NotificationData) => void): void {
    if (!this.messageListeners.includes(callback)) {
      this.messageListeners.push(callback);
    }
  }

  removeMessageListener(callback: (data: NotificationData) => void): void {
    const index = this.messageListeners.indexOf(callback);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
    }
  }
}

export const websocketService = new WebSocketServiceImpl();
/** Alias matching integration naming. */
export const notificationSocketService = websocketService;
