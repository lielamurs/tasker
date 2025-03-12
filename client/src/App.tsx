import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

// Lazy-loaded components
const HomePage = lazy(() => import("./pages/HomePage"));
const TaskListPage = lazy(() => import("./pages/TaskListPage"));

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="app-logo">
            <span className="logo-icon">✓</span>
            <h1>Tasker</h1>
          </div>
        </header>
        <main className="app-content">
          <Suspense fallback={<div className="loading">Loading...</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/tasklist/:id" element={<TaskListPage />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="app-footer">
          <p>Tasker &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
