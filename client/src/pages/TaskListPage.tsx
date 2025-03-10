import { useState, useEffect, Suspense, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTaskStore } from "../store/taskStore";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";

export default function TaskListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    connected,
    username,
    taskList,
    tasks,
    isOwner,
    isLoading,
    error,
    sendGetTaskList,
    sendToggleLockTaskList,
    sendCreateTask,
    sendUpdateTask,
    sendDeleteTask,
    setError,
  } = useTaskStore();

  // Load task list data
  useEffect(() => {
    if (connected && id) {
      sendGetTaskList(id);
    }
  }, [connected, id, sendGetTaskList]);

  // Redirect if no username
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  // Handle task creation
  const handleCreateTask = useCallback(
    (title: string, description: string, parentId?: string) => {
      sendCreateTask(title, description, parentId);
    },
    [sendCreateTask],
  );

  if (!connected) {
    return (
      <div className="connecting">
        <p>Connecting to server...</p>
      </div>
    );
  }

  if (!taskList || isLoading) {
    return (
      <div className="loading">
        <p>Loading task list...</p>
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
            <button onClick={() => navigate("/")}>Back to Home</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="task-list-page">
      <div className="task-list-header">
        <h2>{taskList.title}</h2>
        <div className="task-list-meta">
          <p>Created by: {taskList.ownerName}</p>
          <p>Task List ID: {taskList.id}</p>
          <div className="lock-status">
            {taskList.isLocked ? (
              <span className="locked">🔒 Locked</span>
            ) : (
              <span className="unlocked">🔓 Unlocked</span>
            )}
          </div>
        </div>

        <div className="task-list-actions">
          {isOwner && (
            <button
              className="toggle-lock"
              onClick={() => sendToggleLockTaskList(taskList.id)}
            >
              {taskList.isLocked ? "Unlock Task List" : "Lock Task List"}
            </button>
          )}
          <button
            className="share-button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }}
          >
            Share Task List
          </button>
          <button className="back-button" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="search-container">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {(!taskList.isLocked || isOwner) && (
        <TaskForm onCreateTask={handleCreateTask} />
      )}

      <div className="tasks-container">
        <Suspense fallback={<div className="loading">Loading tasks...</div>}>
          <TaskList
            tasks={tasks}
            searchQuery={searchQuery}
            isLocked={taskList.isLocked && !isOwner}
            onUpdateTask={sendUpdateTask}
            onDeleteTask={sendDeleteTask}
            onAddTask={handleCreateTask}
          />
        </Suspense>
      </div>
    </div>
  );
}
