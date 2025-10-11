import { User, Role } from '../types';
import { findUserByEmail, createTeacherUser, createAdminUser } from './examService';

// In a real app, this would be an API call. We now use examService as our data source.
export const login = async (email: string, pass: string): Promise<User | null> => {
    const user = await findUserByEmail(email);

    if (user && user.password === pass) {
        // For teachers, check if they have permission
        if (user.role === Role.TEACHER && !user.permissionGranted) {
            console.warn(`Teacher ${user.name} login attempt failed: Permission not granted.`);
            // We allow login but the UI should reflect the lack of permission
            return Promise.resolve(user);
        } else {
            return Promise.resolve(user);
        }
    } else {
        return Promise.resolve(null);
    }
};

export const registerAdmin = (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
    // Delegate admin creation to the centralized examService
    return createAdminUser(name, email, password, institutionName);
};

export const registerTeacher = (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
    // Delegate teacher creation to the centralized examService
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
        // In a real app, you would verify this student exists.
        // For this demo, any numeric ID is considered valid for login.
        return Promise.resolve(studentUser);
    } else {
        return Promise.resolve(null);
    }
};


export const logout = (): Promise<void> => {
    console.log("User logged out.");
    return Promise.resolve();
};