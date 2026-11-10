export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'ESSAY';
export type DifficultyLevel = 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED';

export type SubmissionStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AUTO_SUBMITTED_TIMEOUT'
  | 'AUTO_SUBMITTED_VIOLATION'
  | 'GRADED';

export type ViolationType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'CLIPBOARD_COPY'
  | 'CLIPBOARD_PASTE'
  | 'CONTEXT_MENU'
  | 'SHORTCUT_BLOCKED'
  | 'DEVTOOLS_SUSPECTED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cohortId: string;
  avatarInitials: string;
}

export interface Topic {
  id: string;
  subject: string;
  name: string;
  code: string;
  targetMasteryPct: number;
}

export interface MCQOption {
  id: string;
  text: string;
}

export interface RubricItem {
  criterion: string;
  maxPoints: number;
}

export interface GradingKey {
  correctOptionId?: string;
  acceptedAnswers?: string[];
  keywords?: string[];
  rubric?: RubricItem[];
}

export interface Question {
  id: string;
  examId: string;
  topicId: string;
  topicName: string;
  topicCode: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  displayOrder: number;
  prompt: string;
  points: number;
  options?: MCQOption[];
  gradingKey: GradingKey;
  explanation: string;
}

export interface SafeStudentQuestion {
  id: string;
  examId: string;
  topicId: string;
  topicName: string;
  topicCode: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  displayOrder: number;
  prompt: string;
  points: number;
  options?: MCQOption[];
}

export interface Exam {
  id: string;
  teacherId: string;
  cohortId: string;
  courseCode: string;
  title: string;
  description: string;
  status: ExamStatus;
  durationMinutes: number;
  availableFrom: string;
  availableUntil: string;
  totalPoints: number;
  maxStrikes: number;
  enforceFullscreen: boolean;
  blockClipboard: boolean;
  shuffleQuestions: boolean;
  questions: Question[];
  createdAt: string;
}

export interface SubmissionAnswer {
  questionId: string;
  selectedOptionId?: string;
  textResponse?: string;
  isAutoGraded: boolean;
  isCorrect?: boolean;
  pointsAwarded: number;
  maxPoints: number;
  teacherFeedback?: string;
  updatedAt: string;
}

export interface ProctoringLog {
  id: string;
  submissionId: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  violationType: ViolationType;
  strikeDelta: number;
  strikeCountAfter: number;
  clientTimestamp: string;
  serverTimestamp: string;
  description: string;
  metadata: Record<string, unknown>;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: SubmissionStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  strikeCount: number;
  maxStrikes: number;
  integrityScore: number;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  cohortZScore?: number;
  teacherSummaryFeedback?: string;
  answers: Record<string, SubmissionAnswer>;
  updatedAt: string;
}

export interface TopicGapMetric {
  topicId: string;
  topicCode: string;
  topicName: string;
  subject: string;
  studentMasteryPct: number;
  cohortAvgPct: number;
  targetMasteryPct: number;
  deltaFromCohort: number;
  questionsAttempted: number;
  competencyStatus: 'CRITICAL_GAP' | 'DEVELOPING' | 'MASTERED';
  recommendedAction: string;
}

export interface StudentGrowthPoint {
  examId: string;
  examTitle: string;
  date: string;
  studentPct: number;
  cohortAvgPct: number;
  zScore: number;
  integrityScore: number;
}
