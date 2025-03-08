export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  subTasks: Task[];
}

export interface CursorPosition {
  userId: string;
  taskId: string;
  position: number;
}

export type MessageType =
  | "initial_state"
  | "create_task"
  | "update_task"
  | "delete_task"
  | "cursor_position"
  | "error";

export interface Message<T = any> {
  type: MessageType;
  data: T;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
