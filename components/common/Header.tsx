
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

const LogoutIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getRoleName = (role: Role) => {
        switch(role) {
            case Role.ADMIN: return "Admin";
            case Role.TEACHER: return "Teacher";
            case Role.STUDENT: return "Student";
            default: return "";
        }
    }

    return (
        <header className="bg-white shadow-md mb-8">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-violet-700">
                        Smart Exam Planner
                    </h1>
                     {user && <p className="text-sm text-slate-500">Welcome, {user.name} ({getRoleName(user.role)})</p>}
                </div>
                {user && (
                    <button
                        onClick={handleLogout}
                        className="flex items-center text-slate-600 hover:text-violet-700 transition"
                    >
                        <LogoutIcon />
                        Logout
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
