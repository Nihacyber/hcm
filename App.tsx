import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Schools = React.lazy(() => import('./pages/Schools'));
const Teachers = React.lazy(() => import('./pages/Teachers'));
const Trainings = React.lazy(() => import('./pages/Trainings'));
const AttendanceAnalytics = React.lazy(() => import('./pages/AttendanceAnalytics'));
const Audits = React.lazy(() => import('./pages/Audits'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Mentors = React.lazy(() => import('./pages/Mentors'));
const Management = React.lazy(() => import('./pages/Management'));
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
import Login from './auth/Login';
import TeacherLogin from './auth/TeacherLogin';

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For demo purposes, automatically log in the user
  React.useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'admin');
    }
  }, []);

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Auth route component (redirects logged-in users away from login)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Teacher Protected route component
const TeacherProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isTeacherLoggedIn = localStorage.getItem('isTeacherLoggedIn') === 'true';

  if (!isTeacherLoggedIn) {
    return <Navigate to="/teacher-login" replace />;
  }

  return <>{children}</>;
};

// Teacher Auth route component (redirects logged-in teachers away from login)
const TeacherAuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isTeacherLoggedIn = localStorage.getItem('isTeacherLoggedIn') === 'true';

  if (isTeacherLoggedIn) {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <HashRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <React.Suspense fallback={<div className="p-6">Loading...</div>}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <AuthRoute>
                <Login />
              </AuthRoute>
            }
          />

          {/* Teacher routes */}
          <Route
            path="/teacher-login"
            element={
              <TeacherAuthRoute>
                <TeacherLogin />
              </TeacherAuthRoute>
            }
          />
          <Route
            path="/teacher-dashboard"
            element={
              <TeacherProtectedRoute>
                <TeacherDashboard />
              </TeacherProtectedRoute>
            }
          />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/schools" 
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Schools />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teachers" 
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Teachers />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/trainings"
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Trainings />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-analytics"
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <AttendanceAnalytics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audits"
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Audits />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/mentors" 
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Mentors />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/management" 
            element={
              <ProtectedRoute>
                <AppLayout isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Management />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </React.Suspense>
    </HashRouter>
  );
};

export default App;