
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Role } from './types';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

const AppRoutes: React.FC = () => {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/teacher"
                element={
                    <ProtectedRoute allowedRoles={[Role.TEACHER]}>
                        <TeacherDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student"
                element={
                    <ProtectedRoute allowedRoles={[Role.STUDENT]}>
                        <StudentDashboard />
                    </ProtectedRoute>
                }
            />
            <Route path="/" element={<Navigate to={user ? `/${user.role.toLowerCase()}` : '/login'} />} />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <HashRouter>
                <AppRoutes />
            </HashRouter>
        </AuthProvider>
    );
};

export default App;
