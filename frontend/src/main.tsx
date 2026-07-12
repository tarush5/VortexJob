import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { DashboardPage } from './pages/DashboardPage';
import { QueuesPage } from './pages/QueuesPage';
import { JobsPage } from './pages/JobsPage';
import { WorkersPage } from './pages/WorkersPage';
import { DLQPage } from './pages/DLQPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { LogsPage } from './pages/LogsPage';
import { PerformancePage } from './pages/PerformancePage';
import { SettingsPage } from './pages/SettingsPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{ 
            style: { 
              background: 'rgba(17, 23, 56, 0.9)', 
              color: '#e2e8f0', 
              border: '1px solid rgba(99, 102, 241, 0.3)', 
              backdropFilter: 'blur(12px)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            } 
          }} 
        />
        <Routes>
          <Route element={<App />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/queues" element={<QueuesPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/dlq" element={<DLQPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/live-monitor" element={<LiveMonitorPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
