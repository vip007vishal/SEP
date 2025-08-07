
import { MOCK_USERS } from '../constants';
import { User, Role } from '../types';

// In a real app, this would be an API call. We use mock data here.
// The password check is simplified for this demo.
export const login = (email: string, pass: string): Promise<User | null> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simplified password check for demo
            if (pass !== 'password123') {
                resolve(null);
                return;
            }
            const user = MOCK_USERS.find(u => u.email === email);
            if (user) {
                // For teachers, check if they have permission
                if (user.role === Role.TEACHER && !user.permissionGranted) {
                    console.warn(`Teacher ${user.name} login attempt failed: Permission not granted.`);
                    // We allow login but the UI should reflect the lack of permission
                    resolve(user);
                } else {
                    resolve(user);
                }
            } else {
                resolve(null);
            }
        }, 500);
    });
};

export const loginStudent = (registerNumber: string): Promise<User | null> => {
    return new Promise(resolve => {
        // For this demo, we allow any numeric register number to log in.
        // The dashboard will then check for actual exam assignments.
        // A small delay to simulate an API call.
        setTimeout(() => {
             if (/^\d+$/.test(registerNumber) && registerNumber.length > 0) {
                const studentUser: User = {
                    id: registerNumber,
                    name: `Student ${registerNumber}`,
                    email: '',
                    role: Role.STUDENT,
                    registerNumber: registerNumber,
                };
                resolve(studentUser);
            } else {
                resolve(null);
            }
        }, 300);
    });
};


export const logout = (): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("User logged out.");
            resolve();
        }, 200);
    });
};
