import { User, Role, Exam, HallTemplate, StudentSetTemplate } from '../types';

// This object simulates the data that would be stored in your PostgreSQL database on KWS.
// By isolating it here, we create a clean separation between the data source and the service layer.
export const initialDbData: { users: User[], exams: Exam[], hallTemplates: HallTemplate[], studentSetTemplates: StudentSetTemplate[] } = {
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
                { id: 'hallA', name: 'Hall A', layout: Array.from({length: 64}, (_, i) => ({id: `s${i}`, row: Math.floor(i/8), col: i % 8, type: 'standard'})), constraints: { type: 'no-limit', arrangement: 'horizontal' } },
                { id: 'hallB', name: 'Hall B', layout: Array.from({length: 42}, (_, i) => ({id: `s${i}`, row: Math.floor(i/7), col: i % 7, type: 'standard'})), constraints: { type: 'no-limit', arrangement: 'horizontal' } },
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
    ]
};
