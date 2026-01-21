
import { GoogleGenAI, Type } from '@google/genai';
import { Hall, StudentSet, SeatingPlan, Exam, Seat, User, Role, HallTemplate, StudentSetTemplate, SeatDefinition, StudentInfo, AuditLog } from '../types';
import { initialDbData } from './mockData';

let db: typeof initialDbData = JSON.parse(JSON.stringify(initialDbData));

const API_LATENCY = 200;

// --- Helper for Logging ---
const logActivity = (adminId: string, actorName: string, role: Role, action: string, details: string) => {
    const newLog: AuditLog = {
        id: `log${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
        adminId,
        actorName,
        role,
        action,
        details,
        timestamp: new Date().toISOString()
    };
    db.auditLogs.unshift(newLog);
};

export const getAuditLogs = async (adminId: string): Promise<AuditLog[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    if (!adminId) return Promise.resolve(db.auditLogs); // For super admin
    return Promise.resolve(db.auditLogs.filter(l => l.adminId === adminId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
};

// --- Super Admin Functions ---

export const getAllAdmins = async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.users.filter(u => u.role === Role.ADMIN));
};

export const grantAdminPermission = async (adminId: string): Promise<User | undefined> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    let updated: User | undefined;
    db.users = db.users.map(u => {
        if (u.id === adminId && u.role === Role.ADMIN) {
            updated = { ...u, permissionGranted: true };
            return updated;
        }
        return u;
    });
    if (updated) logActivity('SYSTEM', 'Super Admin', Role.SUPER_ADMIN, 'GRANT_ADMIN_ACCESS', `Approved institution admin: ${updated.institutionName}`);
    return Promise.resolve(updated);
};

export const deleteAdminAndInstitution = async (adminId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const admin = db.users.find(u => u.id === adminId && u.role === Role.ADMIN);
    if (!admin) return false;

    // 1. Delete all users belonging to this admin
    db.users = db.users.filter(u => u.id !== adminId && u.adminId !== adminId);

    // 2. Delete all exams
    db.exams = db.exams.filter(e => e.adminId !== adminId);

    // 3. Delete all templates
    db.hallTemplates = db.hallTemplates.filter(t => t.adminId !== adminId);
    db.studentSetTemplates = db.studentSetTemplates.filter(t => t.adminId !== adminId);

    // 4. Delete logs for this admin
    db.auditLogs = db.auditLogs.filter(l => l.adminId !== adminId);

    logActivity('SYSTEM', 'Super Admin', Role.SUPER_ADMIN, 'DELETE_INSTITUTION', `Wiped institution and all data for: ${admin.institutionName}`);
    return true;
};

// --- User Management Functions ---

export const getInstitutions = async (): Promise<{ id: string, name: string }[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const institutions = db.users
        .filter(u => u.role === Role.ADMIN && u.institutionName && u.permissionGranted)
        .map(u => ({ id: u.id, name: u.institutionName! }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return Promise.resolve(institutions);
};

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.users.find(u => u.email.toLowerCase() === email.toLowerCase()));
};

export const findUserById = async (id: string): Promise<User | undefined> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.users.find(u => u.id === id));
};

export const createAdminUser = async (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return Promise.resolve(null); 
    }
    const newAdmin: User = {
        id: `admin${Date.now()}`, name, email, role: Role.ADMIN, password, institutionName, permissionGranted: false
    };
    db.users = [...db.users, newAdmin];
    return Promise.resolve(newAdmin);
};

export const createTeacherUser = async (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return Promise.resolve(null);
    }
    const admin = db.users.find(u => u.role === Role.ADMIN && (u.id === adminIdentifier || u.institutionName?.toLowerCase() === adminIdentifier.toLowerCase()));
    if (!admin) { return Promise.resolve(null); }

    const newTeacher: User = {
        id: `teacher${Date.now()}`, name, email, role: Role.TEACHER, permissionGranted: false, password, adminId: admin.id,
    };
    db.users = [...db.users, newTeacher];
    return Promise.resolve(newTeacher);
};

export const getTeachersForAdmin = async (adminId: string): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER' && u.adminId === adminId));
};

export const getUnassignedTeachers = async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.users.filter(u => u.role === 'TEACHER' && !u.permissionGranted));
};

export const grantTeacherPermission = async (teacherId: string, adminId: string): Promise<User | undefined> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    let updatedTeacher: User | undefined = undefined;
    db.users = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER') {
            updatedTeacher = { ...user, permissionGranted: true, adminId: adminId };
            return updatedTeacher;
        }
        return user;
    });
    if (updatedTeacher) {
        logActivity(adminId, 'Admin', Role.ADMIN, 'GRANTED_PERMISSION', `Approved teacher account: ${updatedTeacher.name}`);
    }
    return Promise.resolve(updatedTeacher);
};

export const revokeTeacherPermission = async (teacherId: string): Promise<User | undefined> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    let updatedTeacher: User | undefined = undefined;
    db.users = db.users.map(user => {
        if (user.id === teacherId && user.role === 'TEACHER') {
            updatedTeacher = { ...user, permissionGranted: false };
            return updatedTeacher;
        }
        return user;
    });
    if (updatedTeacher && updatedTeacher.adminId) {
        logActivity(updatedTeacher.adminId, 'Admin', Role.ADMIN, 'REVOKED_PERMISSION', `Revoked permission for: ${updatedTeacher.name}`);
    }
    return Promise.resolve(updatedTeacher);
};

export const deleteTeacher = async (teacherId: string, adminId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const initialCount = db.users.length;
    db.users = db.users.filter(u => u.id !== teacherId);
    if (db.users.length === initialCount) return Promise.resolve(false);
    db.exams = db.exams.filter(exam => exam.createdBy !== teacherId);
    db.hallTemplates = db.hallTemplates.filter(t => t.createdBy !== teacherId);
    db.studentSetTemplates = db.studentSetTemplates.filter(t => t.createdBy !== teacherId);
    logActivity(adminId, 'Admin', Role.ADMIN, 'DELETED_TEACHER', `Deleted teacher account.`);
    return Promise.resolve(true);
};

// --- Exam Management Functions ---

export const getExamsForAdmin = async (adminId: string): Promise<Exam[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve([...db.exams].filter(e => e.adminId === adminId).sort((a, b) => b.id.localeCompare(a.id)));
};

export const getExamsForStudent = async (registerNumber: string, adminId: string): Promise<Exam[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    for (const exam of db.exams) {
        if (!exam.seatingPlan && exam.adminId === adminId) {
            let result;
            if(exam.editorMode === 'classic' || exam.editorMode === 'advanced') {
                result = await generateClassicSeatingPlan({ halls: exam.halls, studentSets: exam.studentSets, seatingType: exam.seatingType });
            } else {
                result = await generateSeatingPlan({ halls: exam.halls, studentSets: exam.studentSets, rules: exam.aiSeatingRules, seatingType: exam.seatingType, editorMode: exam.editorMode });
            }
            if (result.plan) exam.seatingPlan = result.plan;
        }
    }
    const studentExams = db.exams.filter(exam => {
        if (exam.adminId !== adminId || !exam.seatingPlan) return false;
        return Object.values(exam.seatingPlan).some(hallPlan => 
            hallPlan.some(row => row.some(seat => seat?.student?.id === registerNumber))
        );
    });
    return Promise.resolve(studentExams.sort((a, b) => b.id.localeCompare(a.id)));
};

export const loginStudent = async (registerNumber: string, adminId: string): Promise<User | null> => {
     if (/^\d+$/.test(registerNumber) && registerNumber.length > 0) {
        const studentUser: User = {
            id: registerNumber, name: `Student ${registerNumber}`, email: '', role: Role.STUDENT, registerNumber: registerNumber, adminId: adminId,
        };
        logActivity(adminId, studentUser.name, Role.STUDENT, 'STUDENT_LOGIN', `Student ${registerNumber} logged in.`);
        return Promise.resolve(studentUser);
    }
    return Promise.resolve(null);
};

export const getExamsForTeacher = async (teacherId: string): Promise<Exam[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = db.users.find(u => u.id === teacherId);
    if (!teacher || !teacher.adminId) return Promise.resolve([]);
    return Promise.resolve(db.exams.filter(e => e.adminId === teacher.adminId).sort((a,b) => b.id.localeCompare(a.id)));
};

export const createExam = async (examData: any, teacherId: string): Promise<Exam> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = await findUserById(teacherId);
    if (!teacher || !teacher.adminId) throw new Error("Teacher not assigned.");

    const newExam: Exam = {
        ...examData,
        id: `exam${Date.now()}`,
        createdBy: teacherId,
        adminId: teacher.adminId,
        halls: examData.halls.map((h:any, i:number) => ({ ...h, id: `hall${Date.now()}${i}` })),
        studentSets: examData.studentSets.map((s:any, i:number) => ({ ...s, id: `set${Date.now()}${i}` })),
        seatingPlan: undefined,
    };
    db.exams = [...db.exams, newExam];
    logActivity(teacher.adminId, teacher.name, Role.TEACHER, 'CREATED_EXAM', `Created new exam: "${newExam.title}"`);
    return Promise.resolve(newExam);
};

export const updateExam = async (updatedExam: Exam): Promise<Exam> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = db.users.find(u => u.id === updatedExam.createdBy);
    db.exams = db.exams.map(exam => exam.id === updatedExam.id ? updatedExam : exam);
    if (teacher && teacher.adminId) logActivity(teacher.adminId, teacher.name, Role.TEACHER, 'UPDATED_EXAM', `Updated exam: "${updatedExam.title}"`);
    return Promise.resolve(updatedExam);
};

export const updateExamSeatingPlan = async (examId: string, newPlan: SeatingPlan, updaterId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const examIndex = db.exams.findIndex(e => e.id === examId);
    if (examIndex === -1) return Promise.resolve(false);
    db.exams[examIndex].seatingPlan = newPlan;
    return Promise.resolve(true);
};

export const deleteExam = async (examId: string, ownerId: string, role: Role): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const exam = db.exams.find(e => e.id === examId);
    if (!exam) return Promise.resolve(false);
    const isAllowed = (role === Role.ADMIN && exam.adminId === ownerId) || (role === Role.TEACHER);
    if (isAllowed) {
        const initialLen = db.exams.length;
        db.exams = db.exams.filter(e => e.id !== examId);
        if (db.exams.length < initialLen) {
            logActivity(exam.adminId, role === Role.ADMIN ? 'Admin' : 'Teacher', role, 'DELETED_EXAM', `Deleted exam: "${exam.title}"`);
            return Promise.resolve(true);
        }
    }
    return Promise.resolve(false);
};

// --- Template Management Functions ---

export const getHallTemplatesForTeacher = async (teacherId: string): Promise<HallTemplate[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = db.users.find(u => u.id === teacherId);
    if (!teacher || !teacher.adminId) return Promise.resolve([]);
    return Promise.resolve(db.hallTemplates.filter(t => t.adminId === teacher.adminId));
};

export const getHallTemplatesForAdmin = async (adminId: string): Promise<HallTemplate[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.hallTemplates.filter(t => t.adminId === adminId));
};

export const createHallTemplate = async (templateData: any, creatorId: string): Promise<HallTemplate> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const creator = await findUserById(creatorId);
    if (!creator) throw new Error("Creator not found.");
    const adminId = creator.role === Role.ADMIN ? creator.id : creator.adminId!;
    const newTemplate: HallTemplate = { ...templateData, id: `template${Date.now()}`, createdBy: creatorId, adminId: adminId };
    db.hallTemplates = [...db.hallTemplates, newTemplate];
    return Promise.resolve(newTemplate);
};

export const updateHallTemplate = async (templateId: string, data: any, updaterId: string): Promise<HallTemplate | null> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const index = db.hallTemplates.findIndex(t => t.id === templateId);
    if (index === -1) return Promise.resolve(null);
    const updated = { ...db.hallTemplates[index], ...data };
    db.hallTemplates[index] = updated;
    return Promise.resolve(updated);
};

export const deleteHallTemplate = async (templateId: string, deleterId: string, role: Role): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const initialLen = db.hallTemplates.length;
    db.hallTemplates = db.hallTemplates.filter(t => t.id !== templateId);
    return Promise.resolve(db.hallTemplates.length < initialLen);
};

export const getStudentSetTemplatesForTeacher = async (teacherId: string): Promise<StudentSetTemplate[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const teacher = db.users.find(u => u.id === teacherId);
    if (!teacher || !teacher.adminId) return Promise.resolve([]);
    return Promise.resolve(db.studentSetTemplates.filter(t => t.adminId === teacher.adminId));
};

export const getStudentSetTemplatesForAdmin = async (adminId: string): Promise<StudentSetTemplate[]> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    return Promise.resolve(db.studentSetTemplates.filter(t => t.adminId === adminId));
};

export const createStudentSetTemplate = async (templateData: any, creatorId: string): Promise<StudentSetTemplate> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const creator = await findUserById(creatorId);
    if (!creator) throw new Error("Creator not found.");
    const adminId = creator.role === Role.ADMIN ? creator.id : creator.adminId!;
    const newTemplate: StudentSetTemplate = { ...templateData, id: `settemplate${Date.now()}`, createdBy: creatorId, adminId: adminId };
    db.studentSetTemplates = [...db.studentSetTemplates, newTemplate];
    return Promise.resolve(newTemplate);
};

export const updateStudentSetTemplate = async (templateId: string, data: any, updaterId: string): Promise<StudentSetTemplate | null> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const index = db.studentSetTemplates.findIndex(t => t.id === templateId);
    if (index === -1) return Promise.resolve(null);
    const updated = { ...db.studentSetTemplates[index], ...data };
    db.studentSetTemplates[index] = updated;
    return Promise.resolve(updated);
};

export const deleteStudentSetTemplate = async (templateId: string, deleterId: string, role: Role): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, API_LATENCY));
    const initialLen = db.studentSetTemplates.length;
    db.studentSetTemplates = db.studentSetTemplates.filter(t => t.id !== templateId);
    return Promise.resolve(db.studentSetTemplates.length < initialLen);
};

const generateStudentList = (studentSets: StudentSet[]): StudentInfo[] => {
    const allStudents: StudentInfo[] = [];
    studentSets.forEach(set => {
        if (set.students && set.students.length > 0) {
            set.students.forEach((studentId, i) => allStudents.push({ id: studentId, setId: set.id, setNumber: i + 1 }));
        } else {
            const subjectPrefix = /^\d+$/.test(set.subject) ? set.subject : '999';
            const paddingLength = Math.max(2, set.studentCount.toString().length);
            for (let i = 0; i < set.studentCount; i++) {
                const studentPaddedNumber = (i + 1).toString().padStart(paddingLength, '0');
                allStudents.push({ id: `${subjectPrefix}${studentPaddedNumber}`, setId: set.id, setNumber: i + 1 });
            }
        }
    });
    return allStudents;
}

export const generateClassicSeatingPlan = async (
    examData: { halls: Hall[], studentSets: StudentSet[], seatingType?: 'normal' | 'fair' }
): Promise<{ plan: SeatingPlan | null; message?: string }> => {
    const { halls, studentSets, seatingType = 'normal' } = examData;
    const allStudents = generateStudentList(studentSets);
    const assignments = new Map<string, StudentInfo>();
    const studentQueues: { [setId: string]: StudentInfo[] } = {};
    studentSets.forEach(set => {
        studentQueues[set.id] = allStudents.filter(s => s.setId === set.id);
    });

    if (seatingType === 'fair') {
        let seatSkipCounter = 0;
        let setCycleIndex = 0;
        for (const hall of halls) {
            const seatsInHall = hall.layout
                .filter(seat => seat.type !== 'faculty')
                .sort((a, b) => {
                    const arrangement = hall.constraints?.arrangement || 'horizontal';
                    if (arrangement === 'vertical') {
                        if (a.col !== b.col) return a.col - b.col;
                        return a.row - b.row;
                    }
                    if (a.row !== b.row) return a.row - b.row;
                    return a.col - b.col;
                });
            const allPossibleSetIdsForHall = hall.constraints?.type === 'advanced'
                ? hall.constraints.allowedSetIds!
                : Object.keys(studentQueues);
            for (const seat of seatsInHall) {
                const eligibleSetsForThisHall = allPossibleSetIdsForHall.filter(id => studentQueues[id].length > 0);
                if (eligibleSetsForThisHall.length === 0) break;
                if (eligibleSetsForThisHall.length === 1) {
                    if (seatSkipCounter > 0) {
                        seatSkipCounter--;
                        continue;
                    }
                    const setIdToUse = eligibleSetsForThisHall[0];
                    if (studentQueues[setIdToUse] && studentQueues[setIdToUse].length > 0) {
                        const studentToAssign = studentQueues[setIdToUse].shift()!;
                        assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
                        seatSkipCounter = 1;
                    } else break;
                } else {
                    let studentToAssign: StudentInfo | undefined;
                    let triedSets = 0;
                    while (!studentToAssign && triedSets < eligibleSetsForThisHall.length) {
                        const currentSetId = eligibleSetsForThisHall[setCycleIndex % eligibleSetsForThisHall.length];
                        if (studentQueues[currentSetId].length > 0) studentToAssign = studentQueues[currentSetId].shift();
                        setCycleIndex++;
                        triedSets++;
                    }
                    if (studentToAssign) assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
                    else break;
                }
            }
        }
    } else {
        let setCycleIndex = 0;
        for (const hall of halls) {
            const seatsInHall = hall.layout
                .filter(seat => seat.type !== 'faculty')
                .sort((a, b) => {
                    const arrangement = hall.constraints?.arrangement || 'horizontal';
                    if (arrangement === 'vertical') {
                        if (a.col !== b.col) return a.col - b.col;
                        return a.row - b.row;
                    }
                    if (a.row !== b.row) return a.row - b.row;
                    return a.col - b.col;
                });
            const getEligibleSetsForHall = () => {
                const allRemaining = Object.keys(studentQueues).filter(id => studentQueues[id].length > 0);
                const allowedSetIds = hall.constraints?.type === 'advanced' ? hall.constraints.allowedSetIds : null;
                return allowedSetIds ? allRemaining.filter(id => allowedSetIds.includes(id)) : allRemaining;
            };
            for (const seat of seatsInHall) {
                const eligibleSetsForThisHall = getEligibleSetsForHall();
                if (eligibleSetsForThisHall.length === 0) break;
                let studentToAssign: StudentInfo | undefined;
                let triedSets = 0;
                while (!studentToAssign && triedSets < eligibleSetsForThisHall.length) {
                    const currentSetId = eligibleSetsForThisHall[setCycleIndex % eligibleSetsForThisHall.length];
                    if (studentQueues[currentSetId].length > 0) studentToAssign = studentQueues[currentSetId].shift();
                    setCycleIndex++;
                    triedSets++;
                }
                if (studentToAssign) assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
                else break;
            }
        }
    }
    const unassignedStudents = Object.values(studentQueues).flat();
    if (unassignedStudents.length > 0) {
        if (seatingType === 'fair') return { plan: null, message: "not enough seats for fair seating" };
        return { plan: null, message: `Failed to assign all students. ${unassignedStudents.length} students remain unplaced.` };
    }
    const finalPlan: SeatingPlan = {};
    halls.forEach(hall => {
        const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
        const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));
        const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
        hall.layout.forEach(seatDef => {
            const student = assignments.get(`${hall.id}-${seatDef.row}-${seatDef.col}`);
            hallGrid[seatDef.row][seatDef.col] = { ...seatDef, hallId: hall.id, ...(student && { student }) };
        });
        finalPlan[hall.id] = hallGrid;
    });
    return { plan: finalPlan, message: "Classic seating plan generated successfully!" };
};

export const generateSeatingPlan = async (
    examData: { halls: Hall[], studentSets: StudentSet[], rules?: string, seatingType?: 'normal' | 'fair', editorMode?: string }
): Promise<{ plan: SeatingPlan | null; message?: string }> => {
    const { halls, studentSets, rules, seatingType, editorMode } = examData;
    if (!process.env.API_KEY) return { plan: null, message: "CRITICAL: API_KEY environment variable not set." };
    const allStudents = generateStudentList(studentSets);
    const availableSeats = halls.flatMap(hall => hall.layout.filter(seat => seat.type !== 'faculty'));
    if (seatingType !== 'fair' && allStudents.length > availableSeats.length) {
        return { plan: null, message: `Not enough seats. Required: ${allStudents.length}, Available: ${availableSeats.length}.` };
    }
    const promptData = {
        halls: halls.map(h => ({ id: h.id, name: h.name, seats: h.layout.map(s => ({ row: s.row, col: s.col, type: s.type })), constraints: h.constraints })),
        studentSets: studentSets.map(s => ({ id: s.id, subject: s.subject, students: allStudents.filter(stu => stu.setId === s.id).map(stu => stu.id) }))
    };
    let seatingRules = seatingType === 'fair' ? `**CRITICAL: FAIR SEATING MODE**...` : `**CRITICAL: NORMAL SEATING MODE**...`;
    let constraintsPrompt = editorMode === 'ai-advanced' ? `**STRICT HARD CONSTRAINTS**...` : "";
    const prompt = `Assistant task: Assign every student to unique seat... [JSON Data: ${JSON.stringify(promptData)}] ... [Rules: ${seatingRules} ${constraintsPrompt}] ... [Custom: ${rules}]`;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { assignments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { studentId: { type: Type.STRING }, hallId: { type: Type.STRING }, row: { type: Type.INTEGER }, col: { type: Type.INTEGER } }, required: ["studentId", "hallId", "row", "col"] } } },
                    required: ["assignments"]
                },
            },
        });
        const resultJson = JSON.parse(response.text);
        const assignments: { studentId: string, hallId: string, row: number, col: number }[] = resultJson.assignments;
        if (assignments.length !== allStudents.length) return { plan: null, message: `AI Error: Expected ${allStudents.length}, got ${assignments.length}.` };
        const assignmentsMap = new Map<string, StudentInfo>();
        assignments.forEach(a => {
            const studentInfo = allStudents.find(s => s.id === a.studentId);
            if(studentInfo) assignmentsMap.set(`${a.hallId}-${a.row}-${a.col}`, studentInfo);
        });
        const finalPlan: SeatingPlan = {};
        halls.forEach(hall => {
            const maxRow = Math.max(-1, ...hall.layout.map(s => s.row));
            const maxCol = Math.max(-1, ...hall.layout.map(s => s.col));
            const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
            hall.layout.forEach(seatDef => {
                const student = assignmentsMap.get(`${hall.id}-${seatDef.row}-${seatDef.col}`);
                hallGrid[seatDef.row][seatDef.col] = { ...seatDef, hallId: hall.id, ...(student && { student }) };
            });
            finalPlan[hall.id] = hallGrid;
        });
        return { plan: finalPlan, message: 'AI-powered seating plan generated successfully!' };
    } catch (error: any) {
        return { plan: null, message: `AI Communication Error: ${error.message}` };
    }
};

export const generateLayoutFromImage = async (base64Image: string, mimeType: string): Promise<{ layout: SeatDefinition[], rows: number, cols: number } | null> => {
    if (!process.env.API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Expert image analysis...`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [ { inlineData: { mimeType: mimeType, data: base64Image } }, { text: prompt } ] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: { type: Type.OBJECT, properties: { rows: { type: Type.INTEGER }, cols: { type: Type.INTEGER }, matrix: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["rows", "cols", "matrix"] }
            }
        });
        const result = JSON.parse(response.text);
        const matrix: string[] = result.matrix;
        if (!matrix || matrix.length === 0) return null;
        const rows = matrix.length;
        const cols = Math.max(...matrix.map(row => row.length));
        const layout: SeatDefinition[] = [];
        for (let r = 0; r < rows; r++) {
            const rowStr = matrix[r];
            for (let c = 0; c < rowStr.length; c++) {
                if (rowStr[c] === '1') layout.push({ id: `seat-${r}-${c}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, row: r, col: c, type: 'standard' });
            }
        }
        return { layout, rows, cols };
    } catch (e) { return null; }
};
