export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export type SeatType = 'standard' | 'accessible' | 'faculty';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ExamStatus = 'DRAFT' | 'GENERATED' | 'PUBLISHED' | 'LOCKED';
export type ExamSession = 'Morning' | 'Afternoon' | 'Evening';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
  replyToEmail?: string;
  permissionGranted?: boolean;
  registerNumber?: string;
  adminId?: string;
  institutionName?: string;
  instituteId?: string;
  approvalStatus?: ApprovalStatus;
  approvalReason?: string;
  failedLoginCount?: number;
  lockedUntil?: string;
}

export interface Institute {
  id: string;
  name: string;
  code?: string;
  adminId?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SeatDefinition {
  id: string;
  row: number;
  col: number;
  type: SeatType;
}

export interface HallAllocation {
  enabled: boolean;
  strategy: 'linear' | 'diagonal';
  linearDirection: 'horizontal' | 'vertical';
}

export interface HallConstraint {
  type: 'no-limit' | 'advanced';
  allowedSetIds?: string[];
  setLimits?: { [setId: string]: number };
  arrangement?: 'horizontal' | 'vertical';
  allocation?: HallAllocation;
}

export interface Hall {
  id: string;
  name: string;
  layout: SeatDefinition[];
  constraints?: HallConstraint;
  frontDirection?: 'top' | 'bottom' | 'left' | 'right';
  instituteId?: string;
}

export interface HallTemplate {
  id: string;
  name: string;
  layout: SeatDefinition[];
  createdBy: string;
  adminId: string;
  instituteId?: string;
  templateSource?: 'manual' | 'imported';
}

export interface StudentSetTemplate {
  id: string;
  subject: string;
  studentCount: number;
  students?: string[];
  createdBy: string;
  adminId: string;
  instituteId?: string;
  templateSource?: 'manual' | 'imported';
}

export interface StudentSet {
  id: string;
  subject: string;
  studentCount: number;
  students?: string[];
  instituteId?: string;
}

export interface StudentInfo {
  id: string;
  setId: string;
  setNumber: number;
}

export interface Seat extends SeatDefinition {
  hallId: string;
  student?: StudentInfo;
}

export interface SeatingPlan {
  [hallId: string]: Seat[][];
}

export interface ValidationIssue {
  code: string;
  level: 'error' | 'warning';
  message: string;
}

export interface ValidationReport {
  generatedAt: string;
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  session?: ExamSession;
  startTime?: string;
  halls: Hall[];
  studentSets: StudentSet[];
  seatingPlan?: SeatingPlan;
  aiSeatingRules?: string;
  seatingType?: 'normal' | 'fair';
  editorMode?: 'ai' | 'classic' | 'advanced' | 'ai-advanced';
  createdBy: string;
  adminId: string;
  instituteId?: string;
  status?: ExamStatus;
  publishedAt?: string;
  lockedAt?: string;
  validationReport?: ValidationReport;
  seatingPlanVersion?: number;
  autoDeleteSeatingAfterExam?: boolean;
  sourceTemplateId?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface SeatingPlanVersion {
  id: string;
  examId: string;
  versionNumber: number;
  seatingPlan: SeatingPlan;
  validationReport?: ValidationReport;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface SeatingPlanTemplate {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  adminId: string;
  instituteId?: string;
  title?: string;
  session?: ExamSession;
  startTime?: string;
  editorMode?: 'ai' | 'classic' | 'advanced' | 'ai-advanced';
  seatingType?: 'normal' | 'fair';
  aiSeatingRules?: string;
  autoDeleteSeatingAfterExam?: boolean;
  halls: Hall[];
  studentSets: StudentSet[];
  seatingPlan: SeatingPlan;
  createdAt: string;
  sourceExamId?: string;
}

export interface SeatAssignment {
  id: string;
  instituteId: string;
  examId: string;
  examTitle: string;
  examDate: string;
  session?: ExamSession;
  startTime?: string;
  studentRollNo: string;
  studentName?: string;
  hallId: string;
  hallName: string;
  row: number;
  col: number;
  seatLabel: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  actorName: string;
  role: Role;
  action: string;
  details: string;
  timestamp: string;
}
