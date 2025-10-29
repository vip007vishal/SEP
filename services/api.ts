import { API_BASE_URL } from '../config';
import { User, Role, Exam, HallTemplate, StudentSetTemplate, SeatingPlan, SeatDefinition } from '../types';

const getAuthToken = () => localStorage.getItem('authToken');

const request = async (method: string, path: string, body?: any): Promise<any> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api${path}`, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'An unknown error occurred');
        }
        // Handle responses with no content (e.g., DELETE)
        if (response.status === 204) {
            return true;
        }
        return response.json();
    } catch (error) {
        console.error(`API Error: ${method} ${path}`, error);
        throw error;
    }
};


// --- Auth ---
export const login = (email: string, pass: string): Promise<{ user: User, token: string }> => {
    return request('POST', '/auth/login', { email, pass });
};

export const registerAdmin = (name: string, email: string, password: string, institutionName: string): Promise<User> => {
    return request('POST', '/auth/register/admin', { name, email, password, institutionName });
};

export const registerTeacher = (name: string, email: string, password: string, adminIdentifier: string): Promise<User> => {
    return request('POST', '/auth/register/teacher', { name, email, password, adminIdentifier });
};

export const loginStudent = (registerNumber: string, adminId: string): Promise<{user: User, token: string}> => {
    return request('POST', '/auth/login/student', { registerNumber, adminId });
};

// --- User & Institution ---
export const getInstitutions = (): Promise<{ id: string, name: string }[]> => {
    return request('GET', '/institutions');
};

export const findUserById = (id: string): Promise<User> => {
    return request('GET', `/users/${id}`);
};


// --- Admin/Teacher Management ---
export const getTeachersForAdmin = (adminId: string): Promise<User[]> => {
    return request('GET', `/admins/${adminId}/teachers`);
};

export const getUnassignedTeachers = (): Promise<User[]> => {
    return request('GET', '/teachers/unassigned');
};

export const grantTeacherPermission = (teacherId: string, adminId: string): Promise<User> => {
    return request('PATCH', `/teachers/${teacherId}/permission`, { adminId });
};

export const revokeTeacherPermission = (teacherId: string): Promise<User> => {
    return request('PATCH', `/teachers/${teacherId}/permission/revoke`);
};

export const deleteTeacher = (teacherId: string, adminId: string): Promise<boolean> => {
    return request('DELETE', `/teachers/${teacherId}`);
};


// --- Exam Management ---
export const getExamsForAdmin = (adminId: string): Promise<Exam[]> => {
    return request('GET', `/admins/${adminId}/exams`);
};

export const getExamsForStudent = (registerNumber: string, adminId: string): Promise<Exam[]> => {
    return request('GET', `/students/${registerNumber}/exams?adminId=${adminId}`);
};

export const getExamsForTeacher = (teacherId: string): Promise<Exam[]> => {
    return request('GET', `/teachers/${teacherId}/exams`);
};

export const createExam = (examData: any, teacherId: string): Promise<Exam> => {
    return request('POST', '/exams', { examData });
};

export const updateExam = (updatedExam: Exam): Promise<Exam> => {
    return request('PUT', `/exams/${updatedExam.id}`, { updatedExam });
};

export const deleteExam = (examId: string, ownerId: string, role: Role): Promise<boolean> => {
    return request('DELETE', `/exams/${examId}`);
};


// --- Seating Plan Generation ---
export const generateClassicSeatingPlan = (examData: any): Promise<{ plan: SeatingPlan | null; message?: string }> => {
    return request('POST', '/seating-plan/classic', { examData });
};

export const generateSeatingPlan = (examData: any): Promise<{ plan: SeatingPlan | null; message?: string }> => {
    return request('POST', '/seating-plan/ai', { examData });
};


// --- Template Management ---
export const getHallTemplatesForTeacher = (teacherId: string): Promise<HallTemplate[]> => {
    return request('GET', `/teachers/${teacherId}/hall-templates`);
};

export const createHallTemplate = (templateData: { name: string; layout: SeatDefinition[]; }, teacherId: string): Promise<HallTemplate> => {
    return request('POST', '/hall-templates', { templateData });
};

export const deleteHallTemplate = (templateId: string, teacherId: string): Promise<boolean> => {
    return request('DELETE', `/hall-templates/${templateId}`);
};

export const getStudentSetTemplatesForTeacher = (teacherId: string): Promise<StudentSetTemplate[]> => {
    return request('GET', `/teachers/${teacherId}/student-set-templates`);
};

export const createStudentSetTemplate = (templateData: { subject: string; studentCount: number; }, teacherId: string): Promise<StudentSetTemplate> => {
    return request('POST', '/student-set-templates', { templateData });
};

export const deleteStudentSetTemplate = (templateId: string, teacherId: string): Promise<boolean> => {
    return request('DELETE', `/student-set-templates/${templateId}`);
};
