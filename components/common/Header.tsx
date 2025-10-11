import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import ProfileModal from './ProfileModal';

const LogoutIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const ProfileIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);


const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
        <>
            <header className="bg-white dark:bg-slate-800 shadow-md dark:shadow-none dark:border-b dark:border-slate-700 mb-8">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Logo className="h-9 w-9" />
                        <div>
                            <h1 className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                                Smart Exam Planner
                            </h1>
                             {user && <p className="text-sm text-slate-500 dark:text-slate-400">Welcome, {user.name} ({getRoleName(user.role)})</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && (
                            <>
                                {(user.role === Role.ADMIN || user.role === Role.TEACHER) && (
                                    <button
                                        onClick={() => setIsProfileModalOpen(true)}
                                        className="hidden sm:flex items-center text-slate-600 hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-400 transition"
                                        aria-label="View Profile"
                                    >
                                        <ProfileIcon />
                                        <span className="hidden lg:inline">Profile</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center text-slate-600 hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-400 transition"
                                    aria-label="Logout"
                                >
                                    <LogoutIcon />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        )}
                        <ThemeToggle />
                    </div>
                </div>
            </header>
            {user && (user.role === Role.ADMIN || user.role === Role.TEACHER) && (
                <ProfileModal 
                    user={user}
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
            )}
        </>
    );
};

export default Header;