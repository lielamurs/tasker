import { useState, useEffect, useId, useRef, useCallback, memo } from "react";
import { Task } from "../lib/websocket";

interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  isLocked: boolean;
  onUpdate: (
    taskId: string,
    title: string,
    description: string,
    completed: boolean,
    parentId?: string,
  ) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (title: string, description: string, parentId: string) => void;
}

// Use memo to prevent unnecessary re-renders
const TaskItem = memo(function TaskItem({
  task,
  allTasks,
  isLocked,
  onUpdate,
  onDelete,
  onAddSubtask,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isShowingSubtaskForm, setIsShowingSubtaskForm] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [completed, setCompleted] = useState(task.completed);

  // Generate stable IDs for accessibility
  const uniqueId = useId();
  const inputId = `task-${uniqueId}`;

  // Refs for focus management
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Get subtasks for this task
  const subtasks = allTasks.filter((t) => t.parentId === task.id);

  // Sync with external changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setCompleted(task.completed);
  }, [task]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  // Event handlers
  const handleSave = useCallback(() => {
    if (title.trim()) {
      onUpdate(task.id, title, description, completed, task.parentId);
      setIsEditing(false);
    }
  }, [task.id, title, description, completed, task.parentId, onUpdate]);

  const toggleCompleted = useCallback(() => {
    const newCompleted = !completed;
    setCompleted(newCompleted);
    onUpdate(task.id, title, description, newCompleted, task.parentId);
  }, [task.id, title, description, completed, task.parentId, onUpdate]);

  const handleSubtaskSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);
      const subtaskTitle = formData.get("title") as string;
      const subtaskDescription = formData.get("description") as string;

      if (subtaskTitle.trim()) {
        onAddSubtask(subtaskTitle, subtaskDescription, task.id);
        setIsShowingSubtaskForm(false);
        // Reset the form
        form.reset();
      }
    },
    [task.id, onAddSubtask],
  );

  // Render read-only view for locked tasks
  if (isLocked && !isEditing) {
    return (
      <div className={`task-item ${completed ? "completed" : ""}`}>
        <div className="task-header">
          <input id={inputId} type="checkbox" checked={completed} disabled />
          <div className="task-content">
            <h4>{title}</h4>
            {description && <p>{description}</p>}
          </div>
        </div>

        {subtasks.length > 0 && (
          <div className="subtasks">
            {subtasks.map((subtask) => (
              <TaskItem
                key={subtask.id}
                task={subtask}
                allTasks={allTasks}
                isLocked={isLocked}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editable view
  return (
    <div className={`task-item ${completed ? "completed" : ""}`}>
      {isEditing ? (
        <div className="task-edit-form">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            required
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Description (optional)"
          />

          <div className="task-actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-header">
            <input
              id={inputId}
              type="checkbox"
              checked={completed}
              onChange={toggleCompleted}
            />
            <div className="task-content" onClick={() => setIsEditing(true)}>
              <h4>{title}</h4>
              {description && <p>{description}</p>}
            </div>
            <div className="task-actions">
              <button onClick={() => setIsEditing(true)}>Edit</button>
              <button onClick={() => onDelete(task.id)}>Delete</button>
              <button
                onClick={() => setIsShowingSubtaskForm(!isShowingSubtaskForm)}
              >
                {isShowingSubtaskForm ? "Cancel Subtask" : "Add Subtask"}
              </button>
            </div>
          </div>

          {isShowingSubtaskForm && (
            <form className="subtask-form" onSubmit={handleSubtaskSubmit}>
              <h3>Add Subtask</h3>
              <div className="form-group">
                <input
                  name="title"
                  type="text"
                  placeholder="Subtask title"
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  rows={3}
                />
              </div>
              <button type="submit" className="create-button">
                Add Subtask
              </button>
            </form>
          )}

          {subtasks.length > 0 && (
            <div className="subtasks">
              {subtasks.map((subtask) => (
                <TaskItem
                  key={subtask.id}
                  task={subtask}
                  allTasks={allTasks}
                  isLocked={isLocked}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default TaskItem;
