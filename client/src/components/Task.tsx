import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Task as TaskType } from "../models/types";
import { useWebSocket } from "../hooks/useWebSocket";
import CursorIndicator from "./CursorIndicator";

interface TaskProps {
  task: TaskType;
  level?: number;
}

// Using memo for performance optimization
const Task = memo(function Task({ task, level = 0 }: TaskProps) {
  const {
    updateTask,
    deleteTask,
    updateCursorPosition,
    cursorPositions,
    getClientId,
  } = useWebSocket();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const clientId = getClientId();

  // Find cursors that are positioned on this task
  const taskCursors = Array.from(cursorPositions.values()).filter(
    (cursor) => cursor.taskId === task.id && cursor.userId !== clientId,
  );

  useEffect(() => {
    // Update local state when task changes from external sources
    setTitle(task.title);
    setDescription(task.description);
  }, [task]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      updateCursorPosition(task.id, e.target.selectionStart || 0);
    },
    [task.id, updateCursorPosition],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
      updateCursorPosition(task.id, e.target.selectionStart || 0);
    },
    [task.id, updateCursorPosition],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (titleRef.current) {
        updateCursorPosition(task.id, titleRef.current.selectionStart || 0);
      } else if (descriptionRef.current) {
        updateCursorPosition(
          task.id,
          descriptionRef.current.selectionStart || 0,
        );
      }
    },
    [task.id, updateCursorPosition],
  );

  const handleSave = useCallback(() => {
    updateTask({
      ...task,
      title,
      description,
    });
    setIsEditing(false);
  }, [task, title, description, updateTask]);

  const handleToggleComplete = useCallback(() => {
    updateTask({
      ...task,
      completed: !task.completed,
    });
  }, [task, updateTask]);

  const handleDelete = useCallback(() => {
    deleteTask(task.id);
  }, [task.id, deleteTask]);

  const handleAddSubTask = useCallback(() => {
    const newSubTasks = [...task.subTasks];
    newSubTasks.push({
      id: crypto.randomUUID(),
      title: "New Subtask",
      description: "",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subTasks: [],
    });

    updateTask({
      ...task,
      subTasks: newSubTasks,
    });
  }, [task, updateTask]);

  return (
    <div
      className={`task ${task.completed ? "completed" : ""}`}
      style={{ marginLeft: `${level * 20}px` }}
    >
      <div className="task-header">
        <div className="task-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
          />
        </div>
        {isEditing ? (
          <div className="task-edit">
            <div className="cursor-container">
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={handleTitleChange}
                onKeyUp={handleKeyUp}
                autoFocus
              />
              {taskCursors.map((cursor) => (
                <CursorIndicator
                  key={cursor.userId}
                  userId={cursor.userId}
                  position={cursor.position}
                />
              ))}
            </div>
            <div className="cursor-container">
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={handleDescriptionChange}
                onKeyUp={handleKeyUp}
                rows={3}
              />
              {taskCursors.map((cursor) => (
                <CursorIndicator
                  key={cursor.userId}
                  userId={cursor.userId}
                  position={cursor.position}
                />
              ))}
            </div>
            <div className="task-actions">
              <button onClick={handleSave}>Save</button>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="task-view" onClick={() => setIsEditing(true)}>
            <h3 className={task.completed ? "completed-text" : ""}>
              {task.title}
            </h3>
            <p>{task.description}</p>
            <div className="task-actions">
              <button onClick={() => setIsEditing(true)}>Edit</button>
              <button onClick={handleDelete}>Delete</button>
              <button onClick={handleAddSubTask}>Add Subtask</button>
            </div>
          </div>
        )}
      </div>

      {task.subTasks && task.subTasks.length > 0 && (
        <div className="subtasks">
          {task.subTasks.map((subtask) => (
            <Task key={subtask.id} task={subtask} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

export default Task;
