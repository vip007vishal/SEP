
import { User, Role } from '../types';
import { findUserByEmail, createTeacherUser, createAdminUser } from './examService';

export const login = async (email: string, pass: string): Promise<User | null> => {
    const user = await findUserByEmail(email);

    if (user && user.password === pass) {
        // Super Admin always allowed
        if (user.role === Role.SUPER_ADMIN) return user;

        // Admins and Teachers need permission granted by Super Admin or Admin respectively
        if ((user.role === Role.ADMIN || user.role === Role.TEACHER) && !user.permissionGranted) {
            console.warn(`${user.role} ${user.name} login attempt failed: Permission not granted.`);
            return Promise.resolve(user); // Returning user, UI handles "Pending" status
        }
        return Promise.resolve(user);
    }
    return Promise.resolve(null);
};

export const registerAdmin = (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
    return createAdminUser(name, email, password, institutionName);
};

export const registerTeacher = (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
    return createTeacherUser(name, email, password, adminIdentifier);
};

export const loginStudent = (registerNumber: string, adminId: string): Promise<User | null> => {
     if (/^\d+$/.test(registerNumber) && registerNumber.length > 0) {
        const studentUser: User = {
            id: registerNumber,
            name: `Student ${registerNumber}`,
            email: '',
            role: Role.STUDENT,
            registerNumber: registerNumber,
            adminId: adminId,
        };
        return Promise.resolve(studentUser);
    }
    return Promise.resolve(null);
};

export const logout = (): Promise<void> => {
    console.log("User logged out.");
    return Promise.resolve();
};