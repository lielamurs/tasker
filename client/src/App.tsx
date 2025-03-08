import { Suspense, lazy } from "react";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy loading for better performance
const TaskList = lazy(() => import("./components/TaskList"));

export default function App() {
  // In production, you'd get this from config or environment variables
  const serverUrl = "ws://localhost:8080/ws";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Collaborative To-Do List</h1>
      </header>
      <main className="app-main">
        <ErrorBoundary>
          <WebSocketProvider serverUrl={serverUrl}>
            <Suspense fallback={<div className="loading">Loading...</div>}>
              <TaskList />
            </Suspense>
          </WebSocketProvider>
        </ErrorBoundary>
      </main>
      <footer className="app-footer">
        <p>Collaborative To-Do App ©{new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
