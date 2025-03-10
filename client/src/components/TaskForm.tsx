import { useId, FormEvent } from "react";

interface TaskFormProps {
  onCreateTask: (title: string, description: string, parentId?: string) => void;
  parentId?: string;
}

export default function TaskForm({ onCreateTask, parentId }: TaskFormProps) {
  const formId = useId();
  const titleId = `title-${formId}`;
  const descId = `description-${formId}`;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (title.trim()) {
      onCreateTask(title, description, parentId);
      form.reset();
      // Focus the title input for quick successive task creation
      const titleInput = form.elements.namedItem("title") as HTMLInputElement;
      if (titleInput) titleInput.focus();
    }
  };

  return (
    <form
      className={`task-form ${parentId ? "subtask-form" : ""}`}
      onSubmit={handleSubmit}
    >
      <h3>{parentId ? "Add Subtask" : "Add New Task"}</h3>
      <div className="form-group">
        <label htmlFor={titleId}>Title:</label>
        <input
          id={titleId}
          name="title"
          type="text"
          placeholder="Enter task title"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor={descId}>Description:</label>
        <textarea
          id={descId}
          name="description"
          placeholder="Enter task description (optional)"
          rows={3}
        />
      </div>
      <button type="submit" className="create-button">
        {parentId ? "Add Subtask" : "Create Task"}
      </button>
    </form>
  );
}
