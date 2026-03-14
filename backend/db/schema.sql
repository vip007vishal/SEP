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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_set_templates_admin_id ON student_set_templates(admin_id);
CREATE INDEX IF NOT EXISTS idx_student_set_templates_institute_id ON student_set_templates(institute_id);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  halls JSONB NOT NULL,
  student_sets JSONB NOT NULL,
  seating_plan JSONB,
  ai_seating_rules TEXT,
  seating_type TEXT,
  editor_mode TEXT,
  created_by TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  institute_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exams_admin_id ON exams(admin_id);
CREATE INDEX IF NOT EXISTS idx_exams_institute_id ON exams(institute_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);

CREATE TABLE IF NOT EXISTS seat_assignments (
  id TEXT PRIMARY KEY,
  institute_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  student_roll_no TEXT NOT NULL,
  student_name TEXT,
  hall_id TEXT NOT NULL,
  hall_name TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  col_index INTEGER NOT NULL,
  seat_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_institute_roll ON seat_assignments(institute_id, student_roll_no);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_exam_id ON seat_assignments(exam_id);

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
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_store_expires_at ON otp_store(expires_at);
