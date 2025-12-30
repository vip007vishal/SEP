

import { User, Role, Exam, HallTemplate, StudentSetTemplate, AuditLog } from '../types';

// This object simulates the data that would be stored in your PostgreSQL database on KWS.
// By isolating it here, we create a clean separation between the data source and the service layer.
export const initialDbData: { users: User[], exams: Exam[], hallTemplates: HallTemplate[], studentSetTemplates: StudentSetTemplate[], auditLogs: AuditLog[] } = {
    users: [
        { id: 'admin01', name: 'Admin User', email: 'admin@exam.com', role: Role.ADMIN, password: 'password123', institutionName: 'Global Tech University' },
        { id: 'admin02', name: 'Second Admin', email: 'admin2@exam.com', role: Role.ADMIN, password: 'password123', institutionName: 'Innovate Institute' },
        { id: 'teacher01', name: 'Dr. Evelyn Reed', email: 'teacher1@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123', adminId: 'admin01' },
        { id: 'teacher02', name: 'Mr. Samuel Chen', email: 'teacher2@exam.com', role: Role.TEACHER, permissionGranted: false, password: 'password123' },
        { id: 'teacher03', name: 'Ms. Anya Sharma', email: 'teacher3@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123', adminId: 'admin01' },
        { id: 'teacher04', name: 'Ms. Nitya', email: 'teacher4@exam.com', role: Role.TEACHER, permissionGranted: true, password: 'password123', adminId: 'admin01' },
    ],
    exams: [
        {
            id: 'exam01',
            title: 'Mid-Term Examinations',
            date: '2024-09-15',
            halls: [
                { id: 'hallA', name: 'Hall A', layout: Array.from({length: 64}, (_, i) => ({id: `s${i}`, row: Math.floor(i/8), col: i % 8, type: 'standard'})), constraints: { type: 'no-limit', arrangement: 'horizontal' }, frontDirection: 'top' },
                { id: 'hallB', name: 'Hall B', layout: Array.from({length: 42}, (_, i) => ({id: `s${i}`, row: Math.floor(i/7), col: i % 7, type: 'standard'})), constraints: { type: 'no-limit', arrangement: 'horizontal' }, frontDirection: 'top' },
            ],
            studentSets: [
                { id: 'set101', subject: '101', studentCount: 50 },
                { id: 'set102', subject: '102', studentCount: 45 },
            ],
            seatingPlan: undefined,
            seatingType: 'normal',
            editorMode: 'ai',
            createdBy: 'teacher01',
            adminId: 'admin01'
        },
        {
            id: 'exam02',
            title: 'Finals - Advanced Mode',
            date: '2024-12-10',
            halls: [
                { id: 'hallC', name: 'Hall C', layout: Array.from({length: 50}, (_, i) => ({id: `s${i}`, row: Math.floor(i/10), col: i % 10, type: 'standard'})), constraints: { type: 'advanced', allowedSetIds: ['set201'], arrangement: 'vertical' }, frontDirection: 'left' },
            ],
            studentSets: [
                { id: 'set201', subject: '201', studentCount: 30 },
                { id: 'set202', subject: '202', studentCount: 20 },
            ],
            seatingPlan: undefined,
            seatingType: 'normal',
            editorMode: 'advanced',
            createdBy: 'teacher03',
            adminId: 'admin01'
        },
        {
            id: 'exam03',
            title: 'Pop Quiz - Classic Mode',
            date: '2024-10-25',
            halls: [
                { id: 'hallD', name: 'Hall D', layout: Array.from({length: 30}, (_, i) => ({id: `s${i}`, row: Math.floor(i/5), col: i % 5, type: 'standard'})), constraints: { type: 'no-limit', arrangement: 'horizontal' }, frontDirection: 'bottom' },
            ],
            studentSets: [
                { id: 'set301', subject: '301', studentCount: 25 },
            ],
            seatingPlan: undefined,
            seatingType: 'fair',
            editorMode: 'classic',
            createdBy: 'teacher01',
            adminId: 'admin01'
        }
    ],
    hallTemplates: [
        { id: 'template01', name: 'Main Auditorium', layout: Array.from({length: 100}, (_, i) => ({id: `s${i}`, row: Math.floor(i/10), col: i % 10, type: 'standard'})), createdBy: 'teacher01', adminId: 'admin01' },
        { id: 'template02', name: 'Computer Lab 1', layout: Array.from({length: 40}, (_, i) => ({id: `s${i}`, row: Math.floor(i/8), col: i % 8, type: 'standard'})), createdBy: 'teacher01', adminId: 'admin01' },
    ],
    studentSetTemplates: [
        { id: 'settemplate01', subject: 'Physics 101', studentCount: 50, createdBy: 'teacher01', adminId: 'admin01' },
        { id: 'settemplate02', subject: 'Chemistry Lab', studentCount: 24, createdBy: 'teacher01', adminId: 'admin01' },
        { id: 'settemplate03', subject: 'Calculus III', studentCount: 45, createdBy: 'teacher03', adminId: 'admin01' },
    ],
    auditLogs: [
        { id: 'log1', adminId: 'admin01', actorName: 'Dr. Evelyn Reed', role: Role.TEACHER, action: 'CREATED_EXAM', details: 'Created exam "Mid-Term Examinations"', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'log2', adminId: 'admin01', actorName: 'Student 101001', role: Role.STUDENT, action: 'STUDENT_LOGIN', details: 'Accessed dashboard', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ]
};