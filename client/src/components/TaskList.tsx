import { useMemo, memo } from "react";
import TaskItem from "./TaskItem";
import { Task } from "../lib/websocket";

interface TaskListProps {
  tasks: Task[];
  searchQuery?: string;
  isLocked: boolean;
  onUpdateTask: (
    taskId: string,
    title: string,
    description: string,
    completed: boolean,
    parentId?: string,
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (title: string, description: string, parentId?: string) => void;
}

// Use memo to prevent unnecessary re-renders
const TaskList = memo(function TaskList({
  tasks,
  searchQuery = "",
  isLocked,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
}: TaskListProps) {
  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tasks, searchQuery]);

  // Get top-level tasks (no parentId)
  const topLevelTasks = useMemo(
    () => filteredTasks.filter((task) => !task.parentId),
    [filteredTasks],
  );

  if (topLevelTasks.length === 0) {
    return (
      <div className="no-tasks">
        <p>No tasks yet. Create your first task!</p>
      </div>
    );
  }

  return (
    <div className="tasks-list">
      {topLevelTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          allTasks={tasks}
          isLocked={isLocked}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
          onAddSubtask={onAddTask}
        />
      ))}
    </div>
  );
});

export default TaskList;
