
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { login as apiLogin, logout as apiLogout, loginStudent as apiLoginStudent, registerTeacher as apiRegisterTeacher } from '../services/authService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, pass: string) => Promise<User | null>;
    logout: () => void;
    loginStudent: (registerNumber: string) => Promise<User | null>;
    registerTeacher: (name: string, email: string, password: string) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const login = async (email: string, pass: string): Promise<User | null> => {
        const loggedInUser = await apiLogin(email, pass);
        if (loggedInUser) {
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
        }
        return loggedInUser;
    };

    const registerTeacher = async (name: string, email: string, password: string): Promise<User | null> => {
        const newUser = await apiRegisterTeacher(name, email, password);
        // We don't log in the user automatically, just create the account.
        // An admin will need to grant permission.
        return newUser;
    };

    const loginStudent = async (registerNumber: string): Promise<User | null> => {
        const loggedInUser = await apiLoginStudent(registerNumber);
        if (loggedInUser) {
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
        }
        return loggedInUser;
    };

    const logout = () => {
        apiLogout();
        setUser(null);
        localStorage.removeItem('user');
    };
    
    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loginStudent, registerTeacher }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};