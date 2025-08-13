import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import LeetCodeTasks from './pages/LeetCode/LeetCodeTasks';
import TaskDetails from './pages/LeetCode/TaskDetails';
import TaskForm from './pages/LeetCode/TaskForm';
import TaskSubmissions from './pages/LeetCode/TaskSubmissions';
import MyPractice from './pages/LeetCode/MyPractice';
import CommunityPractice from './pages/LeetCode/CommunityPractice';
import SubmissionDetails from './pages/LeetCode/SubmissionDetails';
import TrainingSessions from './pages/Training/TrainingSessions';
import SessionDetails from './pages/Training/SessionDetails';
import TrainingReports from './pages/Training/TrainingReports';
import ReportDetails from './pages/Training/ReportDetails';
import SubmitReport from './pages/Training/SubmitReport';
import MyTrainingReports from './pages/Training/MyTrainingReports';
import PublicReportView from './pages/Training/PublicReportView';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import TaskManagement from './pages/Admin/TaskManagement';
import TrainingManagement from './pages/Admin/TrainingManagement';
import AdminTrainingReports from './pages/Admin/TrainingReports';
import LeetCodeAdmin from './pages/Admin/LeetCodeAdmin';
import AdminSubmissions from './pages/LeetCode/AdminSubmissions';
import Profile from './pages/Profile/Profile';
import ActivityPage from './pages/Activity/ActivityPage';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  // console.log('🔍 ProtectedRoute - loading:', loading, 'user:', !!user, 'adminOnly:', adminOnly);

  if (loading) {
    // console.log('🔍 ProtectedRoute - showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // console.log('🔍 ProtectedRoute - no user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    // console.log('🔍 ProtectedRoute - user not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // console.log('🔍 ProtectedRoute - rendering children');
  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // console.log('🔍 PublicRoute - loading:', loading, 'user:', !!user);

  if (loading) {
    // console.log('🔍 PublicRoute - showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    // console.log('🔍 PublicRoute - user exists, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // console.log('🔍 PublicRoute - no user, rendering children (login page)');
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />

              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* LeetCode Routes */}
                <Route path="leetcode">
                  <Route path="tasks" element={<LeetCodeTasks />} />
                  <Route path="tasks/new" element={
                    <ProtectedRoute adminOnly>
                      <TaskForm />
                    </ProtectedRoute>
                  } />
                  <Route path="tasks/:taskId/edit" element={
                    <ProtectedRoute adminOnly>
                      <TaskForm />
                    </ProtectedRoute>
                  } />
                  <Route path="tasks/:taskId" element={<TaskDetails />} />
                  <Route path="tasks/:taskId/submissions" element={
                    <ProtectedRoute adminOnly>
                      <TaskSubmissions />
                    </ProtectedRoute>
                  } />
                  <Route path="my-practice" element={<MyPractice />} />
                  <Route path="community-practice" element={<CommunityPractice />} />
                  <Route path="submissions/:submissionId" element={<SubmissionDetails />} />
                </Route>

                {/* Training Routes */}
                <Route path="training">
                  <Route path="sessions" element={<TrainingSessions />} />
                  <Route path="sessions/:sessionId" element={<SessionDetails />} />
                  <Route path="sessions/:sessionId/submit-report" element={<SubmitReport />} />
                  <Route path="sessions/:sessionId/public-report" element={<PublicReportView />} />
                  <Route path="reports" element={<Navigate to="my" replace />} />
                  <Route path="reports/my" element={<MyTrainingReports />} />
                  <Route path="reports/submit/:sessionId" element={<SubmitReport />} />
                  <Route path="reports/all" element={<TrainingReports />} />
                  <Route path="reports/:reportId" element={<ReportDetails />} />
                  <Route path="submit-report" element={<SubmitReport />} />
                  <Route path="activity" element={<ActivityPage />} />
                </Route>

                {/* Admin Routes */}
                <Route path="admin">
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="users" element={
                    <ProtectedRoute adminOnly>
                      <UserManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="tasks" element={
                    <ProtectedRoute adminOnly>
                      <TaskManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="leetcode" element={
                    <ProtectedRoute adminOnly>
                      <LeetCodeAdmin />
                    </ProtectedRoute>
                  }>
                    <Route index element={<LeetCodeAdmin />} />
                    <Route path="submissions" element={<AdminSubmissions />} />
                  </Route>
                  <Route path="training" element={
                    <ProtectedRoute adminOnly>
                      <TrainingManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="training-reports" element={
                    <ProtectedRoute adminOnly>
                      <AdminTrainingReports />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* Profile Route */}
                <Route path="profile" element={<Profile />} />
                
                {/* Settings redirect to Profile */}
                <Route path="settings" element={<Navigate to="/profile" replace />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
