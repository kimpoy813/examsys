-- =============================================================================
-- EXAMSYS: Online Student Examination, Proctoring & Analytics Platform
-- Target Database: Neon Serverless PostgreSQL 16+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Domain Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('MCQ', 'SHORT_ANSWER', 'ESSAY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM (
    'IN_PROGRESS',
    'SUBMITTED',
    'AUTO_SUBMITTED_TIMEOUT',
    'AUTO_SUBMITTED_VIOLATION',
    'GRADED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_type AS ENUM (
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'FULLSCREEN_EXIT',
    'CLIPBOARD_COPY',
    'CLIPBOARD_PASTE',
    'CONTEXT_MENU',
    'SHORTCUT_BLOCKED',
    'DEVTOOLS_SUSPECTED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  cohort_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_cohort ON users(role, cohort_id);

-- 3. Curriculum Topics Table (Drives Learning Gap Identification)
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  target_mastery_pct NUMERIC(5,2) NOT NULL DEFAULT 70.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cohort_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status exam_status NOT NULL DEFAULT 'DRAFT',
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  available_from TIMESTAMPTZ NOT NULL,
  available_until TIMESTAMPTZ NOT NULL,
  total_points NUMERIC(7,2) NOT NULL DEFAULT 100.00,
  max_strikes INT NOT NULL DEFAULT 3 CHECK (max_strikes >= 1),
  enforce_fullscreen BOOLEAN NOT NULL DEFAULT TRUE,
  block_clipboard BOOLEAN NOT NULL DEFAULT TRUE,
  shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_exam_window CHECK (available_until > available_from)
);

CREATE INDEX IF NOT EXISTS idx_exams_cohort_status ON exams(cohort_id, status, available_from);

-- 5. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
  type question_type NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'INTERMEDIATE',
  display_order INT NOT NULL,
  prompt TEXT NOT NULL,
  points NUMERIC(5,2) NOT NULL CHECK (points > 0),
  options JSONB,
  grading_key JSONB NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_topic ON questions(exam_id, topic_id);

-- 6. Exam Submissions Table
CREATE TABLE IF NOT EXISTS exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status submission_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  strike_count INT NOT NULL DEFAULT 0,
  integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  total_score NUMERIC(7,2),
  percentage_score NUMERIC(5,2),
  teacher_summary_feedback TEXT,
  ip_address INET,
  user_agent TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_status ON exam_submissions(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_student_history ON exam_submissions(student_id, submitted_at DESC);

-- 7. Submission Answers Table
CREATE TABLE IF NOT EXISTS submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_auto_graded BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct BOOLEAN,
  points_awarded NUMERIC(5,2) DEFAULT 0.00,
  teacher_feedback TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_question_lookup ON submission_answers(question_id, points_awarded);

-- 8. Proctoring Violations / Audit Logs Table
CREATE TABLE IF NOT EXISTS proctoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
  violation_type violation_type NOT NULL,
  strike_delta INT NOT NULL DEFAULT 1,
  strike_count_after INT NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_proctoring_logs_submission ON proctoring_logs(submission_id, server_timestamp DESC);
