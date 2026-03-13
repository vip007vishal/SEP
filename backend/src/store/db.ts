import fs from "fs";
import path from "path";
import { resolvedDataFile, env } from "../utils/env";
import { Role, User, Exam, HallTemplate, StudentSetTemplate, AuditLog } from "../types";

export interface DbData {
  users: User[];
  exams: Exam[];
  hallTemplates: HallTemplate[];
  studentSetTemplates: StudentSetTemplate[];
  auditLogs: AuditLog[];
}

const emptyDb = (): DbData => ({ users: [], exams: [], hallTemplates: [], studentSetTemplates: [], auditLogs: [] });

const ensureSuperAdmin = (db: DbData): DbData => {
  const superAdmin: User = {
    id: "superadmin",
    name: env.superAdminName,
    email: env.superAdminEmail,
    role: Role.SUPER_ADMIN,
    password: env.superAdminPassword,
    permissionGranted: true,
  };

  const existingIndex = db.users.findIndex((user) => user.role === Role.SUPER_ADMIN);
  if (existingIndex === -1) {
    db.users.unshift(superAdmin);
  } else {
    db.users[existingIndex] = { ...db.users[existingIndex], ...superAdmin };
  }

  db.users = db.users.filter((user, index) => user.role !== Role.SUPER_ADMIN || index === db.users.findIndex((candidate) => candidate.role === Role.SUPER_ADMIN));
  return db;
};

export const loadDb = (): DbData => {
  const dir = path.dirname(resolvedDataFile);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(resolvedDataFile)) {
    const db = ensureSuperAdmin(emptyDb());
    fs.writeFileSync(resolvedDataFile, JSON.stringify(db, null, 2), "utf-8");
    return db;
  }

  try {
    const raw = fs.readFileSync(resolvedDataFile, "utf-8");
    const parsed = raw ? JSON.parse(raw) as Partial<DbData> : {};
    const db = ensureSuperAdmin({
      users: parsed.users || [],
      exams: parsed.exams || [],
      hallTemplates: parsed.hallTemplates || [],
      studentSetTemplates: parsed.studentSetTemplates || [],
      auditLogs: parsed.auditLogs || [],
    });
    fs.writeFileSync(resolvedDataFile, JSON.stringify(db, null, 2), "utf-8");
    return db;
  } catch {
    const db = ensureSuperAdmin(emptyDb());
    fs.writeFileSync(resolvedDataFile, JSON.stringify(db, null, 2), "utf-8");
    return db;
  }
};

export const saveDb = (db: DbData) => {
  fs.writeFileSync(resolvedDataFile, JSON.stringify(ensureSuperAdmin(db), null, 2), "utf-8");
};
