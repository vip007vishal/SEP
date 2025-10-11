
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User } from '../types';
import { login as apiLogin, logout as apiLogout, loginStudent as apiLoginStudent, registerTeacher as apiRegisterTeacher, registerAdmin as apiRegisterAdmin } from '../services/authService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, pass: string) => Promise<User | null>;
    logout: () => void;
    loginStudent: (registerNumber: string, adminId: string) => Promise<User | null>;
    registerTeacher: (name: string, email: string, password: string, adminIdentifier: string) => Promise<User | null>;
    registerAdmin: (name: string, email: string, password: string, institutionName: string) => Promise<User | null>;
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

    const registerTeacher = async (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
        const newUser = await apiRegisterTeacher(name, email, password, adminIdentifier);
        // We don't log in the user automatically, just create the account.
        // An admin will need to grant permission.
        return newUser;
    };

    const registerAdmin = async (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
        const newUser = await apiRegisterAdmin(name, email, password, institutionName);
        // We don't log in the user automatically, just create the account.
        return newUser;
    };

    const loginStudent = async (registerNumber: string, adminId: string): Promise<User | null> => {
        const loggedInUser = await apiLoginStudent(registerNumber, adminId);
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
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loginStudent, registerTeacher, registerAdmin }}>
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