import { memo } from "react";
import Task from "./Task";
import TaskForm from "./TaskForm";
import { useWebSocket } from "../hooks/useWebSocket";

// Using memo for performance optimization
const TaskList = memo(function TaskList() {
  const { tasks, isConnected, isReconnecting, reconnectAttempt, error } =
    useWebSocket();

  if (!isConnected) {
    return (
      <div className="connection-status">
        {isReconnecting ? (
          <div className="reconnecting">
            <p>Reconnecting... (Attempt {reconnectAttempt})</p>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="disconnected">
            <p>Disconnected from server</p>
            {error && <p className="error">{error.message}</p>}
          </div>
        )}
      </div>
    );
  }

  // Only show top-level tasks (not subtasks)
  const topLevelTasks = tasks.filter(
    (task) =>
      !tasks.some(
        (parentTask) =>
          parentTask.subTasks &&
          parentTask.subTasks.some((subTask) => subTask.id === task.id),
      ),
  );

  return (
    <div className="task-list">
      <div className="connection-indicator connected">
        <span className="status-dot"></span>
        <span>Connected to server</span>
      </div>

      <TaskForm />

      {topLevelTasks.length === 0 ? (
        <div className="no-tasks">
          <p>No tasks yet. Create your first task above!</p>
        </div>
      ) : (
        topLevelTasks.map((task) => <Task key={task.id} task={task} />)
      )}
    </div>
  );
});

export default TaskList;
