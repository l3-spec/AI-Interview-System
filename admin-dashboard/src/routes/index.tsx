import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardLayout from '../components/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import InterviewList from '../pages/InterviewList';
import JobManagement from '../pages/JobManagement';
import CandidateManagement from '../pages/CandidateManagement';
import CandidateDetail from '../pages/candidates/CandidateDetail';
import CompanyProfile from '../pages/settings/CompanyProfile';
import CompanyVerification from '../pages/CompanyVerification';
import UserManagement from '../pages/UserManagement';
import Settings from '../pages/Settings';
import JobCreate from '../pages/jobs/JobCreate';
import JobEdit from '../pages/jobs/JobEdit';
import JobDetail from '../pages/jobs/JobDetail';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import PrivacyRights from '../pages/PrivacyRights';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // 如果正在加载认证状态，显示加载页面
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <div style={{ fontSize: '18px' }}>加载中...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy-rights" element={<PrivacyRights />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="jobs" element={<JobManagement />} />
        <Route path="jobs/create" element={<JobCreate />} />
        <Route path="jobs/detail/:id" element={<JobDetail />} />
        <Route path="jobs/edit/:id" element={<JobEdit />} />
        <Route path="candidates" element={<CandidateManagement />} />
        <Route path="candidates/:id" element={<CandidateDetail />} />
        <Route path="interviews" element={<InterviewList />} />
        <Route path="company/profile" element={<CompanyProfile />} />
        <Route path="company/verification" element={<CompanyVerification />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/privacy-rights" element={<PrivacyRights />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}; 
