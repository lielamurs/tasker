import { createContext, useCallback, useEffect, useReducer } from "react";
import websocketService from "../services/websocketService";
import { Task, CursorPosition, Message, ErrorMessage } from "../models/types";

interface WebSocketState {
  tasks: Task[];
  cursorPositions: Map<string, CursorPosition>;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  error: ErrorMessage | null;
}

type WebSocketAction =
  | { type: "CONNECT_SUCCESS" }
  | { type: "CONNECT_ERROR" }
  | { type: "DISCONNECT" }
  | { type: "RECONNECT_ATTEMPT"; attempt: number }
  | { type: "RECONNECT_FAILED" }
  | { type: "SET_ERROR"; error: ErrorMessage }
  | { type: "SET_TASKS"; tasks: Task[] }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; task: Task }
  | { type: "DELETE_TASK"; taskId: string }
  | { type: "UPDATE_CURSOR"; cursorPosition: CursorPosition };

const initialState: WebSocketState = {
  tasks: [],
  cursorPositions: new Map(),
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  error: null,
};

function webSocketReducer(
  state: WebSocketState,
  action: WebSocketAction,
): WebSocketState {
  switch (action.type) {
    case "CONNECT_SUCCESS":
      return {
        ...state,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempt: 0,
        error: null,
      };
    case "CONNECT_ERROR":
      return {
        ...state,
        isConnected: false,
      };
    case "DISCONNECT":
      return {
        ...state,
        isConnected: false,
      };
    case "RECONNECT_ATTEMPT":
      return {
        ...state,
        isReconnecting: true,
        reconnectAttempt: action.attempt,
      };
    case "RECONNECT_FAILED":
      return {
        ...state,
        isReconnecting: false,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
      };
    case "SET_TASKS":
      return {
        ...state,
        tasks: action.tasks,
      };
    case "ADD_TASK":
      return {
        ...state,
        tasks: [...state.tasks, action.task],
      };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.task.id ? action.task : task,
        ),
      };
    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.taskId),
      };
    case "UPDATE_CURSOR":
      const newCursorPositions = new Map(state.cursorPositions);
      newCursorPositions.set(
        action.cursorPosition.userId,
        action.cursorPosition,
      );
      return {
        ...state,
        cursorPositions: newCursorPositions,
      };
    default:
      return state;
  }
}

interface WebSocketContextType extends WebSocketState {
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  updateCursorPosition: (taskId: string, position: number) => void;
  getClientId: () => string;
}

export const WebSocketContext = createContext<WebSocketContextType>({
  ...initialState,
  createTask: () => {},
  updateTask: () => {},
  deleteTask: () => {},
  updateCursorPosition: () => {},
  getClientId: () => "",
});

interface WebSocketProviderProps {
  children: React.ReactNode;
  serverUrl: string;
}

export function WebSocketProvider({
  children,
  serverUrl,
}: WebSocketProviderProps) {
  const [state, dispatch] = useReducer(webSocketReducer, initialState);

  // Handle incoming messages
  const handleMessage = useCallback((message: Message) => {
    switch (message.type) {
      case "initial_state":
        dispatch({ type: "SET_TASKS", tasks: message.data as Task[] });
        break;

      case "create_task":
        dispatch({ type: "ADD_TASK", task: message.data as Task });
        break;

      case "update_task":
        dispatch({ type: "UPDATE_TASK", task: message.data as Task });
        break;

      case "delete_task":
        dispatch({ type: "DELETE_TASK", taskId: message.data as string });
        break;

      case "cursor_position":
        dispatch({
          type: "UPDATE_CURSOR",
          cursorPosition: message.data as CursorPosition,
        });
        break;

      case "error":
        dispatch({ type: "SET_ERROR", error: message.data as ErrorMessage });
        break;

      default:
        console.warn("Unknown message type:", message.type);
    }
  }, []);

  // Connect to WebSocket server
  useEffect(() => {
    websocketService.setCallbacks({
      onOpen: () => {
        dispatch({ type: "CONNECT_SUCCESS" });
      },
      onMessage: handleMessage,
      onClose: () => {
        dispatch({ type: "DISCONNECT" });
      },
      onError: () => {
        dispatch({ type: "CONNECT_ERROR" });
      },
      onReconnect: (attempt) => {
        dispatch({ type: "RECONNECT_ATTEMPT", attempt });
      },
      onReconnectFailed: () => {
        dispatch({ type: "RECONNECT_FAILED" });
        dispatch({
          type: "SET_ERROR",
          error: {
            code: "CONNECTION_FAILED",
            message: "Failed to connect to the server after multiple attempts",
          },
        });
      },
    });

    websocketService.connect(serverUrl);

    return () => {
      websocketService.disconnect();
    };
  }, [serverUrl, handleMessage]);

  // Create a new task
  const createTask = useCallback(
    (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      const task: Task = {
        ...taskData,
        id: crypto.randomUUID(), // Using modern API for IDs
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subTasks: taskData.subTasks || [],
      };
      websocketService.createTask(task);
    },
    [],
  );

  // Update an existing task
  const updateTask = useCallback((task: Task) => {
    const updatedTask: Task = {
      ...task,
      updatedAt: new Date().toISOString(),
    };
    websocketService.updateTask(updatedTask);
  }, []);

  // Delete a task
  const deleteTask = useCallback((taskId: string) => {
    websocketService.deleteTask(taskId);
  }, []);

  // Update cursor position
  const updateCursorPosition = useCallback(
    (taskId: string, position: number) => {
      websocketService.updateCursorPosition(taskId, position);
    },
    [],
  );

  // Get client ID
  const getClientId = useCallback(() => {
    return websocketService.getClientId();
  }, []);

  const value: WebSocketContextType = {
    ...state,
    createTask,
    updateTask,
    deleteTask,
    updateCursorPosition,
    getClientId,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
