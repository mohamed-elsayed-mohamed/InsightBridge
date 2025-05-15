import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import UserManagement from './pages/admin/UserManagement';
import Unauthorized from './pages/Unauthorized';
import PrivateRoute from './components/PrivateRoute';
import DashboardPage from './pages/DashboardPage';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Protected routes */}
                <Route
                    path="/admin/users"
                    element={
                        <PrivateRoute requiredRole="Admin">
                            <UserManagement />
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
