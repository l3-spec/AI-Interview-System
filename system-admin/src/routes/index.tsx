import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';
import SystemLayout from '../components/SystemLayout';
import Dashboard from '../pages/Dashboard';
import UserManagement from '../pages/UserManagement';
import CompanyManagement from '../pages/CompanyManagement';
import JobManagement from '../pages/JobManagement';
import PermissionManagement from '../pages/PermissionManagement';
import BillingManagement from '../pages/BillingManagement';
import SystemSettings from '../pages/SystemSettings';
import SystemLogs from '../pages/SystemLogs';
import AdminManagement from '../pages/AdminManagement';
import HomeContentManagement from '../pages/HomeContentManagement';
import AssessmentManagement from '../pages/AssessmentManagement';
import PostManagement from '../pages/PostManagement';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<SystemLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="companies" element={<CompanyManagement />} />
        <Route path="jobs" element={<JobManagement />} />
        <Route path="home-content" element={<HomeContentManagement />} />
        <Route path="posts" element={<PostManagement />} />
        <Route path="assessments" element={<AssessmentManagement />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="logs" element={<SystemLogs />} />
        <Route path="permissions" element={<PermissionManagement />} />
        <Route path="billing" element={<BillingManagement />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}; 
