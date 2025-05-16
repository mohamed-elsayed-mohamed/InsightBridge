import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import { UserManagement } from './pages/admin/UserManagement';
import { UserPermissions } from './pages/admin/UserPermissions';
import { DatabaseConnections } from './pages/admin/DatabaseConnections';
import Unauthorized from './pages/Unauthorized';
import PrivateRoute from './components/PrivateRoute';
import DashboardPage from './pages/DashboardPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute requiredRole="Admin"><AdminDashboard /></PrivateRoute>} />
                <Route
                    path="/admin/users"
                    element={
                        <PrivateRoute requiredRole="Admin">
                            <UserManagement />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/admin/permissions"
                    element={
                        <PrivateRoute requiredRole="Admin">
                            <UserPermissions />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/admin/connections"
                    element={
                        <PrivateRoute requiredRole="Admin">
                            <DatabaseConnections />
                        </PrivateRoute>
                    }
                />

                {/* Redirect root to login */}
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
