import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Task, TaskList, websocketClient } from "../lib/websocket";

interface TaskState {
  // Connection state
  connected: boolean;
  username: string;

  // Task data
  taskList: TaskList | null;
  tasks: Task[];
  isOwner: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setUsername: (username: string) => void;
  setTaskList: (taskList: TaskList, isOwner: boolean) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;

  // API actions
  sendSetUsername: (username: string) => void;
  sendCreateTaskList: (title: string) => void;
  sendGetTaskList: (taskListId: string) => void;
  sendToggleLockTaskList: (taskListId: string) => void;
  sendCreateTask: (
    title: string,
    description: string,
    parentId?: string,
  ) => void;
  sendUpdateTask: (
    taskId: string,
    title: string,
    description: string,
    completed: boolean,
    parentId?: string,
  ) => void;
  sendDeleteTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // Initial state
      connected: false,
      username: localStorage.getItem("username") || "",
      taskList: null,
      tasks: [],
      isOwner: false,
      isLoading: false,
      error: null,

      // State setters
      setConnected: (connected) => set({ connected }),
      setUsername: (username) => {
        localStorage.setItem("username", username);
        set({ username });
      },
      setTaskList: (taskList, isOwner) => set({ taskList, isOwner }),
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, task],
        })),
      updateTask: (updatedTask) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === updatedTask.id ? updatedTask : task,
          ),
        })),
      deleteTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        })),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),

      // API actions
      sendSetUsername: (username) => {
        websocketClient.sendMessage("set_username", { username });
      },
      sendCreateTaskList: (title) => {
        websocketClient.sendMessage("create_task_list", { title });
      },
      sendGetTaskList: (taskListId) => {
        set({ isLoading: true });
        websocketClient.sendMessage("get_task_list", { taskListId });
      },
      sendToggleLockTaskList: (taskListId) => {
        websocketClient.sendMessage("toggle_lock_task_list", { taskListId });
      },
      sendCreateTask: (title, description, parentId) => {
        const { taskList } = get();
        if (!taskList) return;

        websocketClient.sendMessage("create_task", {
          taskListId: taskList.id,
          title,
          description,
          parentId,
        });
      },
      sendUpdateTask: (taskId, title, description, completed, parentId) => {
        websocketClient.sendMessage("update_task", {
          taskId,
          title,
          description,
          completed,
          parentId,
        });
      },
      sendDeleteTask: (taskId) => {
        websocketClient.sendMessage("delete_task", { taskId });
      },
    }),
    { name: "task-store" },
  ),
);

// Initialize websocket listeners
export function initializeWebSocketListeners() {
  websocketClient.connect();

  const unsubscribe = websocketClient.subscribe((message) => {
    const { type, data } = message;

    console.log("Received message:", type, data);

    switch (type) {
      case "username_set":
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          data.success
        ) {
          if ("username" in data && typeof data.username === "string") {
            useTaskStore.getState().setUsername(data.username);
          }

          if (
            "taskList" in data &&
            data.taskList &&
            typeof data.taskList === "object"
          ) {
            const taskList = data.taskList as TaskList;
            useTaskStore
              .getState()
              .setTaskList(
                taskList,
                taskList.ownerId === websocketClient.getClientId(),
              );
          }
        }
        break;

      case "task_list_created":
      case "task_list_updated":
        if (data && typeof data === "object" && "ownerId" in data) {
          const taskList = data as TaskList;
          useTaskStore
            .getState()
            .setTaskList(
              taskList,
              taskList.ownerId === websocketClient.getClientId(),
            );
        }
        break;

      case "task_list_data":
        if (
          data &&
          typeof data === "object" &&
          "taskList" in data &&
          "tasks" in data &&
          "isOwner" in data
        ) {
          const { taskList, tasks, isOwner } = data as {
            taskList: TaskList;
            tasks: Task[];
            isOwner: boolean;
          };
          useTaskStore.getState().setTaskList(taskList, isOwner);
          useTaskStore.getState().setTasks(tasks);
          useTaskStore.getState().setLoading(false);
        }
        break;

      case "task_created":
        if (data && typeof data === "object") {
          const task = data as Task;
          useTaskStore.getState().addTask(task);
        }
        break;

      case "task_updated":
        if (data && typeof data === "object") {
          const task = data as Task;
          useTaskStore.getState().updateTask(task);
        }
        break;

      case "task_deleted":
        if (
          data &&
          typeof data === "object" &&
          "taskId" in data &&
          typeof data.taskId === "string"
        ) {
          useTaskStore.getState().deleteTask(data.taskId);
        }
        break;

      case "error":
        if (
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string"
        ) {
          useTaskStore.getState().setError(data.message);
          useTaskStore.getState().setLoading(false);
        }
        break;

      default:
        console.warn("Unknown message type:", type);
    }
  });

  // Set connected state
  useTaskStore.getState().setConnected(true);

  // This function would normally be called when the app is unmounted,
  // but since this is a singleton, we'll ignore it for now
  return unsubscribe;
}
