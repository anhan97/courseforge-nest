import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Lesson } from './pages/Lesson'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminCourses from './pages/AdminCourses'
import CourseOutline from './pages/CourseOutline'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import { useState, useEffect } from 'react'

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, loading, user } = useAuth();

  // Always show loading spinner while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only redirect to login if loading is complete AND user is not authenticated
  if (!loading && !isAuthenticated) {
    console.log('ProtectedRoute: Redirecting to login - not authenticated');
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'STUDENT') {
      return <Navigate to="/courses" replace />;
    }
    // Default redirect for unknown roles - send to login to be safe
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Protected Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();

  // Always show loading spinner while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only check authentication after loading is complete
  if (!loading && !isAuthenticated) {
    console.log('AdminRoute: Redirecting to admin login - not authenticated');
    return <Navigate to="/admin/login" replace />;
  }

  if (!loading && user?.role !== 'ADMIN') {
    console.log('AdminRoute: Redirecting to login - not admin role');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect to appropriate dashboard if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Redirect based on user role
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'STUDENT') {
      return <Navigate to="/courses" replace />;
    }
  }

  return <>{children}</>;
}

// Admin Public Route (for admin login page)
function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated && user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (isAuthenticated && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Smart redirect component for default route
function DefaultRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.role === 'STUDENT') {
    return <Navigate to="/courses" replace />;
  }
  // Default redirect for unknown roles
  return <Navigate to="/login" replace />;
}

// Legacy dashboard component (no longer needed)
function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.firstName || user?.email}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Instructor Dashboard | Status: {user?.isVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Created Courses</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">5</p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100">Total Students</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">248</p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Revenue</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">$2,450</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                Create New Course
              </button>
              <a
                href="/courses"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View All Courses
              </a>
              <button className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Force light mode for now - disable automatic dark mode
    document.documentElement.classList.remove('dark');
    
    // Clear any existing dark theme setting if it's causing issues
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      localStorage.setItem('theme', 'light');
    }
    
    // Only apply dark mode if explicitly set by user
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />

            {/* Admin Public Routes */}
            <Route 
              path="/admin/login" 
              element={
                <AdminPublicRoute>
                  <AdminLogin />
                </AdminPublicRoute>
              } 
            />

            {/* Admin Protected Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/courses" 
              element={
                <AdminRoute>
                  <AdminCourses />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/courses/:courseId/outline" 
              element={
                <AdminRoute>
                  <CourseOutline />
                </AdminRoute>
              } 
            />

            {/* Regular User Protected Routes */}
            <Route 
              path="/courses" 
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                  <Courses />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/courses/:courseId" 
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                  <CourseDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/courses/:courseId/modules/:moduleId/lessons/:lessonId" 
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                  <Lesson />
                </ProtectedRoute>
              } 
            />
            {/* Removed: Legacy instructor dashboard route */}
            <Route 
              path="/lesson" 
              element={
                <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                  <Lesson />
                </ProtectedRoute>
              } 
            />

            {/* Default Routes */}
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Catch all - redirect based on auth status */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
