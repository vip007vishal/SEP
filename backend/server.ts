import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateClassicSeatingPlanLogic, generateAISeatingPlanLogic } from './seatingLogic';
import { Role, User, Exam } from '../types';

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// The connection details are read from environment variables for security.
// See backend/README.md for instructions on how to set these up.
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres.kws.services',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER || 'sep',
    password: process.env.DB_PASSWORD, // This MUST be set as an environment variable
    database: process.env.DB_NAME || 'sep', // Assuming database name is 'sep'
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// --- AUTHENTICATION MIDDLEWARE ---
// This middleware protects routes that require a logged-in user.
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET || 'your_default_jwt_secret', (err: any, user: any) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
};

// Middleware to check if the user is an Admin
const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== Role.ADMIN) {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
};

// Middleware to check if the user is a Teacher
const isTeacher = (req: any, res: any, next: any) => {
    if (req.user.role !== Role.TEACHER) {
        return res.status(403).json({ message: "Access denied. Teachers only." });
    }
    next();
};

// --- API ROUTES ---

// Helper for consistent error handling
const asyncHandler = (fn: (req: any, res: any, next: any) => Promise<any>) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(err => {
        console.error(err);
        res.status(500).json({ message: "An internal server error occurred." });
    });
};

// --- AUTH ROUTES ---
app.post('/api/auth/register/admin', asyncHandler(async (req, res) => {
    const { name, email, password, institutionName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
        'INSERT INTO users (id, name, email, password, role, "institutionName", "permissionGranted") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, "institutionName"',
        [`admin-${Date.now()}`, name, email, hashedPassword, Role.ADMIN, institutionName, true]
    );
    res.status(201).json(result.rows[0]);
}));

app.post('/api/auth/register/teacher', asyncHandler(async (req, res) => {
    const { name, email, password, adminIdentifier } = req.body;
    
    // Find admin by institution name
    const adminRes = await pool.query('SELECT id FROM users WHERE "institutionName" = $1 AND role = $2', [adminIdentifier, Role.ADMIN]);
    if (adminRes.rows.length === 0) {
        return res.status(404).json({ message: "Institution not found." });
    }
    const adminId = adminRes.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
        'INSERT INTO users (id, name, email, password, role, "adminId", "permissionGranted") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role',
        [`teacher-${Date.now()}`, name, email, hashedPassword, Role.TEACHER, adminId, false]
    );
    res.status(201).json(result.rows[0]);
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { email, pass } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (user.role === Role.TEACHER && !user.permissionGranted) {
        return res.status(403).json({ message: 'Permission not granted by admin.' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'your_default_jwt_secret', { expiresIn: '1d' });
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
}));

app.post('/api/auth/login/student', asyncHandler(async (req, res) => {
    const { registerNumber, adminId } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE "registerNumber" = $1 AND "adminId" = $2 AND role = $3', [registerNumber, adminId, Role.STUDENT]);
    const user = result.rows[0];
    
    if (!user) {
        return res.status(404).json({ message: 'Student not found for this institution.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, registerNumber: user.registerNumber }, process.env.JWT_SECRET || 'your_default_jwt_secret', { expiresIn: '1d' });
    res.json({ user, token });
}));

// --- PUBLIC ROUTES ---
app.get('/api/institutions', asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT id, "institutionName" as name FROM users WHERE role = $1 AND "institutionName" IS NOT NULL', [Role.ADMIN]);
    res.json(result.rows);
}));

app.get('/api/users/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, email, role, "institutionName", "adminId" FROM users WHERE id = $1', [id]);
    res.json(result.rows[0]);
}));

// --- ADMIN ROUTES ---
app.get('/api/admins/:adminId/teachers', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT id, name, email, role, "permissionGranted" FROM users WHERE "adminId" = $1 AND role = $2', [req.user.id, Role.TEACHER]);
    res.json(result.rows);
}));

app.get('/api/teachers/unassigned', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT id, name, email, role, "permissionGranted" FROM users WHERE "adminId" IS NULL AND role = $1', [Role.TEACHER]);
    res.json(result.rows);
}));

app.patch('/api/teachers/:teacherId/permission', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const { teacherId } = req.params;
    const result = await pool.query('UPDATE users SET "permissionGranted" = true, "adminId" = $1 WHERE id = $2 RETURNING *', [req.user.id, teacherId]);
    res.json(result.rows[0]);
}));

app.patch('/api/teachers/:teacherId/permission/revoke', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const { teacherId } = req.params;
    const result = await pool.query('UPDATE users SET "permissionGranted" = false WHERE id = $1 RETURNING *', [teacherId]);
    res.json(result.rows[0]);
}));

app.delete('/api/teachers/:teacherId', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    // In a real app, you might want to use a transaction here to delete exams and the teacher atomically.
    await pool.query('DELETE FROM exams WHERE "createdBy" = $1', [req.params.teacherId]);
    await pool.query('DELETE FROM users WHERE id = $1 AND "adminId" = $2', [req.params.teacherId, req.user.id]);
    res.status(204).send();
}));

app.get('/api/admins/:adminId/exams', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM exams WHERE "adminId" = $1 ORDER BY date DESC', [req.user.id]);
    res.json(result.rows);
}));


// --- TEACHER ROUTES ---
app.get('/api/teachers/:teacherId/exams', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM exams WHERE "createdBy" = $1 ORDER BY date DESC', [req.user.id]);
    res.json(result.rows);
}));

app.post('/api/exams', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
    const { examData } = req.body;
    const teacherId = req.user.id;
    const teacher = (await pool.query('SELECT "adminId" FROM users WHERE id = $1', [teacherId])).rows[0];

    const result = await pool.query(
        'INSERT INTO exams (id, title, date, halls, "studentSets", "aiSeatingRules", "seatingType", "editorMode", "createdBy", "adminId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [`exam-${Date.now()}`, examData.title, examData.date, JSON.stringify(examData.halls), JSON.stringify(examData.studentSets), examData.aiSeatingRules, examData.seatingType, examData.editorMode, teacherId, teacher.adminId]
    );
    res.status(201).json(result.rows[0]);
}));

app.put('/api/exams/:id', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { updatedExam } = req.body;
    const result = await pool.query(
        'UPDATE exams SET title = $1, date = $2, halls = $3, "studentSets" = $4, "seatingPlan" = $5, "aiSeatingRules" = $6, "seatingType" = $7, "editorMode" = $8 WHERE id = $9 AND "createdBy" = $10 RETURNING *',
        [updatedExam.title, updatedExam.date, JSON.stringify(updatedExam.halls), JSON.stringify(updatedExam.studentSets), JSON.stringify(updatedExam.seatingPlan), updatedExam.aiSeatingRules, updatedExam.seatingType, updatedExam.editorMode, id, req.user.id]
    );
    res.json(result.rows[0]);
}));

app.delete('/api/exams/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.user.role === Role.ADMIN) {
        await pool.query('DELETE FROM exams WHERE id = $1 AND "adminId" = $2', [id, req.user.id]);
    } else { // Teacher
        await pool.query('DELETE FROM exams WHERE id = $1 AND "createdBy" = $2', [id, req.user.id]);
    }
    res.status(204).send();
}));

// Template Routes (assuming only teachers manage them)
app.post('/api/hall-templates', authenticateToken, isTeacher, asyncHandler(async (req, res) => { /* ... SQL INSERT ... */ res.sendStatus(501); }));
app.get('/api/teachers/:teacherId/hall-templates', authenticateToken, isTeacher, asyncHandler(async (req, res) => { /* ... SQL SELECT ... */ res.json([]); }));
app.delete('/api/hall-templates/:id', authenticateToken, isTeacher, asyncHandler(async (req, res) => { /* ... SQL DELETE ... */ res.sendStatus(501); }));
app.post('/api/student-set-templates', authenticateToken, isTeacher, asyncHandler(async (req, res) => { /* ... SQL INSERT ... */ res.sendStatus(501); }));
app.get('/api/teachers/:teacherId/student-set-templates', authenticateToken, isTeacher, asyncHandler(async (req, res) => { /* ... SQL SELECT ... */ res.json([]); }));
app.delete('/api/student-set-templates/:id', authenticateToken, isTeacher, asyncHandler(async (req, res) => { /* ... SQL DELETE ... */ res.sendStatus(501); }));


// --- STUDENT ROUTES ---
app.get('/api/students/:registerNumber/exams', authenticateToken, asyncHandler(async (req, res) => {
    const { adminId } = req.query;
    const registerNumber = req.user.registerNumber;
    const result = await pool.query(
        'SELECT * FROM exams WHERE "adminId" = $1 AND "seatingPlan" IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements("studentSets") as s WHERE s->\'students\' @> $2::jsonb)',
        [adminId, JSON.stringify(registerNumber)]
    );
    res.json(result.rows);
}));

// --- SEATING PLAN GENERATION ---
app.post('/api/seating-plan/classic', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
    const { examData } = req.body;
    const result = generateClassicSeatingPlanLogic(examData.halls, examData.studentSets, examData.seatingType);
    res.json(result);
}));

app.post('/api/seating-plan/ai', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
    const { examData } = req.body;
    const result = await generateAISeatingPlanLogic(examData.halls, examData.studentSets, examData.rules, examData.seatingType);
    res.json(result);
}));


// --- SERVER START ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
