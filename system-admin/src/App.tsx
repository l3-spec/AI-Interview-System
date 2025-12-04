import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import SystemLayout from './components/SystemLayout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import CompanyManagement from './pages/CompanyManagement';
import JobManagement from './pages/JobManagement';
import JobDictionaryManagement from './pages/JobDictionaryManagement';
import AdminManagement from './pages/AdminManagement';
import SystemLogs from './pages/SystemLogs';
import PermissionManagement from './pages/PermissionManagement';
import BillingManagement from './pages/BillingManagement';
import Settings from './pages/Settings';
import HomeContentManagement from './pages/HomeContentManagement';
import AssessmentManagement from './pages/AssessmentManagement';
import PostManagement from './pages/PostManagement';
import AppVersionManagement from './pages/AppVersionManagement';
import './App.css';

const App: React.FC = () => {
  return (
      <AuthProvider>
      <Router>
        <Routes>
          {/* 登录页面 */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* 系统布局 */}
          <Route path="/" element={<SystemLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="companies" element={<CompanyManagement />} />
            <Route path="jobs" element={<JobManagement />} />
            <Route path="job-dictionary" element={<JobDictionaryManagement />} />
            <Route path="home-content" element={<HomeContentManagement />} />
            <Route path="posts" element={<PostManagement />} />
            <Route path="assessments" element={<AssessmentManagement />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="app-versions" element={<AppVersionManagement />} />
            <Route path="logs" element={<SystemLogs />} />
            <Route path="permissions" element={<PermissionManagement />} />
            <Route path="billing" element={<BillingManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404页面 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
  );
};

export default App; 
