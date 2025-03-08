import { Message, Task, CursorPosition } from "../models/types";

class WebSocketService {
  private socket: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private callbacks: {
    onOpen?: () => void;
    onMessage?: (message: Message) => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    onReconnect?: (attempt: number) => void;
    onReconnectFailed?: () => void;
  } = {};

  constructor() {
    // Generate a unique client ID
    this.clientId = localStorage.getItem("clientId") || this.generateClientId();
    localStorage.setItem("clientId", this.clientId);
  }

  private generateClientId(): string {
    return crypto.randomUUID(); // Using modern API
  }

  // Connect to the WebSocket server
  connect(serverUrl: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.socket = new WebSocket(`${serverUrl}?clientId=${this.clientId}`);

      this.socket.onopen = () => {
        console.log("WebSocket connection established");
        this.reconnectAttempts = 0;
        if (this.callbacks.onOpen) this.callbacks.onOpen();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as Message;
          if (this.callbacks.onMessage) this.callbacks.onMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.socket.onclose = () => {
        console.log("WebSocket connection closed");
        if (this.callbacks.onClose) this.callbacks.onClose();
        this.attemptReconnect(serverUrl);
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (this.callbacks.onError) this.callbacks.onError(error);
      };
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      this.attemptReconnect(serverUrl);
    }
  }

  // Attempt to reconnect to the server
  private attemptReconnect(serverUrl: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      if (this.callbacks.onReconnectFailed) this.callbacks.onReconnectFailed();
      return;
    }

    this.reconnectAttempts++;

    if (this.callbacks.onReconnect) {
      this.callbacks.onReconnect(this.reconnectAttempts);
    }

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    );

    setTimeout(() => {
      this.connect(serverUrl);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // Disconnect from the WebSocket server
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Send a message to the server
  sendMessage<T>(type: Message["type"], data: T): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    const message: Message<T> = {
      type,
      data,
    };

    this.socket.send(JSON.stringify(message));
  }

  // Create a new task
  createTask(task: Task): void {
    this.sendMessage("create_task", task);
  }

  // Update an existing task
  updateTask(task: Task): void {
    this.sendMessage("update_task", task);
  }

  // Delete a task
  deleteTask(taskId: string): void {
    this.sendMessage("delete_task", taskId);
  }

  // Update cursor position
  updateCursorPosition(taskId: string, position: number): void {
    const cursorPosition: CursorPosition = {
      userId: this.clientId,
      taskId,
      position,
    };
    this.sendMessage("cursor_position", cursorPosition);
  }

  // Set callbacks for WebSocket events
  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get the client ID
  getClientId(): string {
    return this.clientId;
  }
}

export default new WebSocketService();
