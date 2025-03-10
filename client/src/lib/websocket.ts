import { nanoid } from "nanoid";

// Types
export interface Task {
  id: string;
  taskListId: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
}

export interface TaskList {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerMessage<T = unknown> {
  type: string;
  data: T;
}

export type MessageHandler = (message: ServerMessage) => void;

// Generate a client ID and store it
export const getClientId = (): string => {
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    clientId = nanoid();
    localStorage.setItem("clientId", clientId);
  }
  return clientId;
};

// WebSocket client
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private clientId: string;
  private connecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    this.clientId = getClientId();
  }

  // Connect to the WebSocket server
  connect(): void {
    // If already connected or connecting, don't try again
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING ||
      this.connecting
    ) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached, stopping reconnection");
      return;
    }

    this.connecting = true;

    // Get server URL from environment variable or use default
    const serverUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";
    this.socket = new WebSocket(`${serverUrl}?clientId=${this.clientId}`);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.connecting = false;
      this.reconnectAttempts = 0;

      // Restore username if available (after short delay)
      const savedUsername = localStorage.getItem("username");
      if (savedUsername) {
        setTimeout(() => {
          this.sendMessage("set_username", { username: savedUsername });
        }, 300);
      }
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");
      this.connecting = false;

      // Try to reconnect after delay
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

      const reconnectDelay = Math.min(
        30000,
        this.reconnectAttempts * 1000 + 1000,
      );
      this.reconnectTimer = window.setTimeout(
        () => this.connect(),
        reconnectDelay,
      );
      this.reconnectAttempts++;
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(message));
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };
  }

  // Disconnect from the server
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Send a message to the server
  sendMessage<T>(type: string, data: T): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    const message = { type, data };
    this.socket.send(JSON.stringify(message));
  }

  // Subscribe to messages
  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  // Get client ID
  getClientId(): string {
    return this.clientId;
  }

  // Reset reconnection attempts
  resetReconnectionAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

// Create singleton instance
export const websocketClient = new WebSocketClient();
