import { useState, useCallback, memo } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

const TaskForm = memo(function TaskForm() {
  const { createTask } = useWebSocket();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim()) return;

      createTask({
        title,
        description,
        completed: false,
        subTasks: [],
      });

      // Reset form
      setTitle("");
      setDescription("");
    },
    [title, description, createTask],
  );

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2>Add New Task</h2>
      <div className="form-group">
        <label htmlFor="title">Title:</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description"
          rows={3}
        />
      </div>
      <button type="submit" className="create-button">
        Create Task
      </button>
    </form>
  );
});

export default TaskForm;
