/**
 * WebSocket Service for Real-time Notifications
 *
 * Handles WebSocket connection to Django Channels backend
 * Manages connection lifecycle and message parsing
 */

export interface NotificationData {
  id?: string;
  title: string;
  message: string;
  type?: string;
  project_id?: string;
  data?: any;
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
  private devTunnelUrl = 'wss://pms-backend-production-4438.up.railway.app/ws/notifications/';

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('Connecting to WebSocket:', this.devTunnelUrl);
      this.socket = new WebSocket(this.devTunnelUrl);

      this.socket.onopen = (event) => {
        console.log('WebSocket connected successfully');
        // Reset reconnect delay on successful connection
        this.reconnectDelay = 3000;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationData;
          console.log('Received WebSocket message:', data);

          // Notify all listeners
          this.messageListeners.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Error in message listener:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        this.socket = null;

        // Attempt to reconnect
        if (!this.reconnectTimer) {
          console.log(`Reconnecting in ${this.reconnectDelay}ms...`);
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, this.reconnectDelay);

          // Exponential backoff
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  onMessage(callback: (data: NotificationData) => void): void {
    this.messageListeners.push(callback);
  }

  removeMessageListener(callback: (data: NotificationData) => void): void {
    const index = this.messageListeners.indexOf(callback);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketServiceImpl();