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
          <h1>Collaborative Task App</h1>
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
          <p>Real-time Collaboration Demo &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
