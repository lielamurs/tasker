import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "../store/taskStore";

export default function HomePage() {
  const {
    connected,
    username,
    taskList,
    error,
    sendSetUsername,
    sendCreateTaskList,
    setError,
  } = useTaskStore();

  const [newUsername, setNewUsername] = useState("");
  const [newTaskListTitle, setNewTaskListTitle] = useState("");
  const [taskListIdInput, setTaskListIdInput] = useState("");
  const navigate = useNavigate();

  // Redirect to task list if already exists
  useEffect(() => {
    if (taskList) {
      navigate(`/tasklist/${taskList.id}`);
    }
  }, [taskList, navigate]);

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim()) {
      sendSetUsername(newUsername);
    }
  };

  const handleCreateTaskList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskListTitle.trim()) {
      sendCreateTaskList(newTaskListTitle);
    }
  };

  const handleJoinTaskList = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskListIdInput.trim()) {
      navigate(`/tasklist/${taskListIdInput}`);
    }
  };

  // Reset localStorage for testing
  const handleReset = () => {
    localStorage.removeItem("clientId");
    localStorage.removeItem("username");
    window.location.reload();
  };

  if (!connected) {
    return (
      <div className="connecting">
        <p>Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!username ? (
        <div className="username-form">
          <h2>Enter Your Name</h2>
          <form onSubmit={handleSetUsername}>
            <input
              type="text"
              placeholder="Your name"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
            <button type="submit">Continue</button>
          </form>
        </div>
      ) : (
        <div className="task-list-options">
          <h2>Welcome, {username}!</h2>

          <div className="option-card">
            <h3>Create New Task List</h3>
            <form onSubmit={handleCreateTaskList}>
              <input
                type="text"
                placeholder="Task List Title"
                value={newTaskListTitle}
                onChange={(e) => setNewTaskListTitle(e.target.value)}
                required
              />
              <button type="submit">Create Task List</button>
            </form>
          </div>

          <div className="option-card">
            <h3>Join Existing Task List</h3>
            <form onSubmit={handleJoinTaskList}>
              <input
                type="text"
                placeholder="Task List ID"
                value={taskListIdInput}
                onChange={(e) => setTaskListIdInput(e.target.value)}
                required
              />
              <button type="submit">Join Task List</button>
            </form>
          </div>

          <button className="reset-button" onClick={handleReset}>
            Reset (For Testing)
          </button>
        </div>
      )}
    </div>
  );
}
