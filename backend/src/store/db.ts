import fs from "fs";
import path from "path";
import { Pool, PoolClient } from "pg";
import { env } from "../utils/env";
import { AuditLog, Exam, HallTemplate, Institute, Role, SeatAssignment, StudentSetTemplate, User } from "../types";

export interface DbData {
  users: User[];
  institutes: Institute[];
  exams: Exam[];
  hallTemplates: HallTemplate[];
  studentSetTemplates: StudentSetTemplate[];
  seatAssignments: SeatAssignment[];
  auditLogs: AuditLog[];
}

const emptyDb = (): DbData => ({
  users: [],
  institutes: [],
  exams: [],
  hallTemplates: [],
  studentSetTemplates: [],
  seatAssignments: [],
  auditLogs: [],
});

let pool: Pool | null = null;
let schemaEnsured = false;

const schemaPath = path.resolve(process.cwd(), "db", "schema.sql");

const getPool = () => {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured in backend/.env");
  }
  if (!pool) {
    pool = new Pool({ connectionString: env.databaseUrl });
  }
  return pool;
};

const ensureSchema = async () => {
  if (schemaEnsured) return;
  const sql = fs.readFileSync(schemaPath, "utf-8");
  const client = await getPool().connect();
  try {
    await client.query(sql);
    schemaEnsured = true;
  } finally {
    client.release();
  }
};

const normalizeDate = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const upsertSuperAdmin = async (client: PoolClient) => {
  await client.query(
    `INSERT INTO users (id, name, email, role, password, permission_granted)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       password = EXCLUDED.password,
       permission_granted = EXCLUDED.permission_granted`,
    [
      "superadmin",
      env.superAdminName,
      env.superAdminEmail,
      Role.SUPER_ADMIN,
      env.superAdminPassword,
      true,
    ]
  );
};

const mapUsers = async (client: PoolClient): Promise<User[]> => {
  const { rows } = await client.query(
    `SELECT id, name, email, role, password,
            permission_granted AS "permissionGranted",
            register_number AS "registerNumber",
            admin_id AS "adminId",
            institution_name AS "institutionName",
            institute_id AS "instituteId"
     FROM users
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};

const mapInstitutes = async (client: PoolClient): Promise<Institute[]> => {
  const { rows } = await client.query(
    `SELECT id, name, code, admin_id AS "adminId", is_active AS "isActive",
            created_at::text AS "createdAt"
     FROM institutes
     ORDER BY name ASC`
  );
  return rows;
};

const mapHallTemplates = async (client: PoolClient): Promise<HallTemplate[]> => {
  const { rows } = await client.query(
    `SELECT id, name, layout, created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId"
     FROM hall_templates
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};

const mapStudentSetTemplates = async (client: PoolClient): Promise<StudentSetTemplate[]> => {
  const { rows } = await client.query(
    `SELECT id, subject, student_count AS "studentCount", students, created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId"
     FROM student_set_templates
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};

const mapExams = async (client: PoolClient): Promise<Exam[]> => {
  const { rows } = await client.query(
    `SELECT id, title, exam_date, halls, student_sets AS "studentSets", seating_plan AS "seatingPlan",
            ai_seating_rules AS "aiSeatingRules", seating_type AS "seatingType", editor_mode AS "editorMode",
            created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId"
     FROM exams
     ORDER BY exam_date ASC, created_at ASC, id ASC`
  );
  return rows.map((row) => ({ ...row, date: normalizeDate(row.exam_date) }));
};

const mapSeatAssignments = async (client: PoolClient): Promise<SeatAssignment[]> => {
  const { rows } = await client.query(
    `SELECT id, institute_id AS "instituteId", exam_id AS "examId", exam_title AS "examTitle", exam_date,
            student_roll_no AS "studentRollNo", student_name AS "studentName", hall_id AS "hallId", hall_name AS "hallName",
            row_index AS row, col_index AS col, seat_label AS "seatLabel"
     FROM seat_assignments
     ORDER BY exam_date ASC, hall_name ASC, row_index ASC, col_index ASC`
  );
  return rows.map((row) => ({ ...row, examDate: normalizeDate(row.exam_date) }));
};

const mapAuditLogs = async (client: PoolClient): Promise<AuditLog[]> => {
  const { rows } = await client.query(
    `SELECT id, admin_id AS "adminId", actor_name AS "actorName", role, action, details,
            timestamp::text AS timestamp
     FROM audit_logs
     ORDER BY timestamp DESC`
  );
  return rows;
};

export const loadDb = async (): Promise<DbData> => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await upsertSuperAdmin(client);
    const [users, institutes, exams, hallTemplates, studentSetTemplates, seatAssignments, auditLogs] = await Promise.all([
      mapUsers(client),
      mapInstitutes(client),
      mapExams(client),
      mapHallTemplates(client),
      mapStudentSetTemplates(client),
      mapSeatAssignments(client),
      mapAuditLogs(client),
    ]);
    return { users, institutes, exams, hallTemplates, studentSetTemplates, seatAssignments, auditLogs };
  } finally {
    client.release();
  }
};

export const saveDb = async (db: DbData) => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE seat_assignments, exams, hall_templates, student_set_templates, institutes, audit_logs, users RESTART IDENTITY`);

    for (const institute of db.institutes || []) {
      await client.query(
        `INSERT INTO institutes (id, name, code, admin_id, is_active)
         VALUES ($1,$2,$3,$4,$5)`,
        [institute.id, institute.name, institute.code || null, institute.adminId || null, institute.isActive ?? false]
      );
    }

    await upsertSuperAdmin(client);

    for (const user of db.users || []) {
      if (user.role === Role.SUPER_ADMIN && user.id === "superadmin") continue;
      await client.query(
        `INSERT INTO users (id, name, email, role, password, permission_granted, register_number, admin_id, institution_name, institute_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          user.id,
          user.name,
          user.email,
          user.role,
          user.password || null,
          user.permissionGranted ?? false,
          user.registerNumber || null,
          user.adminId || null,
          user.institutionName || null,
          user.instituteId || null,
        ]
      );
    }

    for (const template of db.hallTemplates || []) {
      await client.query(
        `INSERT INTO hall_templates (id, name, layout, created_by, admin_id, institute_id)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6)`,
        [template.id, template.name, JSON.stringify(template.layout || []), template.createdBy, template.adminId, template.instituteId || null]
      );
    }

    for (const template of db.studentSetTemplates || []) {
      await client.query(
        `INSERT INTO student_set_templates (id, subject, student_count, students, created_by, admin_id, institute_id)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)`,
        [template.id, template.subject, template.studentCount, JSON.stringify(template.students || null), template.createdBy, template.adminId, template.instituteId || null]
      );
    }

    for (const exam of db.exams || []) {
      await client.query(
        `INSERT INTO exams (id, title, exam_date, halls, student_sets, seating_plan, ai_seating_rules, seating_type, editor_mode, created_by, admin_id, institute_id)
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12)`,
        [
          exam.id,
          exam.title,
          normalizeDate(exam.date),
          JSON.stringify(exam.halls || []),
          JSON.stringify(exam.studentSets || []),
          JSON.stringify(exam.seatingPlan || null),
          exam.aiSeatingRules || null,
          exam.seatingType || null,
          exam.editorMode || null,
          exam.createdBy,
          exam.adminId,
          exam.instituteId || null,
        ]
      );
    }

    for (const assignment of db.seatAssignments || []) {
      await client.query(
        `INSERT INTO seat_assignments (id, institute_id, exam_id, exam_title, exam_date, student_roll_no, student_name, hall_id, hall_name, row_index, col_index, seat_label)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          assignment.id,
          assignment.instituteId,
          assignment.examId,
          assignment.examTitle,
          normalizeDate(assignment.examDate),
          assignment.studentRollNo,
          assignment.studentName || null,
          assignment.hallId,
          assignment.hallName,
          assignment.row,
          assignment.col,
          assignment.seatLabel,
        ]
      );
    }

    for (const log of db.auditLogs || []) {
      await client.query(
        `INSERT INTO audit_logs (id, admin_id, actor_name, role, action, details, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [log.id, log.adminId, log.actorName, log.role, log.action, log.details, log.timestamp]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const storeOtp = async (email: string, otp: string, expiresAt: Date) => {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO otp_store (email, otp, expires_at)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at`,
    [email.toLowerCase(), otp, expiresAt.toISOString()]
  );
};

export const getOtp = async (email: string): Promise<{ otp: string; expiresAt: number } | null> => {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT otp, expires_at FROM otp_store WHERE email = $1`,
    [email.toLowerCase()]
  );
  if (!rows[0]) return null;
  return { otp: rows[0].otp, expiresAt: new Date(rows[0].expires_at).getTime() };
};

export const deleteOtp = async (email: string) => {
  await ensureSchema();
  await getPool().query(`DELETE FROM otp_store WHERE email = $1`, [email.toLowerCase()]);
};

export const clearExpiredOtps = async () => {
  await ensureSchema();
  await getPool().query(`DELETE FROM otp_store WHERE expires_at <= NOW()`);
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
