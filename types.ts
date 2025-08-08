export enum Role {
    ADMIN = 'ADMIN',
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    password?: string; // For login
    permissionGranted?: boolean; // For teachers
    registerNumber?: string; // For students
}

export interface Hall {
    id: string;
    name: string;
    rows: number;
    cols: number;
}

export interface StudentSet {
    id: string;
    subject: string;
    studentCount: number;
}

export interface Exam {
    id:string;
    title: string;
    date: string;
    halls: Hall[];
    studentSets: StudentSet[];
    seatingPlan?: SeatingPlan;
    createdBy: string; // teacherId
}

export interface Seat {
    hallId: string;
    row: number;
    col: number;
    student?: {
        id: string;
        setId: string;
        setNumber: number;
    };
}

export interface SeatingPlan {
    [hallId: string]: Seat[][];
}
