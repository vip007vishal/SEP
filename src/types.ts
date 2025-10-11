export enum Role {
    ADMIN = 'ADMIN',
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
}

export type SeatType = 'standard' | 'accessible' | 'faculty';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    password?: string; // For login
    permissionGranted?: boolean; // For teachers
    registerNumber?: string; // For students
    adminId?: string; // Link teacher to an admin, or student to an institution session
    institutionName?: string; // For admins
}

export interface SeatDefinition {
    id: string;
    row: number;
    col: number;
    type: SeatType;
}

export interface HallConstraint {
    type: 'no-limit' | 'advanced';
    allowedSetIds?: string[];
}

export interface Hall {
    id: string;
    name: string;
    layout: SeatDefinition[];
    constraints?: HallConstraint;
}

export interface HallTemplate {
    id: string;
    name: string;
    layout: SeatDefinition[];
    createdBy: string; // teacherId
    adminId: string;
}

export interface StudentSetTemplate {
    id: string;
    subject: string;
    studentCount: number;
    createdBy: string; // teacherId
    adminId: string;
}

export interface StudentSet {
    id: string;
    subject: string;
    studentCount: number;
    students?: string[]; // Array of student register numbers, e.g., from an Excel file
}

export interface Exam {
    id:string;
    title: string;
    date: string;
    halls: Hall[];
    studentSets: StudentSet[];
    seatingPlan?: SeatingPlan;
    createdBy: string; // teacherId
    adminId: string;
}

// FIX: Define and export the StudentInfo interface to resolve the import error.
export interface StudentInfo {
    id: string; // This will now be the actual student register number
    setId: string;
    setNumber: number;
}

export interface Seat extends SeatDefinition {
    hallId: string;
    student?: StudentInfo;
}

export interface SeatingPlan {
    [hallId: string]: Seat[][];
}