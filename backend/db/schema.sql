CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS institutes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  admin_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  password TEXT,
  permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
  register_number TEXT,
  admin_id TEXT,
  institution_name TEXT,
  institute_id TEXT,
  approval_status TEXT NOT NULL DEFAULT 'PENDING',
  approval_reason TEXT,
  reply_to_email TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_admin_id ON users(admin_id);
CREATE INDEX IF NOT EXISTS idx_users_institute_id ON users(institute_id);

CREATE TABLE IF NOT EXISTS hall_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  layout JSONB NOT NULL,
  created_by TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  institute_id TEXT NOT NULL,
  template_source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE hall_templates ADD COLUMN IF NOT EXISTS template_source TEXT NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_hall_templates_admin_id ON hall_templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_hall_templates_institute_id ON hall_templates(institute_id);

CREATE TABLE IF NOT EXISTS student_set_templates (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  student_count INTEGER NOT NULL,
  students JSONB,
  created_by TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  institute_id TEXT NOT NULL,
  template_source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE student_set_templates ADD COLUMN IF NOT EXISTS template_source TEXT NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_student_set_templates_admin_id ON student_set_templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_student_set_templates_institute_id ON student_set_templates(institute_id);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  session TEXT NOT NULL DEFAULT 'Morning',
  start_time TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  halls JSONB NOT NULL,
  student_sets JSONB NOT NULL,
  seating_plan JSONB,
  ai_seating_rules TEXT,
  seating_type TEXT,
  editor_mode TEXT,
  validation_report JSONB,
  seating_plan_version INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  auto_delete_seating_after_exam BOOLEAN NOT NULL DEFAULT FALSE,
  source_template_id TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_by TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  institute_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS session TEXT NOT NULL DEFAULT 'Morning';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS validation_report JSONB;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS seating_plan_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS auto_delete_seating_after_exam BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS source_template_id TEXT;
CREATE INDEX IF NOT EXISTS idx_exams_admin_id ON exams(admin_id);
CREATE INDEX IF NOT EXISTS idx_exams_institute_id ON exams(institute_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);

CREATE TABLE IF NOT EXISTS seat_assignments (
  id TEXT PRIMARY KEY,
  institute_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  session TEXT,
  start_time TEXT,
  student_roll_no TEXT NOT NULL,
  student_name TEXT,
  hall_id TEXT NOT NULL,
  hall_name TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  col_index INTEGER NOT NULL,
  seat_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE seat_assignments ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE seat_assignments ADD COLUMN IF NOT EXISTS start_time TEXT;
CREATE INDEX IF NOT EXISTS idx_seat_assignments_institute_roll ON seat_assignments(institute_id, student_roll_no);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_exam_id ON seat_assignments(exam_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_assignments_exam_student ON seat_assignments(exam_id, student_roll_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_assignments_exam_seat ON seat_assignments(exam_id, hall_id, row_index, col_index);


CREATE TABLE IF NOT EXISTS seating_plan_versions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  seating_plan JSONB NOT NULL,
  validation_report JSONB,
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seating_plan_versions_exam_id ON seating_plan_versions(exam_id);

CREATE TABLE IF NOT EXISTS seating_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  institute_id TEXT NOT NULL,
  halls JSONB NOT NULL,
  student_sets JSONB NOT NULL,
  seating_plan JSONB NOT NULL,
  title TEXT,
  session TEXT,
  start_time TEXT,
  editor_mode TEXT,
  seating_type TEXT,
  ai_seating_rules TEXT,
  auto_delete_seating_after_exam BOOLEAN NOT NULL DEFAULT FALSE,
  source_exam_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seating_templates_admin_id ON seating_templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_seating_templates_institute_id ON seating_templates(institute_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS otp_store (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'LOGIN',
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payload JSONB,
  PRIMARY KEY (email, purpose)
);
ALTER TABLE otp_store ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'LOGIN';
ALTER TABLE otp_store ADD COLUMN IF NOT EXISTS payload JSONB;
CREATE INDEX IF NOT EXISTS idx_otp_store_expires_at ON otp_store(expires_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS reply_to_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

ALTER TABLE exams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS deleted_by TEXT;
CREATE INDEX IF NOT EXISTS idx_exams_deleted_at ON exams(deleted_at);

ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS editor_mode TEXT;
ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS seating_type TEXT;
ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS ai_seating_rules TEXT;
ALTER TABLE seating_templates ADD COLUMN IF NOT EXISTS auto_delete_seating_after_exam BOOLEAN NOT NULL DEFAULT FALSE;
