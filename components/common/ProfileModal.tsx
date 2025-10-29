import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import { findUserById } from '../../services/api';
import Card from './Card';
import Button from './Button';

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose }) => {
    const [institutionName, setInstitutionName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        
        setIsLoading(true);
        if (user.role === Role.ADMIN) {
            setInstitutionName(user.institutionName || 'N/A');
            setIsLoading(false);
        } else if (user.role === Role.TEACHER && user.adminId) {
            findUserById(user.adminId).then(admin => {
                if (admin) {
                    setInstitutionName(admin.institutionName || 'N/A');
                } else {
                    setInstitutionName('Institution not found');
                }
                setIsLoading(false);
            });
        } else {
             setInstitutionName('N/A');
             setIsLoading(false);
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const getRoleName = (role: Role) => {
        switch(role) {
            case Role.ADMIN: return "Admin";
            case Role.TEACHER: return "Teacher";
            case Role.STUDENT: return "Student";
            default: return "";
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-center text-slate-800 dark:text-slate-200">User Profile</h2>
                <Card>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Username</p>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email ID</p>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 break-all">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Institution / Organization</p>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">{isLoading ? 'Loading...' : institutionName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Role</p>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">{getRoleName(user.role)}</p>
                        </div>
                    </div>
                </Card>
                <div className="mt-6 text-right">
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;