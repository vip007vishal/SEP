
import { User, Role, Exam } from './types';

export const MOCK_USERS: User[] = [
    { id: 'admin01', name: 'Admin User', email: 'admin@exam.com', role: Role.ADMIN },
    { id: 'teacher01', name: 'Dr. Meenakshi', email: 'teacher1@exam.com', role: Role.TEACHER, permissionGranted: true },
    { id: 'teacher02', name: 'Mr. Praveen Kumar', email: 'teacher2@exam.com', role: Role.TEACHER, permissionGranted: false },
    { id: 'teacher03', name: 'Mrs. Leela Rani', email: 'teacher3@exam.com', role: Role.TEACHER, permissionGranted: true },
];

export const MOCK_EXAMS: Exam[] = [
    {
        id: 'exam01',
        title: 'End Semester Exam',
        date: '2025-09-15',
        halls: [
            { id: 'hallA', name: 'Hall A', rows: 8, cols: 8 },
            { id: 'hallB', name: 'Hall B', rows: 6, cols: 7 },
        ],
        studentSets: [
            { id: 'set101', subject: '101', studentCount: 50 },
            { id: 'set102', subject: '102', studentCount: 45 },
        ],
        seatingPlan: undefined,
        createdBy: 'teacher01',
    }
];

export const SET_COLORS = [
    'bg-sky-200', 'bg-emerald-200', 'bg-amber-200', 'bg-violet-200', 'bg-rose-200',
    'bg-cyan-200', 'bg-lime-200', 'bg-orange-200', 'bg-purple-200', 'bg-pink-200'
];