import fs from "fs";
import path from "path";
import { Pool, PoolClient } from "pg";
import { env } from "../utils/env";
import { ApprovalStatus, AuditLog, Exam, HallTemplate, Institute, Role, SeatAssignment, SeatingPlanTemplate, SeatingPlanVersion, StudentSetTemplate, User } from "../types";

export interface DbData {
  users: User[];
  institutes: Institute[];
  exams: Exam[];
  hallTemplates: HallTemplate[];
  studentSetTemplates: StudentSetTemplate[];
  seatAssignments: SeatAssignment[];
  auditLogs: AuditLog[];
  seatingPlanVersions: SeatingPlanVersion[];
  seatingTemplates: SeatingPlanTemplate[];
}

const emptyDb = (): DbData => ({
  users: [],
  institutes: [],
  exams: [],
  hallTemplates: [],
  studentSetTemplates: [],
  seatAssignments: [],
  auditLogs: [],
  seatingPlanVersions: [],
  seatingTemplates: [],
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
    `INSERT INTO users (id, name, email, role, password, permission_granted, approval_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       password = EXCLUDED.password,
       permission_granted = EXCLUDED.permission_granted,
       approval_status = EXCLUDED.approval_status`,
    [
      "superadmin",
      env.superAdminName,
      env.superAdminEmail,
      Role.SUPER_ADMIN,
      env.superAdminPassword,
      true,
      "APPROVED",
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
            institute_id AS "instituteId",
            approval_status AS "approvalStatus",
            approval_reason AS "approvalReason"
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
    `SELECT id, name, layout, created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId", template_source AS "templateSource"
     FROM hall_templates
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};

const mapStudentSetTemplates = async (client: PoolClient): Promise<StudentSetTemplate[]> => {
  const { rows } = await client.query(
    `SELECT id, subject, student_count AS "studentCount", students, created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId", template_source AS "templateSource"
     FROM student_set_templates
     ORDER BY created_at ASC, id ASC`
  );
  return rows;
};

const mapExams = async (client: PoolClient): Promise<Exam[]> => {
  const { rows } = await client.query(
    `SELECT id, title, exam_date, session, start_time AS "startTime", status, halls, student_sets AS "studentSets", seating_plan AS "seatingPlan",
            ai_seating_rules AS "aiSeatingRules", seating_type AS "seatingType", editor_mode AS "editorMode",
            created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId",
            validation_report AS "validationReport", seating_plan_version AS "seatingPlanVersion",
            published_at::text AS "publishedAt", locked_at::text AS "lockedAt",
            auto_delete_seating_after_exam AS "autoDeleteSeatingAfterExam", source_template_id AS "sourceTemplateId"
     FROM exams
     ORDER BY exam_date ASC, created_at ASC, id ASC`
  );
  return rows.map((row) => ({ ...row, date: normalizeDate(row.exam_date) }));
};

const mapSeatAssignments = async (client: PoolClient): Promise<SeatAssignment[]> => {
  const { rows } = await client.query(
    `SELECT id, institute_id AS "instituteId", exam_id AS "examId", exam_title AS "examTitle", exam_date,
            session, start_time AS "startTime", student_roll_no AS "studentRollNo", student_name AS "studentName", hall_id AS "hallId", hall_name AS "hallName",
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

const mapSeatingPlanVersions = async (client: PoolClient): Promise<SeatingPlanVersion[]> => {
  const { rows } = await client.query(
    `SELECT id, exam_id AS "examId", version_number AS "versionNumber", seating_plan AS "seatingPlan", validation_report AS "validationReport",
            created_by AS "createdBy", notes, created_at::text AS "createdAt"
     FROM seating_plan_versions
     ORDER BY created_at DESC, version_number DESC`
  );
  return rows;
};

const mapSeatingTemplates = async (client: PoolClient): Promise<SeatingPlanTemplate[]> => {
  const { rows } = await client.query(
    `SELECT id, name, description, created_by AS "createdBy", admin_id AS "adminId", institute_id AS "instituteId", halls, student_sets AS "studentSets",
            seating_plan AS "seatingPlan", source_exam_id AS "sourceExamId", created_at::text AS "createdAt"
     FROM seating_templates
     ORDER BY created_at DESC`
  );
  return rows;
};

export const loadDb = async (): Promise<DbData> => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await upsertSuperAdmin(client);
    const [users, institutes, exams, hallTemplates, studentSetTemplates, seatAssignments, auditLogs, seatingPlanVersions, seatingTemplates] = await Promise.all([
      mapUsers(client),
      mapInstitutes(client),
      mapExams(client),
      mapHallTemplates(client),
      mapStudentSetTemplates(client),
      mapSeatAssignments(client),
      mapAuditLogs(client),
      mapSeatingPlanVersions(client),
      mapSeatingTemplates(client),
    ]);
    return { users, institutes, exams, hallTemplates, studentSetTemplates, seatAssignments, auditLogs, seatingPlanVersions, seatingTemplates };
  } finally {
    client.release();
  }
};

export const saveDb = async (db: DbData) => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE seat_assignments, seating_plan_versions, seating_templates, exams, hall_templates, student_set_templates, institutes, audit_logs, users RESTART IDENTITY CASCADE`);

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
        `INSERT INTO users (id, name, email, role, password, permission_granted, register_number, admin_id, institution_name, institute_id, approval_status, approval_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
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
          user.approvalStatus || (user.permissionGranted ? 'APPROVED' : 'PENDING'),
          user.approvalReason || null,
        ]
      );
    }

    for (const template of db.hallTemplates || []) {
      await client.query(
        `INSERT INTO hall_templates (id, name, layout, created_by, admin_id, institute_id, template_source)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)`,
        [template.id, template.name, JSON.stringify(template.layout || []), template.createdBy, template.adminId, template.instituteId || null, template.templateSource || 'manual']
      );
    }

    for (const template of db.studentSetTemplates || []) {
      await client.query(
        `INSERT INTO student_set_templates (id, subject, student_count, students, created_by, admin_id, institute_id, template_source)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)`,
        [template.id, template.subject, template.studentCount, JSON.stringify(template.students || []), template.createdBy, template.adminId, template.instituteId || null, template.templateSource || 'manual']
      );
    }

    for (const exam of db.exams || []) {
      await client.query(
        `INSERT INTO exams (id, title, exam_date, session, start_time, status, halls, student_sets, seating_plan, ai_seating_rules, seating_type, editor_mode, validation_report, seating_plan_version, published_at, locked_at, auto_delete_seating_after_exam, source_template_id, created_by, admin_id, institute_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          exam.id,
          exam.title,
          normalizeDate(exam.date),
          exam.session || 'Morning',
          exam.startTime || null,
          exam.status || 'DRAFT',
          JSON.stringify(exam.halls || []),
          JSON.stringify(exam.studentSets || []),
          JSON.stringify(exam.seatingPlan || null),
          exam.aiSeatingRules || null,
          exam.seatingType || null,
          exam.editorMode || null,
          JSON.stringify(exam.validationReport || null),
          exam.seatingPlanVersion || 0,
          exam.publishedAt || null,
          exam.lockedAt || null,
          exam.autoDeleteSeatingAfterExam ?? false,
          exam.sourceTemplateId || null,
          exam.createdBy,
          exam.adminId,
          exam.instituteId || null,
        ]
      );
    }

    const seatAssignmentsByStudent = new Map<string, SeatAssignment>();
    const seenSeatKeys = new Set<string>();

    for (const assignment of db.seatAssignments || []) {
      const studentKey = `${assignment.examId}:${String(assignment.studentRollNo).trim().toLowerCase()}`;
      const seatKey = `${assignment.examId}:${assignment.hallId}:${assignment.row}:${assignment.col}`;

      if (seenSeatKeys.has(seatKey)) continue;
      if (seatAssignmentsByStudent.has(studentKey)) continue;

      seatAssignmentsByStudent.set(studentKey, assignment);
      seenSeatKeys.add(seatKey);
    }

    const uniqueSeatAssignments = Array.from(seatAssignmentsByStudent.values());

    for (const assignment of uniqueSeatAssignments) {
      await client.query(
        `INSERT INTO seat_assignments (id, institute_id, exam_id, exam_title, exam_date, session, start_time, student_roll_no, student_name, hall_id, hall_name, row_index, col_index, seat_label)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          assignment.id,
          assignment.instituteId,
          assignment.examId,
          assignment.examTitle,
          normalizeDate(assignment.examDate),
          assignment.session || null,
          assignment.startTime || null,
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

    for (const version of db.seatingPlanVersions || []) {
      await client.query(
        `INSERT INTO seating_plan_versions (id, exam_id, version_number, seating_plan, validation_report, created_by, notes, created_at)
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)`,
        [version.id, version.examId, version.versionNumber, JSON.stringify(version.seatingPlan), JSON.stringify(version.validationReport || null), version.createdBy, version.notes || null, version.createdAt]
      );
    }

    for (const template of db.seatingTemplates || []) {
      await client.query(
        `INSERT INTO seating_templates (id, name, description, created_by, admin_id, institute_id, halls, student_sets, seating_plan, source_exam_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11)`,
        [template.id, template.name, template.description || null, template.createdBy, template.adminId, template.instituteId || null, JSON.stringify(template.halls || []), JSON.stringify(template.studentSets || []), JSON.stringify(template.seatingPlan || null), (template as any).sourceExamId || null, template.createdAt]
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

export const storeOtp = async (email: string, otp: string, expiresAt: Date, purpose = 'LOGIN', payload: any = null) => {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO otp_store (email, purpose, otp, expires_at, payload)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (email, purpose) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, payload = EXCLUDED.payload`,
    [email.toLowerCase(), purpose, otp, expiresAt.toISOString(), JSON.stringify(payload)]
  );
};

export const getOtp = async (email: string, purpose = 'LOGIN'): Promise<{ otp: string; expiresAt: number; payload?: any } | null> => {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT otp, expires_at, payload FROM otp_store WHERE email = $1 AND purpose = $2`,
    [email.toLowerCase(), purpose]
  );
  if (!rows[0]) return null;
  return { otp: rows[0].otp, expiresAt: new Date(rows[0].expires_at).getTime(), payload: rows[0].payload || null };
};

export const deleteOtp = async (email: string, purpose = 'LOGIN') => {
  await ensureSchema();
  await getPool().query(`DELETE FROM otp_store WHERE email = $1 AND purpose = $2`, [email.toLowerCase(), purpose]);
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
