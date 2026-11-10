import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['STUDENT', 'TEACHER', 'ADMIN']);
export const examStatusEnum = pgEnum('exam_status', ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']);
export const questionTypeEnum = pgEnum('question_type', ['MCQ', 'SHORT_ANSWER', 'ESSAY']);
export const difficultyLevelEnum = pgEnum('difficulty_level', ['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED']);
export const submissionStatusEnum = pgEnum('submission_status', [
  'IN_PROGRESS',
  'SUBMITTED',
  'AUTO_SUBMITTED_TIMEOUT',
  'AUTO_SUBMITTED_VIOLATION',
  'GRADED',
]);
export const violationTypeEnum = pgEnum('violation_type', [
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
  'CLIPBOARD_COPY',
  'CLIPBOARD_PASTE',
  'CONTEXT_MENU',
  'SHORTCUT_BLOCKED',
  'DEVTOOLS_SUSPECTED',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    fullName: varchar('full_name', { length: 150 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').default('STUDENT').notNull(),
    cohortId: uuid('cohort_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_users_role_cohort').on(table.role, table.cohortId)]
);

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: varchar('subject', { length: 100 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  targetMasteryPct: numeric('target_mastery_pct', { precision: 5, scale: 2 }).default('70.00').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const exams = pgTable(
  'exams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    cohortId: uuid('cohort_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: examStatusEnum('status').default('DRAFT').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    availableFrom: timestamp('available_from', { withTimezone: true }).notNull(),
    availableUntil: timestamp('available_until', { withTimezone: true }).notNull(),
    totalPoints: numeric('total_points', { precision: 7, scale: 2 }).default('100.00').notNull(),
    maxStrikes: integer('max_strikes').default(3).notNull(),
    enforceFullscreen: boolean('enforce_fullscreen').default(true).notNull(),
    blockClipboard: boolean('block_clipboard').default(true).notNull(),
    shuffleQuestions: boolean('shuffle_questions').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_exams_cohort_status').on(table.cohortId, table.status, table.availableFrom)]
);

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'restrict' }),
    type: questionTypeEnum('type').notNull(),
    difficulty: difficultyLevelEnum('difficulty').default('INTERMEDIATE').notNull(),
    displayOrder: integer('display_order').notNull(),
    prompt: text('prompt').notNull(),
    points: numeric('points', { precision: 5, scale: 2 }).notNull(),
    options: jsonb('options'),
    gradingKey: jsonb('grading_key').notNull(),
    explanation: text('explanation'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_questions_exam_topic').on(table.examId, table.topicId)]
);

export const examSubmissions = pgTable(
  'exam_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: submissionStatusEnum('status').default('IN_PROGRESS').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    strikeCount: integer('strike_count').default(0).notNull(),
    integrityScore: numeric('integrity_score', { precision: 5, scale: 2 }).default('100.00').notNull(),
    totalScore: numeric('total_score', { precision: 7, scale: 2 }),
    percentageScore: numeric('percentage_score', { precision: 5, scale: 2 }),
    teacherSummaryFeedback: text('teacher_summary_feedback'),
    userAgent: text('user_agent'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uniq_exam_student_submission').on(table.examId, table.studentId),
    index('idx_submissions_exam_status').on(table.examId, table.status),
  ]
);

export const submissionAnswers = pgTable(
  'submission_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => examSubmissions.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    answerPayload: jsonb('answer_payload').default({}).notNull(),
    isAutoGraded: boolean('is_auto_graded').default(false).notNull(),
    isCorrect: boolean('is_correct'),
    pointsAwarded: numeric('points_awarded', { precision: 5, scale: 2 }).default('0.00'),
    teacherFeedback: text('teacher_feedback'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uniq_submission_question').on(table.submissionId, table.questionId)]
);

export const proctoringLogs = pgTable(
  'proctoring_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => examSubmissions.id, { onDelete: 'cascade' }),
    violationType: violationTypeEnum('violation_type').notNull(),
    strikeDelta: integer('strike_delta').default(1).notNull(),
    strikeCountAfter: integer('strike_count_after').notNull(),
    clientTimestamp: timestamp('client_timestamp', { withTimezone: true }).notNull(),
    serverTimestamp: timestamp('server_timestamp', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
  },
  (table) => [index('idx_proctoring_logs_submission').on(table.submissionId, table.serverTimestamp)]
);
