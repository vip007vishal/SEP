import { GoogleGenAI, Type } from '@google/genai';
import { DbData, loadDb, saveDb } from '../store/db';
import { env } from '../utils/env';
import { AuditLog, Exam, Hall, HallTemplate, Institute, Role, Seat, SeatAssignment, SeatDefinition, SeatingPlan, StudentInfo, StudentSet, StudentSetTemplate, User } from '../types';

let db: DbData = {
  users: [],
  institutes: [],
  exams: [],
  hallTemplates: [],
  studentSetTemplates: [],
  seatAssignments: [],
  auditLogs: [],
};

const API_LATENCY = 0;
const delay = () => new Promise((resolve) => setTimeout(resolve, API_LATENCY));
const nextId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeText = (value: string) => value.trim();
const normalizeRoll = (value: string) => value.trim().toLowerCase();

export const initExamService = async () => {
  db = await loadDb();

  db.users.filter((user) => user.role === Role.ADMIN).forEach((admin) => {
    ensureInstitute(admin);
  });

  db.users.filter((user) => user.role === Role.TEACHER && user.adminId).forEach((teacher) => {
    const admin = getAdminById(teacher.adminId!);
    if (admin) {
      teacher.instituteId = ensureInstitute(admin);
    }
  });

  db.hallTemplates = db.hallTemplates.map((template) => ({
    ...template,
    instituteId: template.instituteId || getAdminById(template.adminId)?.instituteId,
  }));
  db.studentSetTemplates = db.studentSetTemplates.map((template) => ({
    ...template,
    instituteId: template.instituteId || getAdminById(template.adminId)?.instituteId,
  }));
  db.exams = db.exams.map((exam) => ({
    ...exam,
    instituteId: exam.instituteId || getAdminById(exam.adminId)?.instituteId,
  }));

  const rebuiltAssignments: typeof db.seatAssignments = [];
  for (const exam of db.exams) {
    if (exam.seatingPlan && exam.instituteId) {
      rebuiltAssignments.push(...buildSeatAssignmentsForExam(exam));
    }
  }
  if (rebuiltAssignments.length > 0) {
    db.seatAssignments = rebuiltAssignments;
  }

  await saveDb(db);
};

export const persistDb = async () => {
  await saveDb(db);
};

const logActivity = (adminId: string, actorName: string, role: Role, action: string, details: string) => {
  const newLog: AuditLog = {
    id: nextId('log_'),
    adminId,
    actorName,
    role,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(newLog);
};

const getAdminById = (adminId: string) => db.users.find((u) => u.id === adminId && u.role === Role.ADMIN);
const getInstituteById = (instituteId?: string) => db.institutes.find((i) => i.id === instituteId);

const ensureInstitute = (admin: User) => {
  if (!admin.instituteId) {
    admin.instituteId = nextId('inst_');
  }
  const existing = db.institutes.find((i) => i.id === admin.instituteId);
  if (!existing) {
    db.institutes.push({
      id: admin.instituteId,
      name: admin.institutionName || `${admin.name} Institute`,
      adminId: admin.id,
      isActive: !!admin.permissionGranted,
      createdAt: new Date().toISOString(),
    });
  } else {
    existing.name = admin.institutionName || existing.name;
    existing.adminId = admin.id;
    existing.isActive = !!admin.permissionGranted;
  }
  return admin.instituteId;
};

const buildSeatAssignmentsForExam = (exam: Exam): SeatAssignment[] => {
  if (!exam.seatingPlan || !exam.instituteId) return [];
  const assignments: SeatAssignment[] = [];

  Object.entries(exam.seatingPlan).forEach(([hallId, hallPlan]) => {
    const hall = exam.halls.find((candidate) => candidate.id === hallId) || exam.halls.find((candidate) => candidate.name === hallId);
    const hallName = hall?.name || hallId;
    const resolvedHallId = hall?.id || hallId;

    hallPlan.forEach((row, rowIndex) => {
      row.forEach((seat, colIndex) => {
        if (!seat?.student) return;
        assignments.push({
          id: `assign_${exam.id}_${seat.student.id}_${rowIndex}_${colIndex}`,
          instituteId: exam.instituteId!,
          examId: exam.id,
          examTitle: exam.title,
          examDate: exam.date,
          studentRollNo: String(seat.student.id).trim(),
          studentName: seat.student.id,
          hallId: resolvedHallId,
          hallName,
          row: rowIndex,
          col: colIndex,
          seatLabel: `R${rowIndex + 1}C${colIndex + 1}`,
        });
      });
    });
  });

  return assignments;
};

const replaceSeatAssignmentsForExam = (exam: Exam) => {
  db.seatAssignments = db.seatAssignments.filter((assignment) => assignment.examId !== exam.id);
  if (exam.seatingPlan) {
    db.seatAssignments.push(...buildSeatAssignmentsForExam(exam));
  }
};

const adminContextForUser = (user?: User | null) => {
  if (!user) return { adminId: '', instituteId: '' };
  if (user.role === Role.ADMIN) {
    const instituteId = ensureInstitute(user);
    return { adminId: user.id, instituteId };
  }
  if (user.adminId) {
    const admin = getAdminById(user.adminId);
    const instituteId = admin ? ensureInstitute(admin) : (user.instituteId || '');
    return { adminId: user.adminId, instituteId };
  }
  return { adminId: '', instituteId: user.instituteId || '' };
};

export const getAuditLogs = async (adminId: string): Promise<AuditLog[]> => {
  await delay();
  if (!adminId) return db.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return db.auditLogs.filter((l) => l.adminId === adminId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getAllAdmins = async (): Promise<User[]> => {
  await delay();
  return db.users.filter((u) => u.role === Role.ADMIN).sort((a, b) => (a.institutionName || '').localeCompare(b.institutionName || ''));
};

export const grantAdminPermission = async (adminId: string): Promise<User | undefined> => {
  await delay();
  const admin = getAdminById(adminId);
  if (!admin) return undefined;
  admin.permissionGranted = true;
  const instituteId = ensureInstitute(admin);
  const institute = getInstituteById(instituteId);
  if (institute) {
    institute.isActive = true;
    institute.adminId = admin.id;
    institute.name = admin.institutionName || institute.name;
  }
  logActivity('SYSTEM', env.superAdminName, Role.SUPER_ADMIN, 'GRANT_ADMIN_ACCESS', `Approved institution admin: ${admin.institutionName}`);
  return { ...admin };
};

export const deleteAdminAndInstitution = async (adminId: string): Promise<boolean> => {
  await delay();
  const admin = getAdminById(adminId);
  if (!admin) return false;
  const instituteId = admin.instituteId || '';

  db.users = db.users.filter((u) => u.id !== adminId && u.adminId !== adminId && u.instituteId !== instituteId);
  db.exams = db.exams.filter((e) => e.adminId !== adminId && e.instituteId !== instituteId);
  db.hallTemplates = db.hallTemplates.filter((t) => t.adminId !== adminId && t.instituteId !== instituteId);
  db.studentSetTemplates = db.studentSetTemplates.filter((t) => t.adminId !== adminId && t.instituteId !== instituteId);
  db.seatAssignments = db.seatAssignments.filter((a) => a.instituteId !== instituteId);
  db.auditLogs = db.auditLogs.filter((l) => l.adminId !== adminId && l.adminId !== instituteId);
  db.institutes = db.institutes.filter((i) => i.id !== instituteId && i.adminId !== adminId);

  logActivity('SYSTEM', env.superAdminName, Role.SUPER_ADMIN, 'DELETE_INSTITUTION', `Deleted institution and all data for ${admin.institutionName}`);
  return true;
};

export const getInstitutions = async (): Promise<{ id: string; name: string }[]> => {
  await delay();
  return db.institutes
    .filter((i) => i.isActive)
    .map((i) => ({ id: i.id, name: i.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  await delay();
  return db.users.find((u) => normalizeEmail(u.email) === normalizeEmail(email));
};

export const findUserById = async (id: string): Promise<User | undefined> => {
  await delay();
  return db.users.find((u) => u.id === id);
};

export const createAdminUser = async (name: string, email: string, password: string, institutionName: string): Promise<User | null> => {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  const normalizedInstitution = normalizeText(institutionName);
  if (!name.trim() || !normalizedEmail || !password.trim() || !normalizedInstitution) return null;
  if (db.users.some((u) => normalizeEmail(u.email) === normalizedEmail)) return null;
  if (db.institutes.some((i) => i.name.toLowerCase() === normalizedInstitution.toLowerCase())) return null;

  const instituteId = nextId('inst_');
  const newAdmin: User = {
    id: nextId('admin_'),
    name: normalizeText(name),
    email: normalizedEmail,
    role: Role.ADMIN,
    password: password.trim(),
    institutionName: normalizedInstitution,
    permissionGranted: false,
    instituteId,
  };
  db.users.push(newAdmin);
  db.institutes.push({ id: instituteId, name: normalizedInstitution, adminId: newAdmin.id, isActive: false, createdAt: new Date().toISOString() });
  logActivity('SYSTEM', newAdmin.name, Role.ADMIN, 'REGISTER_ADMIN', `Registered institution admin for ${normalizedInstitution}`);
  return newAdmin;
};

export const createTeacherUser = async (name: string, email: string, password: string, adminIdentifier: string): Promise<User | null> => {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  if (!name.trim() || !normalizedEmail || !password.trim() || !adminIdentifier.trim()) return null;
  if (db.users.some((u) => normalizeEmail(u.email) === normalizedEmail)) return null;

  const admin = db.users.find((u) =>
    u.role === Role.ADMIN &&
    (u.id === adminIdentifier || (u.institutionName && u.institutionName.toLowerCase() === adminIdentifier.trim().toLowerCase()))
  );
  if (!admin) return null;
  const instituteId = ensureInstitute(admin);

  const newTeacher: User = {
    id: nextId('teacher_'),
    name: normalizeText(name),
    email: normalizedEmail,
    role: Role.TEACHER,
    password: password.trim(),
    permissionGranted: false,
    adminId: admin.id,
    instituteId,
  };
  db.users.push(newTeacher);
  logActivity(admin.id, newTeacher.name, Role.TEACHER, 'REGISTER_TEACHER', `Teacher ${newTeacher.name} requested access.`);
  return newTeacher;
};

export const getTeachersForAdmin = async (adminId: string): Promise<User[]> => {
  await delay();
  return db.users.filter((u) => u.role === Role.TEACHER && u.adminId === adminId).sort((a, b) => a.name.localeCompare(b.name));
};

export const getUnassignedTeachers = async (): Promise<User[]> => {
  await delay();
  return db.users.filter((u) => u.role === Role.TEACHER && !u.permissionGranted).sort((a, b) => a.name.localeCompare(b.name));
};

export const grantTeacherPermission = async (teacherId: string, adminId: string): Promise<User | undefined> => {
  await delay();
  const teacher = db.users.find((u) => u.id === teacherId && u.role === Role.TEACHER);
  const admin = getAdminById(adminId);
  if (!teacher || !admin) return undefined;
  const instituteId = ensureInstitute(admin);
  teacher.permissionGranted = true;
  teacher.adminId = adminId;
  teacher.instituteId = instituteId;
  logActivity(adminId, admin.name, Role.ADMIN, 'GRANTED_PERMISSION', `Approved teacher account: ${teacher.name}`);
  return { ...teacher };
};

export const revokeTeacherPermission = async (teacherId: string): Promise<User | undefined> => {
  await delay();
  const teacher = db.users.find((u) => u.id === teacherId && u.role === Role.TEACHER);
  if (!teacher) return undefined;
  teacher.permissionGranted = false;
  if (teacher.adminId) {
    const admin = getAdminById(teacher.adminId);
    logActivity(teacher.adminId, admin?.name || 'Admin', Role.ADMIN, 'REVOKED_PERMISSION', `Revoked teacher permission: ${teacher.name}`);
  }
  return { ...teacher };
};

export const deleteTeacher = async (teacherId: string, adminId: string): Promise<boolean> => {
  await delay();
  const before = db.users.length;
  const removedExamIds = db.exams.filter((e) => e.createdBy === teacherId).map((e) => e.id);
  db.users = db.users.filter((u) => u.id !== teacherId);
  db.exams = db.exams.filter((e) => e.createdBy !== teacherId);
  db.seatAssignments = db.seatAssignments.filter((assignment) => !removedExamIds.includes(assignment.examId));
  db.hallTemplates = db.hallTemplates.filter((t) => t.createdBy !== teacherId);
  db.studentSetTemplates = db.studentSetTemplates.filter((t) => t.createdBy !== teacherId);
  if (before !== db.users.length) {
    logActivity(adminId, getAdminById(adminId)?.name || 'Admin', Role.ADMIN, 'DELETED_TEACHER', `Deleted teacher account ${teacherId}`);
    return true;
  }
  return false;
};

export const getExamsForAdmin = async (adminId: string): Promise<Exam[]> => {
  await delay();
  return db.exams.filter((e) => e.adminId === adminId).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
};

export const getExamsForStudent = async (registerNumber: string, instituteId: string): Promise<Exam[]> => {
  await delay();
  const normalizedInstituteId = normalizeText(instituteId);
  const normalizedRoll = normalizeRoll(registerNumber);
  const matchingAssignments = db.seatAssignments.filter(
    (assignment) => assignment.instituteId === normalizedInstituteId && normalizeRoll(assignment.studentRollNo) === normalizedRoll
  );
  const examIds = new Set(matchingAssignments.map((assignment) => assignment.examId));
  return db.exams
    .filter((exam) => exam.instituteId === normalizedInstituteId && examIds.has(exam.id) && !!exam.seatingPlan)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
};

export const getExamsForTeacher = async (teacherId: string): Promise<Exam[]> => {
  await delay();
  return db.exams.filter((e) => e.createdBy === teacherId).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
};

export const createExam = async (examData: any, teacherId: string): Promise<Exam> => {
  await delay();
  const teacher = await findUserById(teacherId);
  const { adminId, instituteId } = adminContextForUser(teacher);
  if (!teacher || !adminId || !instituteId) throw new Error('Teacher not assigned.');
  const timestamp = Date.now();
  const newExam: Exam = {
    ...examData,
    id: examData.id || `exam${timestamp}`,
    title: normalizeText(examData.title || 'Untitled Exam'),
    date: normalizeText(examData.date || ''),
    createdBy: teacherId,
    adminId,
    instituteId,
    halls: (examData.halls || []).map((h: any, i: number) => ({ ...h, id: h.id || `hall${timestamp}${i}`, instituteId })),
    studentSets: (examData.studentSets || []).map((s: any, i: number) => ({ ...s, id: s.id || `set${timestamp}${i}`, instituteId })),
    seatingPlan: examData.seatingPlan || undefined,
  };
  db.exams.push(newExam);
  if (newExam.seatingPlan) {
    replaceSeatAssignmentsForExam(newExam);
  }
  logActivity(adminId, teacher.name, teacher.role, 'CREATED_EXAM', `Created new exam: "${newExam.title}"`);
  return newExam;
};

export const updateExam = async (updatedExam: Exam): Promise<Exam> => {
  await delay();
  const index = db.exams.findIndex((e) => e.id === updatedExam.id);
  if (index === -1) throw new Error('Exam not found.');
  const existing = db.exams[index];
  const merged: Exam = {
    ...existing,
    ...updatedExam,
    adminId: updatedExam.adminId || existing.adminId,
    createdBy: updatedExam.createdBy || existing.createdBy,
    instituteId: updatedExam.instituteId || existing.instituteId,
  };
  db.exams[index] = merged;
  if (merged.seatingPlan) {
    replaceSeatAssignmentsForExam(merged);
  } else {
    db.seatAssignments = db.seatAssignments.filter((assignment) => assignment.examId !== merged.id);
  }
  logActivity(merged.adminId, db.users.find((u) => u.id === merged.createdBy)?.name || 'Teacher', Role.TEACHER, 'UPDATED_EXAM', `Updated exam: "${merged.title}"`);
  return merged;
};

export const updateExamSeatingPlan = async (examId: string, newPlan: SeatingPlan, updaterId: string): Promise<boolean> => {
  await delay();
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) return false;
  exam.seatingPlan = newPlan;
  replaceSeatAssignmentsForExam(exam);
  const updater = await findUserById(updaterId);
  logActivity(exam.adminId, updater?.name || 'Teacher', updater?.role || Role.TEACHER, 'UPDATED_SEATING_PLAN', `Updated seating plan for ${exam.title}`);
  return true;
};

export const deleteExam = async (examId: string, ownerId: string, role: Role): Promise<boolean> => {
  await delay();
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) return false;
  db.exams = db.exams.filter((e) => e.id !== examId);
  db.seatAssignments = db.seatAssignments.filter((assignment) => assignment.examId !== examId);
  const actor = await findUserById(ownerId);
  logActivity(exam.adminId, actor?.name || 'User', role, 'DELETED_EXAM', `Deleted exam: "${exam.title}"`);
  return true;
};

export const loginStudent = async (registerNumber: string, instituteId: string): Promise<User> => {
  await delay();
  const normalizedInstituteId = normalizeText(instituteId);
  const normalizedRegisterNumber = normalizeText(registerNumber);
  const institute = getInstituteById(normalizedInstituteId);
  if (!institute || !institute.isActive) {
    throw new Error('Invalid institution selection.');
  }
  if (!normalizedRegisterNumber) {
    throw new Error('Please enter a valid register number.');
  }
  return {
    id: `student_${normalizedInstituteId}_${normalizedRegisterNumber}`,
    name: normalizedRegisterNumber,
    email: '',
    role: Role.STUDENT,
    registerNumber: normalizedRegisterNumber,
    adminId: normalizedInstituteId,
    instituteId: normalizedInstituteId,
  };
};

export const getHallTemplatesForTeacher = async (teacherId: string): Promise<HallTemplate[]> => {
  await delay();
  const teacher = await findUserById(teacherId);
  const { adminId } = adminContextForUser(teacher);
  return db.hallTemplates.filter((template) => template.adminId === adminId).sort((a, b) => a.name.localeCompare(b.name));
};

export const getHallTemplatesForAdmin = async (adminId: string): Promise<HallTemplate[]> => {
  await delay();
  return db.hallTemplates.filter((template) => template.adminId === adminId).sort((a, b) => a.name.localeCompare(b.name));
};

export const createHallTemplate = async (templateData: any, creatorId: string): Promise<HallTemplate> => {
  await delay();
  const creator = await findUserById(creatorId);
  const { adminId, instituteId } = adminContextForUser(creator);
  if (!creator || !adminId || !instituteId) throw new Error('Creator not assigned.');
  const template: HallTemplate = {
    id: nextId('hallTemplate_'),
    name: normalizeText(templateData.name || 'Untitled Hall Template'),
    layout: templateData.layout || [],
    createdBy: creatorId,
    adminId,
    instituteId,
  };
  db.hallTemplates.push(template);
  logActivity(adminId, creator.name, creator.role, 'CREATED_HALL_TEMPLATE', `Created hall template: ${template.name}`);
  return template;
};

export const updateHallTemplate = async (templateId: string, data: any, updaterId: string): Promise<HallTemplate | null> => {
  await delay();
  const index = db.hallTemplates.findIndex((template) => template.id === templateId);
  if (index === -1) return null;
  const current = db.hallTemplates[index];
  const updated: HallTemplate = { ...current, ...data, id: current.id, adminId: current.adminId, instituteId: current.instituteId };
  db.hallTemplates[index] = updated;
  const updater = await findUserById(updaterId);
  logActivity(updated.adminId, updater?.name || 'User', updater?.role || Role.ADMIN, 'UPDATED_HALL_TEMPLATE', `Updated hall template: ${updated.name}`);
  return updated;
};

export const deleteHallTemplate = async (templateId: string, deleterId: string, role: Role): Promise<boolean> => {
  await delay();
  const template = db.hallTemplates.find((t) => t.id === templateId);
  const before = db.hallTemplates.length;
  db.hallTemplates = db.hallTemplates.filter((t) => t.id !== templateId);
  if (before !== db.hallTemplates.length && template) {
    const actor = await findUserById(deleterId);
    logActivity(template.adminId, actor?.name || 'User', role, 'DELETED_HALL_TEMPLATE', `Deleted hall template: ${template.name}`);
    return true;
  }
  return false;
};

export const getStudentSetTemplatesForTeacher = async (teacherId: string): Promise<StudentSetTemplate[]> => {
  await delay();
  const teacher = await findUserById(teacherId);
  const { adminId } = adminContextForUser(teacher);
  return db.studentSetTemplates.filter((template) => template.adminId === adminId).sort((a, b) => a.subject.localeCompare(b.subject));
};

export const getStudentSetTemplatesForAdmin = async (adminId: string): Promise<StudentSetTemplate[]> => {
  await delay();
  return db.studentSetTemplates.filter((template) => template.adminId === adminId).sort((a, b) => a.subject.localeCompare(b.subject));
};

export const createStudentSetTemplate = async (templateData: any, creatorId: string): Promise<StudentSetTemplate> => {
  await delay();
  const creator = await findUserById(creatorId);
  const { adminId, instituteId } = adminContextForUser(creator);
  if (!creator || !adminId || !instituteId) throw new Error('Creator not assigned.');
  const template: StudentSetTemplate = {
    id: nextId('studentSetTemplate_'),
    subject: normalizeText(templateData.subject || ''),
    studentCount: Number(templateData.studentCount || 0),
    students: templateData.students || undefined,
    createdBy: creatorId,
    adminId,
    instituteId,
  };
  db.studentSetTemplates.push(template);
  logActivity(adminId, creator.name, creator.role, 'CREATED_STUDENT_SET_TEMPLATE', `Created student set template: ${template.subject}`);
  return template;
};

export const updateStudentSetTemplate = async (templateId: string, data: any, updaterId: string): Promise<StudentSetTemplate | null> => {
  await delay();
  const index = db.studentSetTemplates.findIndex((template) => template.id === templateId);
  if (index === -1) return null;
  const current = db.studentSetTemplates[index];
  const updated: StudentSetTemplate = { ...current, ...data, id: current.id, adminId: current.adminId, instituteId: current.instituteId };
  db.studentSetTemplates[index] = updated;
  const updater = await findUserById(updaterId);
  logActivity(updated.adminId, updater?.name || 'User', updater?.role || Role.ADMIN, 'UPDATED_STUDENT_SET_TEMPLATE', `Updated student set template: ${updated.subject}`);
  return updated;
};

export const deleteStudentSetTemplate = async (templateId: string, deleterId: string, role: Role): Promise<boolean> => {
  await delay();
  const template = db.studentSetTemplates.find((template) => template.id === templateId);
  const before = db.studentSetTemplates.length;
  db.studentSetTemplates = db.studentSetTemplates.filter((template) => template.id !== templateId);
  if (before !== db.studentSetTemplates.length && template) {
    const actor = await findUserById(deleterId);
    logActivity(template.adminId, actor?.name || 'User', role, 'DELETED_STUDENT_SET_TEMPLATE', `Deleted student set template: ${template.subject}`);
    return true;
  }
  return false;
};

const generateStudentList = (studentSets: StudentSet[]): StudentInfo[] => {
  const allStudents: StudentInfo[] = [];
  studentSets.forEach((set) => {
    if (set.students && set.students.length > 0) {
      set.students.forEach((studentId, index) => allStudents.push({ id: studentId, setId: set.id, setNumber: index + 1 }));
    } else {
      const subjectPrefix = /^\d+$/.test(set.subject) ? set.subject : '999';
      const paddingLength = Math.max(2, String(set.studentCount).length);
      for (let index = 0; index < set.studentCount; index += 1) {
        const padded = (index + 1).toString().padStart(paddingLength, '0');
        allStudents.push({ id: `${subjectPrefix}${padded}`, setId: set.id, setNumber: index + 1 });
      }
    }
  });
  return allStudents;
};

export const generateClassicSeatingPlan = async (
  examData: { halls: Hall[]; studentSets: StudentSet[]; seatingType?: 'normal' | 'fair' }
): Promise<{ plan: SeatingPlan | null; message?: string }> => {
  const { halls, studentSets, seatingType = 'normal' } = examData;
  const allStudents = generateStudentList(studentSets);
  const assignments = new Map<string, StudentInfo>();
  const studentQueues: { [setId: string]: StudentInfo[] } = {};
  studentSets.forEach((set) => {
    studentQueues[set.id] = allStudents.filter((student) => student.setId === set.id);
  });

  for (const hall of halls) {
    const hallPlacementCount: { [setId: string]: number } = {};
    const seatsInHall = hall.layout
      .filter((seat) => seat.type !== 'faculty')
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
      ? hall.constraints.allowedSetIds || []
      : Object.keys(studentQueues);

    const isSetEligibleForHall = (setId: string) => {
      if (!allPossibleSetIdsForHall.includes(setId)) return false;
      if ((studentQueues[setId] || []).length === 0) return false;
      if (hall.constraints?.type === 'advanced' && hall.constraints.setLimits) {
        const limit = hall.constraints.setLimits[setId];
        const currentCount = hallPlacementCount[setId] || 0;
        if (limit !== undefined && currentCount >= limit) return false;
      }
      return true;
    };

    const allocation = hall.constraints?.allocation;
    let setCycleIndex = 0;
    let seatSkipCounter = 0;

    for (const seat of seatsInHall) {
      const eligibleSets = allPossibleSetIdsForHall.filter((id) => isSetEligibleForHall(id));
      if (eligibleSets.length === 0) break;

      if (seatingType === 'fair' && eligibleSets.length === 1) {
        if (seatSkipCounter > 0) {
          seatSkipCounter -= 1;
          continue;
        }
        const setIdToUse = eligibleSets[0];
        const studentToAssign = studentQueues[setIdToUse].shift()!;
        assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
        hallPlacementCount[setIdToUse] = (hallPlacementCount[setIdToUse] || 0) + 1;
        seatSkipCounter = 1;
      } else {
        let studentToAssign: StudentInfo | undefined;

        if (allocation?.enabled) {
          let targetIndex = 0;
          if (allocation.strategy === 'linear') {
            targetIndex = allocation.linearDirection === 'vertical' ? seat.col : seat.row;
          } else if (allocation.strategy === 'diagonal') {
            targetIndex = seat.row + seat.col;
          }

          const preferredSetId = eligibleSets[targetIndex % eligibleSets.length];
          if (isSetEligibleForHall(preferredSetId)) {
            studentToAssign = studentQueues[preferredSetId].shift();
            if (studentToAssign) hallPlacementCount[preferredSetId] = (hallPlacementCount[preferredSetId] || 0) + 1;
          } else {
            let triedFallback = 0;
            while (!studentToAssign && triedFallback < eligibleSets.length) {
              const fallbackSetId = eligibleSets[(targetIndex + triedFallback) % eligibleSets.length];
              if (isSetEligibleForHall(fallbackSetId)) {
                studentToAssign = studentQueues[fallbackSetId].shift();
                if (studentToAssign) hallPlacementCount[fallbackSetId] = (hallPlacementCount[fallbackSetId] || 0) + 1;
              }
              triedFallback += 1;
            }
          }
        } else {
          let triedSets = 0;
          while (!studentToAssign && triedSets < eligibleSets.length) {
            const currentSetId = eligibleSets[setCycleIndex % eligibleSets.length];
            if (isSetEligibleForHall(currentSetId)) {
              studentToAssign = studentQueues[currentSetId].shift();
              if (studentToAssign) hallPlacementCount[currentSetId] = (hallPlacementCount[currentSetId] || 0) + 1;
            }
            setCycleIndex += 1;
            triedSets += 1;
          }
        }

        if (studentToAssign) {
          assignments.set(`${hall.id}-${seat.row}-${seat.col}`, studentToAssign);
        } else {
          break;
        }
      }
    }
  }

  const unassignedStudents = Object.values(studentQueues).flat();
  if (unassignedStudents.length > 0) {
    if (seatingType === 'fair') return { plan: null, message: 'Not enough seats for fair seating with these constraints.' };
    return { plan: null, message: `Failed to assign all students. ${unassignedStudents.length} students remain unplaced due to strict hall constraints.` };
  }

  const finalPlan: SeatingPlan = {};
  halls.forEach((hall) => {
    const maxRow = Math.max(-1, ...hall.layout.map((s) => s.row));
    const maxCol = Math.max(-1, ...hall.layout.map((s) => s.col));
    const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
    hall.layout.forEach((seatDef) => {
      const student = assignments.get(`${hall.id}-${seatDef.row}-${seatDef.col}`);
      hallGrid[seatDef.row][seatDef.col] = { ...seatDef, hallId: hall.id, ...(student ? { student } : {}) };
    });
    finalPlan[hall.id] = hallGrid;
  });
  return { plan: finalPlan, message: 'Classic seating plan generated successfully!' };
};

export const generateSeatingPlan = async (
  examData: { halls: Hall[]; studentSets: StudentSet[]; rules?: string; seatingType?: 'normal' | 'fair'; editorMode?: string }
): Promise<{ plan: SeatingPlan | null; message?: string }> => {
  const { halls, studentSets, rules, seatingType, editorMode } = examData;
  if (!env.geminiApiKey) return { plan: null, message: 'CRITICAL: GEMINI_API_KEY environment variable not set.' };
  const allStudents = generateStudentList(studentSets);
  const availableSeats = halls.flatMap((hall) => hall.layout.filter((seat) => seat.type !== 'faculty'));

  if (seatingType !== 'fair' && allStudents.length > availableSeats.length) {
    return { plan: null, message: `Not enough seats. Required: ${allStudents.length}, Available: ${availableSeats.length}.` };
  }

  const promptData = {
    halls: halls.map((h) => ({ id: h.id, name: h.name, seats: h.layout.map((s) => ({ row: s.row, col: s.col, type: s.type })), constraints: h.constraints })),
    studentSets: studentSets.map((s) => ({ id: s.id, subject: s.subject, students: allStudents.filter((stu) => stu.setId === s.id).map((stu) => stu.id) })),
  };

  const seatingRules = seatingType === 'fair'
    ? '**CRITICAL: FAIR SEATING MODE** Students from same set should be separated. Avoid placing same subjects adjacent.'
    : '**CRITICAL: NORMAL SEATING MODE** Fill seats efficiently.';

  const constraintsPrompt = editorMode === 'ai-advanced' || editorMode === 'advanced'
    ? `**STRICT HARD CONSTRAINTS** Follow the constraints field for each hall in JSON.
If type is advanced, only students from allowedSetIds can enter.
If setLimits is present, do not exceed the specified maximum number of students for that set in that specific hall.
If allocation is present and enabled is true:
- linear: align students of the same set along the linearDirection
- diagonal: place students in alternating zigzag pattern.
If a hall limit for a subject is reached, that student must be placed in a subsequent hall.`
    : '';

  const prompt = `Assistant task: Assign every student to a unique and valid seat based on constraints.
Return a list of assignments in JSON.
[JSON Data: ${JSON.stringify(promptData)}]
[Rules: ${seatingRules} ${constraintsPrompt}]
[User Custom Instructions: ${rules || ''}]`;

  try {
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  studentId: { type: Type.STRING },
                  hallId: { type: Type.STRING },
                  row: { type: Type.INTEGER },
                  col: { type: Type.INTEGER },
                },
                required: ['studentId', 'hallId', 'row', 'col'],
              },
            },
          },
          required: ['assignments'],
        },
      },
    });

    const resultJson = JSON.parse(response.text);
    const assignments: { studentId: string; hallId: string; row: number; col: number }[] = resultJson.assignments;

    if (assignments.length !== allStudents.length) {
      return { plan: null, message: `AI Error: Expected ${allStudents.length} assignments, but got ${assignments.length}.` };
    }

    const assignmentsMap = new Map<string, StudentInfo>();
    assignments.forEach((assignment) => {
      const studentInfo = allStudents.find((student) => student.id === assignment.studentId);
      if (studentInfo) assignmentsMap.set(`${assignment.hallId}-${assignment.row}-${assignment.col}`, studentInfo);
    });

    const finalPlan: SeatingPlan = {};
    halls.forEach((hall) => {
      const maxRow = Math.max(-1, ...hall.layout.map((s) => s.row));
      const maxCol = Math.max(-1, ...hall.layout.map((s) => s.col));
      const hallGrid: Seat[][] = Array.from({ length: maxRow + 1 }, () => Array(maxCol + 1).fill(null));
      hall.layout.forEach((seatDef) => {
        const student = assignmentsMap.get(`${hall.id}-${seatDef.row}-${seatDef.col}`);
        hallGrid[seatDef.row][seatDef.col] = { ...seatDef, hallId: hall.id, ...(student ? { student } : {}) };
      });
      finalPlan[hall.id] = hallGrid;
    });
    return { plan: finalPlan, message: 'AI-powered seating plan generated successfully!' };
  } catch (error: any) {
    return { plan: null, message: `AI Communication Error: ${error.message}` };
  }
};

export const generateLayoutFromImage = async (base64Image: string, mimeType: string): Promise<{ layout: SeatDefinition[]; rows: number; cols: number } | null> => {
  if (!env.geminiApiKey) return null;
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const prompt = `Analyze this hall layout image. Return a JSON object with rows, cols and matrix where 1 means seat and 0 means empty. Use the smallest accurate grid.`;
  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: { parts: [{ inlineData: { mimeType, data: base64Image } }, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rows: { type: Type.INTEGER },
            cols: { type: Type.INTEGER },
            matrix: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['rows', 'cols', 'matrix'],
        },
      },
    });
    const result = JSON.parse(response.text);
    const matrix: string[] = result.matrix;
    if (!matrix || matrix.length === 0) return null;
    const rows = matrix.length;
    const cols = Math.max(...matrix.map((row) => row.length));
    const layout: SeatDefinition[] = [];
    for (let r = 0; r < rows; r += 1) {
      const rowStr = matrix[r];
      for (let c = 0; c < rowStr.length; c += 1) {
        if (rowStr[c] === '1') {
          layout.push({ id: `seat-${r}-${c}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, row: r, col: c, type: 'standard' });
        }
      }
    }
    return { layout, rows, cols };
  } catch {
    return null;
  }
};
