import {
  Exam,
  ExamSubmission,
  ProctoringLog,
  Question,
  SafeStudentQuestion,
  StudentGrowthPoint,
  SubmissionAnswer,
  SubmissionStatus,
  Topic,
  TopicGapMetric,
  User,
  ViolationType,
} from '@/types/exam';

const COHORT_ID = 'cohort-cs401-2026';

const INITIAL_TOPICS: Topic[] = [
  {
    id: 'topic-dp',
    subject: 'Algorithms & Complexity',
    name: 'Dynamic Programming & Memoization',
    code: 'CS-ALG-DP-01',
    targetMasteryPct: 75,
  },
  {
    id: 'topic-acid',
    subject: 'Database Systems',
    name: 'ACID Transactions & Isolation Levels',
    code: 'CS-DB-ACID-02',
    targetMasteryPct: 80,
  },
  {
    id: 'topic-dist',
    subject: 'Distributed Systems',
    name: 'Serverless Scaling & Connection Pooling',
    code: 'CS-SYS-POOL-03',
    targetMasteryPct: 75,
  },
  {
    id: 'topic-sec',
    subject: 'Application Security',
    name: 'JWT Auth, RBAC & Browser Sandboxing',
    code: 'CS-SEC-SANDBOX-04',
    targetMasteryPct: 85,
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'student-alex',
    email: 'alex.rivera@university.edu',
    fullName: 'Alex Rivera',
    role: 'STUDENT',
    cohortId: COHORT_ID,
    avatarInitials: 'AR',
  },
  {
    id: 'student-maya',
    email: 'maya.lin@university.edu',
    fullName: 'Maya Lin',
    role: 'STUDENT',
    cohortId: COHORT_ID,
    avatarInitials: 'ML',
  },
  {
    id: 'student-liam',
    email: 'liam.oconnor@university.edu',
    fullName: "Liam O'Connor",
    role: 'STUDENT',
    cohortId: COHORT_ID,
    avatarInitials: 'LO',
  },
  {
    id: 'student-priya',
    email: 'priya.patel@university.edu',
    fullName: 'Priya Patel',
    role: 'STUDENT',
    cohortId: COHORT_ID,
    avatarInitials: 'PP',
  },
  {
    id: 'teacher-rostova',
    email: 'e.rostova@university.edu',
    fullName: 'Dr. Evelyn Rostova',
    role: 'TEACHER',
    cohortId: COHORT_ID,
    avatarInitials: 'ER',
  },
];

const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-distributed-2026',
    teacherId: 'teacher-rostova',
    cohortId: COHORT_ID,
    courseCode: 'CS-401',
    title: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    description:
      'Covers serverless database pooling on Neon/Vercel, ACID transaction isolation guarantees, algorithmic complexity, and browser security sandboxes.',
    status: 'PUBLISHED',
    durationMinutes: 45,
    availableFrom: '2026-11-01T00:00:00.000Z',
    availableUntil: '2026-12-31T23:59:59.000Z',
    totalPoints: 100,
    maxStrikes: 3,
    enforceFullscreen: true,
    blockClipboard: true,
    shuffleQuestions: false,
    createdAt: '2026-11-01T09:00:00.000Z',
    questions: [
      {
        id: 'q-dist-1',
        examId: 'exam-distributed-2026',
        topicId: 'topic-dist',
        topicName: 'Serverless Scaling & Connection Pooling',
        topicCode: 'CS-SYS-POOL-03',
        type: 'MCQ',
        difficulty: 'INTERMEDIATE',
        displayOrder: 1,
        prompt:
          'When deploying a Next.js App Router application on Vercel connected to Neon Serverless Postgres, why is using a pooled connection string (-pooler with PgBouncer) critical during an exam start spike?',
        points: 20,
        options: [
          {
            id: 'opt-a',
            text: 'Because each concurrent serverless function invocation can open a separate database connection, rapidly exhausting raw PostgreSQL max_connections without a transaction pooler.',
          },
          {
            id: 'opt-b',
            text: 'Because PostgreSQL cannot execute SELECT queries over TLS without PgBouncer enabled.',
          },
          {
            id: 'opt-c',
            text: 'Because PgBouncer automatically converts relational tables into client-side IndexedDB stores.',
          },
          {
            id: 'opt-d',
            text: 'Because Vercel Edge Middleware only supports SQLite connections.',
          },
        ],
        gradingKey: {
          correctOptionId: 'opt-a',
        },
        explanation:
          'Serverless functions scale horizontally per concurrent request. Transaction-mode connection pooling via PgBouncer multiplexes thousands of ephemeral function connections over a small pool of physical Postgres connections.',
      },
      {
        id: 'q-acid-2',
        examId: 'exam-distributed-2026',
        topicId: 'topic-acid',
        topicName: 'ACID Transactions & Isolation Levels',
        topicCode: 'CS-DB-ACID-02',
        type: 'MCQ',
        difficulty: 'ADVANCED',
        displayOrder: 2,
        prompt:
          'In our proctoring strike route handler, two violation events arrive 20ms apart for the same submission. Which SQL clause on the SELECT query prevents a race condition when reading and incrementing strike_count inside a transaction?',
        points: 20,
        options: [
          { id: 'opt-1', text: 'SELECT ... WITH (NOLOCK)' },
          { id: 'opt-2', text: 'SELECT ... FOR UPDATE' },
          { id: 'opt-3', text: 'SELECT DISTINCT ON (strike_count)' },
          { id: 'opt-4', text: 'SELECT ... GROUP BY ROLLUP' },
        ],
        gradingKey: {
          correctOptionId: 'opt-2',
        },
        explanation:
          'SELECT ... FOR UPDATE acquires a row-level exclusive lock on the exam_submissions row until the transaction commits, serializing concurrent strike updates.',
      },
      {
        id: 'q-dp-3',
        examId: 'exam-distributed-2026',
        topicId: 'topic-dp',
        topicName: 'Dynamic Programming & Memoization',
        topicCode: 'CS-ALG-DP-01',
        type: 'SHORT_ANSWER',
        difficulty: 'INTERMEDIATE',
        displayOrder: 3,
        prompt:
          'What is the asymptotic time complexity (in Big-O notation, e.g., O(n)) of computing the N-th Fibonacci number using top-down Dynamic Programming with memoization?',
        points: 25,
        gradingKey: {
          acceptedAnswers: ['o(n)', 'o(1*n)', 'theta(n)', 'linear', 'o(n) time'],
          keywords: ['o(n)', 'linear'],
        },
        explanation:
          'With memoization, each state F(k) for 0 <= k <= n is computed at most once and cached in O(1) lookup time, reducing the exponential O(2^n) recursion tree to O(n).',
      },
      {
        id: 'q-sec-4',
        examId: 'exam-distributed-2026',
        topicId: 'topic-sec',
        topicName: 'JWT Auth, RBAC & Browser Sandboxing',
        topicCode: 'CS-SEC-SANDBOX-04',
        type: 'ESSAY',
        difficulty: 'ADVANCED',
        displayOrder: 4,
        prompt:
          'Explain why client-side proctoring controls (fullscreen lock, visibilitychange listeners, and clipboard blocking) must always be paired with server-side validation and atomic state transitions. Mention at least three mechanisms a malicious user might attempt if validation existed only in the browser.',
        points: 35,
        gradingKey: {
          keywords: [
            'devtools',
            'tamper',
            'server',
            'expires_at',
            'grading_key',
            'transaction',
            'status',
            'api',
            'bypass',
          ],
          rubric: [
            { criterion: 'Identifies client-side DOM/JS tampering risks', maxPoints: 12 },
            { criterion: 'Explains server-authoritative timer (expires_at) & status locking', maxPoints: 12 },
            { criterion: 'Discusses omitting grading_key from active exam payloads', maxPoints: 11 },
          ],
        },
        explanation:
          'A strong architectural response explains that any client runtime is untrusted: users can disable JS listeners or forge HTTP payloads, so the server must withhold answer keys, enforce expires_at, and lock submission status once max_strikes is reached.',
      },
    ],
  },
  {
    id: 'exam-alg-foundations',
    teacherId: 'teacher-rostova',
    cohortId: COHORT_ID,
    courseCode: 'CS-401',
    title: 'Quiz 1: Algorithmic Foundations & Dynamic Programming',
    description:
      'Foundational assessment covering recurrence relations, memoization tables, and state transition graphs.',
    status: 'CLOSED',
    durationMinutes: 30,
    availableFrom: '2026-09-14T00:00:00.000Z',
    availableUntil: '2026-09-16T23:59:59.000Z',
    totalPoints: 100,
    maxStrikes: 3,
    enforceFullscreen: true,
    blockClipboard: true,
    shuffleQuestions: true,
    createdAt: '2026-09-10T09:00:00.000Z',
    questions: [
      {
        id: 'q-hist-dp-1',
        examId: 'exam-alg-foundations',
        topicId: 'topic-dp',
        topicName: 'Dynamic Programming & Memoization',
        topicCode: 'CS-ALG-DP-01',
        type: 'MCQ',
        difficulty: 'FOUNDATIONAL',
        displayOrder: 1,
        prompt: 'Which two properties must an optimization problem exhibit for Dynamic Programming to apply?',
        points: 50,
        options: [
          { id: 'o1', text: 'Optimal Substructure and Overlapping Subproblems' },
          { id: 'o2', text: 'Greedy Choice Property and Bipartite Graph Structure' },
        ],
        gradingKey: { correctOptionId: 'o1' },
        explanation: 'Optimal substructure and overlapping subproblems are the hallmark properties of DP.',
      },
      {
        id: 'q-hist-dp-2',
        examId: 'exam-alg-foundations',
        topicId: 'topic-dp',
        topicName: 'Dynamic Programming & Memoization',
        topicCode: 'CS-ALG-DP-01',
        type: 'SHORT_ANSWER',
        difficulty: 'ADVANCED',
        displayOrder: 2,
        prompt: 'What is the space complexity of the standard 2D 0/1 Knapsack table for N items and capacity W?',
        points: 50,
        gradingKey: { acceptedAnswers: ['o(nw)', 'o(n*w)'] },
        explanation: 'A 2D table of dimensions (N+1) x (W+1) requires O(N*W) auxiliary space.',
      },
    ],
  },
  {
    id: 'exam-db-transactions',
    teacherId: 'teacher-rostova',
    cohortId: COHORT_ID,
    courseCode: 'CS-401',
    title: 'Quiz 2: Relational Storage, ACID & Isolation',
    description:
      'Evaluates phantom reads, serializable snapshot isolation, write-ahead logging, and B-Tree indexing.',
    status: 'CLOSED',
    durationMinutes: 35,
    availableFrom: '2026-10-10T00:00:00.000Z',
    availableUntil: '2026-10-12T23:59:59.000Z',
    totalPoints: 100,
    maxStrikes: 3,
    enforceFullscreen: true,
    blockClipboard: true,
    shuffleQuestions: true,
    createdAt: '2026-10-05T09:00:00.000Z',
    questions: [
      {
        id: 'q-hist-db-1',
        examId: 'exam-db-transactions',
        topicId: 'topic-acid',
        topicName: 'ACID Transactions & Isolation Levels',
        topicCode: 'CS-DB-ACID-02',
        type: 'MCQ',
        difficulty: 'INTERMEDIATE',
        displayOrder: 1,
        prompt: 'What is the default transaction isolation level in PostgreSQL?',
        points: 50,
        options: [
          { id: 'db1', text: 'Read Committed' },
          { id: 'db2', text: 'Read Uncommitted' },
          { id: 'db3', text: 'Serializable' },
        ],
        gradingKey: { correctOptionId: 'db1' },
        explanation: 'PostgreSQL defaults to Read Committed isolation.',
      },
      {
        id: 'q-hist-sec-2',
        examId: 'exam-db-transactions',
        topicId: 'topic-sec',
        topicName: 'JWT Auth, RBAC & Browser Sandboxing',
        topicCode: 'CS-SEC-SANDBOX-04',
        type: 'MCQ',
        difficulty: 'INTERMEDIATE',
        displayOrder: 2,
        prompt: 'Which cookie attribute prevents client-side JavaScript from reading session tokens via document.cookie?',
        points: 50,
        options: [
          { id: 's1', text: 'HttpOnly' },
          { id: 's2', text: 'SameSite=None' },
        ],
        gradingKey: { correctOptionId: 's1' },
        explanation: 'The HttpOnly flag instructs the browser not to expose the cookie to client scripts.',
      },
    ],
  },
];

const INITIAL_SUBMISSIONS: ExamSubmission[] = [
  // Alex Rivera's past submissions (shows longitudinal improvement from 58% -> 82% -> ready for Midterm)
  {
    id: 'sub-alex-q1',
    examId: 'exam-alg-foundations',
    examTitle: 'Quiz 1: Algorithmic Foundations & Dynamic Programming',
    courseCode: 'CS-401',
    studentId: 'student-alex',
    studentName: 'Alex Rivera',
    studentEmail: 'alex.rivera@university.edu',
    status: 'GRADED',
    startedAt: '2026-09-15T14:00:00.000Z',
    expiresAt: '2026-09-15T14:30:00.000Z',
    submittedAt: '2026-09-15T14:26:12.000Z',
    strikeCount: 0,
    maxStrikes: 3,
    integrityScore: 100,
    totalScore: 54,
    maxPossibleScore: 100,
    percentageScore: 54,
    cohortZScore: -0.45,
    teacherSummaryFeedback:
      'Solid grasp of basic optimal substructure, but struggled translating 2D state tables into space complexity bounds. Review memoization state dimensions.',
    answers: {
      'q-hist-dp-1': {
        questionId: 'q-hist-dp-1',
        selectedOptionId: 'o1',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 50,
        maxPoints: 50,
        updatedAt: '2026-09-15T14:12:00.000Z',
      },
      'q-hist-dp-2': {
        questionId: 'q-hist-dp-2',
        textResponse: 'O(N)',
        isAutoGraded: true,
        isCorrect: false,
        pointsAwarded: 4,
        maxPoints: 50,
        teacherFeedback: 'O(N) only applies after rolling-array optimization; standard 2D table is O(N*W).',
        updatedAt: '2026-09-15T14:25:00.000Z',
      },
    },
    updatedAt: '2026-09-15T14:26:12.000Z',
  },
  {
    id: 'sub-alex-q2',
    examId: 'exam-db-transactions',
    examTitle: 'Quiz 2: Relational Storage, ACID & Isolation',
    courseCode: 'CS-401',
    studentId: 'student-alex',
    studentName: 'Alex Rivera',
    studentEmail: 'alex.rivera@university.edu',
    status: 'GRADED',
    startedAt: '2026-10-11T10:00:00.000Z',
    expiresAt: '2026-10-11T10:35:00.000Z',
    submittedAt: '2026-10-11T10:29:40.000Z',
    strikeCount: 1,
    maxStrikes: 3,
    integrityScore: 90,
    totalScore: 88,
    maxPossibleScore: 100,
    percentageScore: 88,
    cohortZScore: 0.62,
    teacherSummaryFeedback:
      'Strong upward trajectory! Demonstrated clear mastery of PostgreSQL isolation levels and cookie security primitives.',
    answers: {
      'q-hist-db-1': {
        questionId: 'q-hist-db-1',
        selectedOptionId: 'db1',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 44,
        maxPoints: 50,
        updatedAt: '2026-10-11T10:15:00.000Z',
      },
      'q-hist-sec-2': {
        questionId: 'q-hist-sec-2',
        selectedOptionId: 's1',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 44,
        maxPoints: 50,
        updatedAt: '2026-10-11T10:28:00.000Z',
      },
    },
    updatedAt: '2026-10-11T10:29:40.000Z',
  },
  // Other cohort students on the current Midterm so the Teacher Dashboard has live & graded data immediately
  {
    id: 'sub-maya-midterm',
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    courseCode: 'CS-401',
    studentId: 'student-maya',
    studentName: 'Maya Lin',
    studentEmail: 'maya.lin@university.edu',
    status: 'GRADED',
    startedAt: '2026-11-10T05:10:00.000Z',
    expiresAt: '2026-11-10T05:55:00.000Z',
    submittedAt: '2026-11-10T05:48:10.000Z',
    strikeCount: 0,
    maxStrikes: 3,
    integrityScore: 100,
    totalScore: 94,
    maxPossibleScore: 100,
    percentageScore: 94,
    cohortZScore: 1.15,
    teacherSummaryFeedback: 'Exceptional architectural analysis on server-authoritative proctoring.',
    answers: {
      'q-dist-1': {
        questionId: 'q-dist-1',
        selectedOptionId: 'opt-a',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 20,
        maxPoints: 20,
        updatedAt: '2026-11-10T05:20:00.000Z',
      },
      'q-acid-2': {
        questionId: 'q-acid-2',
        selectedOptionId: 'opt-2',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 20,
        maxPoints: 20,
        updatedAt: '2026-11-10T05:28:00.000Z',
      },
      'q-dp-3': {
        questionId: 'q-dp-3',
        textResponse: 'O(n)',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 22,
        maxPoints: 25,
        updatedAt: '2026-11-10T05:35:00.000Z',
      },
      'q-sec-4': {
        questionId: 'q-sec-4',
        textResponse:
          'Client-side listeners can be bypassed via DevTools or custom HTTP requests. The server must enforce expires_at, lock submission status inside ACID transactions, and never serialize grading_key during active attempts.',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 32,
        maxPoints: 35,
        updatedAt: '2026-11-10T05:47:00.000Z',
      },
    },
    updatedAt: '2026-11-10T05:48:10.000Z',
  },
  {
    id: 'sub-liam-midterm',
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    courseCode: 'CS-401',
    studentId: 'student-liam',
    studentName: "Liam O'Connor",
    studentEmail: 'liam.oconnor@university.edu',
    status: 'AUTO_SUBMITTED_VIOLATION',
    startedAt: '2026-11-10T05:30:00.000Z',
    expiresAt: '2026-11-10T06:15:00.000Z',
    submittedAt: '2026-11-10T05:52:19.000Z',
    strikeCount: 3,
    maxStrikes: 3,
    integrityScore: 68,
    totalScore: 48,
    maxPossibleScore: 100,
    percentageScore: 48,
    cohortZScore: -1.25,
    teacherSummaryFeedback:
      'Auto-submitted by proctoring engine after 3 confirmed violations (2 tab switches, 1 fullscreen exit).',
    answers: {
      'q-dist-1': {
        questionId: 'q-dist-1',
        selectedOptionId: 'opt-a',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 20,
        maxPoints: 20,
        updatedAt: '2026-11-10T05:36:00.000Z',
      },
      'q-acid-2': {
        questionId: 'q-acid-2',
        selectedOptionId: 'opt-1',
        isAutoGraded: true,
        isCorrect: false,
        pointsAwarded: 0,
        maxPoints: 20,
        updatedAt: '2026-11-10T05:42:00.000Z',
      },
      'q-dp-3': {
        questionId: 'q-dp-3',
        textResponse: 'O(2^n)',
        isAutoGraded: true,
        isCorrect: false,
        pointsAwarded: 5,
        maxPoints: 25,
        updatedAt: '2026-11-10T05:48:00.000Z',
      },
      'q-sec-4': {
        questionId: 'q-sec-4',
        textResponse: 'Server validation is important so users do not tamper with requests or bypass timers.',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 23,
        maxPoints: 35,
        updatedAt: '2026-11-10T05:51:00.000Z',
      },
    },
    updatedAt: '2026-11-10T05:52:19.000Z',
  },
  {
    id: 'sub-priya-midterm',
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    courseCode: 'CS-401',
    studentId: 'student-priya',
    studentName: 'Priya Patel',
    studentEmail: 'priya.patel@university.edu',
    status: 'GRADED',
    startedAt: '2026-11-10T05:15:00.000Z',
    expiresAt: '2026-11-10T06:00:00.000Z',
    submittedAt: '2026-11-10T05:54:00.000Z',
    strikeCount: 1,
    maxStrikes: 3,
    integrityScore: 90,
    totalScore: 76,
    maxPossibleScore: 100,
    percentageScore: 76,
    cohortZScore: 0.18,
    teacherSummaryFeedback: 'Strong systems architecture and security answers; review DP memoization bounds.',
    answers: {
      'q-dist-1': {
        questionId: 'q-dist-1',
        selectedOptionId: 'opt-a',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 20,
        maxPoints: 20,
        updatedAt: '2026-11-10T05:22:00.000Z',
      },
      'q-acid-2': {
        questionId: 'q-acid-2',
        selectedOptionId: 'opt-2',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 20,
        maxPoints: 20,
        updatedAt: '2026-11-10T05:30:00.000Z',
      },
      'q-dp-3': {
        questionId: 'q-dp-3',
        textResponse: 'O(n log n)',
        isAutoGraded: true,
        isCorrect: false,
        pointsAwarded: 6,
        maxPoints: 25,
        updatedAt: '2026-11-10T05:40:00.000Z',
      },
      'q-sec-4': {
        questionId: 'q-sec-4',
        textResponse:
          'Browser DevTools can override event listeners, so server APIs must verify expires_at, lock submission status on 3 strikes, and strip grading_key.',
        isAutoGraded: true,
        isCorrect: true,
        pointsAwarded: 30,
        maxPoints: 35,
        updatedAt: '2026-11-10T05:53:00.000Z',
      },
    },
    updatedAt: '2026-11-10T05:54:00.000Z',
  },
];

const INITIAL_LOGS: ProctoringLog[] = [
  {
    id: 'log-liam-1',
    submissionId: 'sub-liam-midterm',
    studentId: 'student-liam',
    studentName: "Liam O'Connor",
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    violationType: 'TAB_SWITCH',
    strikeDelta: 1,
    strikeCountAfter: 1,
    clientTimestamp: '2026-11-10T05:39:12.000Z',
    serverTimestamp: '2026-11-10T05:39:12.120Z',
    description: 'Navigated away from the active exam browser tab (visibilityState: hidden).',
    metadata: { activeQuestionId: 'q-acid-2', visibilityState: 'hidden', isFullscreen: true },
  },
  {
    id: 'log-liam-2',
    submissionId: 'sub-liam-midterm',
    studentId: 'student-liam',
    studentName: "Liam O'Connor",
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    violationType: 'CLIPBOARD_PASTE',
    strikeDelta: 0,
    strikeCountAfter: 1,
    clientTimestamp: '2026-11-10T05:44:03.000Z',
    serverTimestamp: '2026-11-10T05:44:03.050Z',
    description: 'Clipboard PASTE action was intercepted and blocked.',
    metadata: { activeQuestionId: 'q-dp-3', visibilityState: 'visible', isFullscreen: true },
  },
  {
    id: 'log-liam-3',
    submissionId: 'sub-liam-midterm',
    studentId: 'student-liam',
    studentName: "Liam O'Connor",
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    violationType: 'FULLSCREEN_EXIT',
    strikeDelta: 1,
    strikeCountAfter: 2,
    clientTimestamp: '2026-11-10T05:47:50.000Z',
    serverTimestamp: '2026-11-10T05:47:50.090Z',
    description: 'Exited mandatory full-screen lock during active assessment.',
    metadata: { activeQuestionId: 'q-dp-3', visibilityState: 'visible', isFullscreen: false },
  },
  {
    id: 'log-liam-4',
    submissionId: 'sub-liam-midterm',
    studentId: 'student-liam',
    studentName: "Liam O'Connor",
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    violationType: 'WINDOW_BLUR',
    strikeDelta: 1,
    strikeCountAfter: 3,
    clientTimestamp: '2026-11-10T05:52:19.000Z',
    serverTimestamp: '2026-11-10T05:52:19.040Z',
    description: 'Exam browser window lost focus (3/3 strikes reached — Exam Auto-Submitted).',
    metadata: { activeQuestionId: 'q-sec-4', visibilityState: 'visible', isFullscreen: false },
  },
  {
    id: 'log-priya-1',
    submissionId: 'sub-priya-midterm',
    studentId: 'student-priya',
    studentName: 'Priya Patel',
    examId: 'exam-distributed-2026',
    examTitle: 'Midterm Assessment: Distributed Systems, Serverless DBs & Security',
    violationType: 'FULLSCREEN_EXIT',
    strikeDelta: 1,
    strikeCountAfter: 1,
    clientTimestamp: '2026-11-10T05:41:10.000Z',
    serverTimestamp: '2026-11-10T05:41:10.080Z',
    description: 'Exited mandatory full-screen lock during active assessment.',
    metadata: { activeQuestionId: 'q-dp-3', visibilityState: 'visible', isFullscreen: false },
  },
];

interface StoreState {
  users: User[];
  topics: Topic[];
  exams: Exam[];
  submissions: ExamSubmission[];
  proctoringLogs: ProctoringLog[];
  lastStrikeTimestampBySubmission: Record<string, number>;
}

const globalForStore = globalThis as unknown as { __EXAMSYS_STORE__?: StoreState };

function getStore(): StoreState {
  if (!globalForStore.__EXAMSYS_STORE__) {
    globalForStore.__EXAMSYS_STORE__ = {
      users: structuredClone(INITIAL_USERS),
      topics: structuredClone(INITIAL_TOPICS),
      exams: structuredClone(INITIAL_EXAMS),
      submissions: structuredClone(INITIAL_SUBMISSIONS),
      proctoringLogs: structuredClone(INITIAL_LOGS),
      lastStrikeTimestampBySubmission: {},
    };
  }
  return globalForStore.__EXAMSYS_STORE__;
}

/**
 * Strips gradingKey and explanation so answer keys never leak to the browser during an active exam.
 */
export function sanitizeQuestionForStudent(q: Question): SafeStudentQuestion {
  return {
    id: q.id,
    examId: q.examId,
    topicId: q.topicId,
    topicName: q.topicName,
    topicCode: q.topicCode,
    type: q.type,
    difficulty: q.difficulty,
    displayOrder: q.displayOrder,
    prompt: q.prompt,
    points: q.points,
    options: q.options,
  };
}

/**
 * Auto-grades MCQ, Short Answer, and Essay questions using the server-side grading_key.
 */
export function evaluateAnswer(
  question: Question,
  payload: { selectedOptionId?: string; textResponse?: string }
): SubmissionAnswer {
  const now = new Date().toISOString();

  if (question.type === 'MCQ') {
    const isCorrect =
      Boolean(payload.selectedOptionId) &&
      payload.selectedOptionId === question.gradingKey.correctOptionId;
    return {
      questionId: question.id,
      selectedOptionId: payload.selectedOptionId,
      isAutoGraded: true,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
      maxPoints: question.points,
      teacherFeedback: isCorrect
        ? 'Correct option selected.'
        : `Incorrect. ${question.explanation}`,
      updatedAt: now,
    };
  }

  if (question.type === 'SHORT_ANSWER') {
    const raw = (payload.textResponse || '').trim().toLowerCase();
    const accepted = (question.gradingKey.acceptedAnswers || []).map((a) => a.toLowerCase());
    const keywords = (question.gradingKey.keywords || []).map((k) => k.toLowerCase());

    const exactMatch = accepted.includes(raw);
    const keywordMatch =
      !exactMatch && raw.length > 0 && keywords.some((kw) => raw.includes(kw));

    const pointsAwarded = exactMatch
      ? question.points
      : keywordMatch
      ? Math.round(question.points * 0.75)
      : 0;

    return {
      questionId: question.id,
      textResponse: payload.textResponse || '',
      isAutoGraded: true,
      isCorrect: exactMatch || keywordMatch,
      pointsAwarded,
      maxPoints: question.points,
      teacherFeedback: exactMatch
        ? 'Exact match with accepted canonical answer.'
        : keywordMatch
        ? `Partial credit awarded via keyword matcher. Canonical reference: ${question.explanation}`
        : `Did not match expected complexity/term. ${question.explanation}`,
      updatedAt: now,
    };
  }

  // ESSAY evaluation using rubric keywords + length heuristics
  const essayText = (payload.textResponse || '').trim();
  if (!essayText) {
    return {
      questionId: question.id,
      textResponse: '',
      isAutoGraded: true,
      isCorrect: false,
      pointsAwarded: 0,
      maxPoints: question.points,
      teacherFeedback: 'No essay response submitted.',
      updatedAt: now,
    };
  }

  const lower = essayText.toLowerCase();
  const keywords = question.gradingKey.keywords || [];
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
  const keywordRatio =
    keywords.length > 0 ? Math.min(1, matchedKeywords.length / Math.max(3, Math.ceil(keywords.length * 0.6))) : 0.8;
  const wordCount = essayText.split(/\s+/).filter(Boolean).length;
  const depthFactor = Math.min(1, wordCount / 25);

  const scoreRatio = Math.min(1, keywordRatio * 0.7 + depthFactor * 0.3);
  const pointsAwarded = Math.round(question.points * scoreRatio);

  return {
    questionId: question.id,
    textResponse: essayText,
    isAutoGraded: true,
    isCorrect: pointsAwarded >= question.points * 0.7,
    pointsAwarded,
    maxPoints: question.points,
    teacherFeedback: `Rubric evaluation matched ${matchedKeywords.length} key architectural concepts (${wordCount} words).`,
    updatedAt: now,
  };
}

export function getDashboardSnapshot(studentId = 'student-alex') {
  const store = getStore();
  const student = store.users.find((u) => u.id === studentId) || store.users[0];
  const teacher = store.users.find((u) => u.role === 'TEACHER')!;

  const studentSubmissions = store.submissions.filter((s) => s.studentId === student.id);

  // Calculate Topic Learning Gaps across the cohort and for this specific student
  const topicGaps: TopicGapMetric[] = store.topics.map((topic) => {
    let studentEarned = 0;
    let studentPossible = 0;
    let studentAttempts = 0;

    let cohortEarned = 0;
    let cohortPossible = 0;

    for (const exam of store.exams) {
      for (const q of exam.questions) {
        if (q.topicId !== topic.id) continue;

        for (const sub of store.submissions) {
          if (sub.examId !== exam.id || sub.status === 'IN_PROGRESS') continue;
          const ans = sub.answers[q.id];
          const earned = ans ? ans.pointsAwarded : 0;

          cohortEarned += earned;
          cohortPossible += q.points;

          if (sub.studentId === student.id) {
            studentEarned += earned;
            studentPossible += q.points;
            studentAttempts += 1;
          }
        }
      }
    }

    const cohortAvgPct =
      cohortPossible > 0 ? Math.round((cohortEarned / cohortPossible) * 100) : 78;
    const studentMasteryPct =
      studentPossible > 0
        ? Math.round((studentEarned / studentPossible) * 100)
        : Math.max(52, cohortAvgPct - 8);

    const deltaFromCohort = studentMasteryPct - cohortAvgPct;

    let competencyStatus: TopicGapMetric['competencyStatus'] = 'MASTERED';
    let recommendedAction = 'On track. Ready for advanced distributed systems synthesis problems.';

    if (studentMasteryPct < 60 || studentMasteryPct < topic.targetMasteryPct - 15) {
      competencyStatus = 'CRITICAL_GAP';
      recommendedAction = `Priority Remediation: Complete interactive practice set on ${topic.name} (${topic.code}) before the final exam.`;
    } else if (studentMasteryPct < topic.targetMasteryPct) {
      competencyStatus = 'DEVELOPING';
      recommendedAction = `Review edge cases and complexity proofs for ${topic.name} to reach the ${topic.targetMasteryPct}% target benchmark.`;
    }

    return {
      topicId: topic.id,
      topicCode: topic.code,
      topicName: topic.name,
      subject: topic.subject,
      studentMasteryPct,
      cohortAvgPct,
      targetMasteryPct: topic.targetMasteryPct,
      deltaFromCohort,
      questionsAttempted: studentAttempts,
      competencyStatus,
      recommendedAction,
    };
  });

  // Historical growth points for the student
  const growthTimeline: StudentGrowthPoint[] = studentSubmissions
    .filter((s) => s.status !== 'IN_PROGRESS')
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((sub) => {
      const cohortSubs = store.submissions.filter(
        (cs) => cs.examId === sub.examId && cs.status !== 'IN_PROGRESS'
      );
      const cohortAvg =
        cohortSubs.length > 0
          ? Math.round(
              cohortSubs.reduce((acc, item) => acc + item.percentageScore, 0) / cohortSubs.length
            )
          : 74;

      return {
        examId: sub.examId,
        examTitle: sub.examTitle,
        date: sub.submittedAt || sub.startedAt,
        studentPct: sub.percentageScore,
        cohortAvgPct: cohortAvg,
        zScore: sub.cohortZScore ?? Number(((sub.percentageScore - cohortAvg) / 12).toFixed(2)),
        integrityScore: sub.integrityScore,
      };
    });

  return {
    student,
    teacher,
    students: store.users.filter((u) => u.role === 'STUDENT'),
    topics: store.topics,
    exams: store.exams,
    submissions: store.submissions,
    studentSubmissions,
    proctoringLogs: store.proctoringLogs,
    topicGaps,
    growthTimeline,
  };
}

export function startOrResumeSubmission(examId: string, studentId = 'student-alex') {
  const store = getStore();
  const exam = store.exams.find((e) => e.id === examId);
  if (!exam) {
    throw new Error('Exam not found');
  }
  const student = store.users.find((u) => u.id === studentId) || store.users[0];

  let submission = store.submissions.find(
    (s) => s.examId === examId && s.studentId === student.id
  );

  if (!submission) {
    const now = new Date();
    const expires = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
    submission = {
      id: `sub-${student.id}-${Date.now()}`,
      examId: exam.id,
      examTitle: exam.title,
      courseCode: exam.courseCode,
      studentId: student.id,
      studentName: student.fullName,
      studentEmail: student.email,
      status: 'IN_PROGRESS',
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      strikeCount: 0,
      maxStrikes: exam.maxStrikes,
      integrityScore: 100,
      totalScore: 0,
      maxPossibleScore: exam.totalPoints,
      percentageScore: 0,
      answers: {},
      updatedAt: now.toISOString(),
    };
    store.submissions.unshift(submission);
  }

  return {
    submission,
    exam: {
      ...exam,
      // Omit gradingKey when sending to active exam runner
      questions: exam.questions.map(sanitizeQuestionForStudent),
    },
  };
}

export function resetStudentExamAttempt(examId: string, studentId = 'student-alex') {
  const store = getStore();
  store.submissions = store.submissions.filter(
    (s) => !(s.examId === examId && s.studentId === studentId)
  );
  store.proctoringLogs = store.proctoringLogs.filter(
    (l) => !(l.examId === examId && l.studentId === studentId)
  );
  return startOrResumeSubmission(examId, studentId);
}

export function saveStudentAnswers(
  examId: string,
  submissionId: string,
  answersInput: Record<string, { selectedOptionId?: string; textResponse?: string }>
) {
  const store = getStore();
  const submission = store.submissions.find(
    (s) => s.id === submissionId && s.examId === examId
  );
  if (!submission) {
    throw new Error('Submission not found');
  }
  if (submission.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot modify answers: submission is already ${submission.status}`);
  }

  const exam = store.exams.find((e) => e.id === examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  const now = new Date().toISOString();
  for (const question of exam.questions) {
    const incoming = answersInput[question.id];
    if (incoming !== undefined) {
      submission.answers[question.id] = {
        questionId: question.id,
        selectedOptionId: incoming.selectedOptionId,
        textResponse: incoming.textResponse,
        isAutoGraded: false,
        pointsAwarded: 0,
        maxPoints: question.points,
        updatedAt: now,
      };
    }
  }

  submission.updatedAt = now;
  return submission;
}

export function finalizeSubmission(
  examId: string,
  submissionId: string,
  finalStatus: SubmissionStatus = 'GRADED',
  answersInput?: Record<string, { selectedOptionId?: string; textResponse?: string }>
) {
  const store = getStore();
  const submission = store.submissions.find(
    (s) => s.id === submissionId && s.examId === examId
  );
  if (!submission) {
    throw new Error('Submission not found');
  }
  const exam = store.exams.find((e) => e.id === examId);
  if (!exam) {
    throw new Error('Exam not found');
  }

  if (answersInput && submission.status === 'IN_PROGRESS') {
    saveStudentAnswers(examId, submissionId, answersInput);
  }

  let earnedTotal = 0;
  let possibleTotal = 0;

  for (const question of exam.questions) {
    possibleTotal += question.points;
    const existing = submission.answers[question.id] || {};
    const graded = evaluateAnswer(question, {
      selectedOptionId: existing.selectedOptionId,
      textResponse: existing.textResponse,
    });
    submission.answers[question.id] = graded;
    earnedTotal += graded.pointsAwarded;
  }

  const now = new Date().toISOString();
  submission.totalScore = earnedTotal;
  submission.maxPossibleScore = possibleTotal || exam.totalPoints;
  submission.percentageScore =
    possibleTotal > 0 ? Math.round((earnedTotal / possibleTotal) * 100) : 0;
  submission.status = finalStatus;
  submission.submittedAt = now;
  submission.updatedAt = now;

  if (finalStatus === 'AUTO_SUBMITTED_VIOLATION') {
    submission.teacherSummaryFeedback = `Auto-submitted by Proctoring Guard after reaching ${submission.strikeCount}/${submission.maxStrikes} strikes. Answers saved prior to lockdown were auto-graded.`;
  } else if (finalStatus === 'AUTO_SUBMITTED_TIMEOUT') {
    submission.teacherSummaryFeedback =
      'Auto-submitted when the server-authoritative exam timer expired.';
  } else {
    submission.teacherSummaryFeedback =
      submission.percentageScore >= 85
        ? 'Excellent command of distributed systems, ACID concurrency locks, and security architecture.'
        : submission.percentageScore >= 70
        ? 'Solid performance overall. Review question-level rubric notes for optimization details.'
        : 'Foundational concepts need reinforcement. Consult the Learning Gaps tab for targeted remediation.';
  }

  return {
    submission,
    examWithKeys: exam,
  };
}

export function recordProctoringViolation(params: {
  examId: string;
  submissionId: string;
  violationType: ViolationType;
  countsTowardStrike: boolean;
  description: string;
  clientTimestamp: string;
  metadata: Record<string, unknown>;
}) {
  const store = getStore();
  const submission = store.submissions.find(
    (s) => s.id === params.submissionId && s.examId === params.examId
  );
  if (!submission) {
    throw new Error('Submission not found');
  }

  if (submission.status !== 'IN_PROGRESS') {
    return {
      strikeCount: submission.strikeCount,
      maxStrikes: submission.maxStrikes,
      autoSubmitted: true,
      status: submission.status,
      submission,
    };
  }

  const nowMs = Date.now();
  const lastStrikeMs = store.lastStrikeTimestampBySubmission[submission.id] || 0;
  const cooldownMs = 1400;

  let strikeDelta = params.countsTowardStrike ? 1 : 0;
  if (strikeDelta > 0 && nowMs - lastStrikeMs < cooldownMs) {
    strikeDelta = 0; // Server-side deduplication window
  }
  if (strikeDelta > 0) {
    store.lastStrikeTimestampBySubmission[submission.id] = nowMs;
  }

  submission.strikeCount += strikeDelta;
  const penalty = strikeDelta > 0 ? 10 : 1;
  submission.integrityScore = Math.max(0, submission.integrityScore - penalty);

  const logEntry: ProctoringLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    submissionId: submission.id,
    studentId: submission.studentId,
    studentName: submission.studentName,
    examId: submission.examId,
    examTitle: submission.examTitle,
    violationType: params.violationType,
    strikeDelta,
    strikeCountAfter: submission.strikeCount,
    clientTimestamp: params.clientTimestamp || new Date(nowMs).toISOString(),
    serverTimestamp: new Date(nowMs).toISOString(),
    description: params.description,
    metadata: params.metadata || {},
  };

  store.proctoringLogs.unshift(logEntry);

  const exceededStrikes = submission.strikeCount >= submission.maxStrikes;
  if (exceededStrikes) {
    finalizeSubmission(
      submission.examId,
      submission.id,
      'AUTO_SUBMITTED_VIOLATION'
    );
  }

  return {
    strikeCount: submission.strikeCount,
    maxStrikes: submission.maxStrikes,
    autoSubmitted: exceededStrikes,
    status: submission.status,
    submission,
    logEntry,
  };
}

export function forgiveSubmissionStrike(submissionId: string) {
  const store = getStore();
  const submission = store.submissions.find((s) => s.id === submissionId);
  if (!submission) {
    throw new Error('Submission not found');
  }

  if (submission.strikeCount > 0) {
    submission.strikeCount -= 1;
    submission.integrityScore = Math.min(100, submission.integrityScore + 10);
  }

  if (
    submission.status === 'AUTO_SUBMITTED_VIOLATION' &&
    submission.strikeCount < submission.maxStrikes
  ) {
    submission.status = 'IN_PROGRESS';
    submission.submittedAt = undefined;
    // Extend timer by 15 minutes when teacher unlocks an auto-submitted exam
    submission.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }

  submission.updatedAt = new Date().toISOString();
  return submission;
}

export function createNewExam(input: {
  title: string;
  courseCode: string;
  description: string;
  durationMinutes: number;
  maxStrikes: number;
  enforceFullscreen: boolean;
  blockClipboard: boolean;
  shuffleQuestions: boolean;
  questions: Array<{
    topicId: string;
    type: Question['type'];
    difficulty: Question['difficulty'];
    prompt: string;
    points: number;
    options?: Array<{ id: string; text: string }>;
    correctOptionId?: string;
    acceptedAnswers?: string[];
    keywords?: string[];
    explanation: string;
  }>;
}) {
  const store = getStore();
  const examId = `exam-${Date.now()}`;
  const now = new Date();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const formattedQuestions: Question[] = input.questions.map((q, idx) => {
    const topic = store.topics.find((t) => t.id === q.topicId) || store.topics[0];
    return {
      id: `q-${examId}-${idx + 1}`,
      examId,
      topicId: topic.id,
      topicName: topic.name,
      topicCode: topic.code,
      type: q.type,
      difficulty: q.difficulty,
      displayOrder: idx + 1,
      prompt: q.prompt,
      points: Number(q.points) || 10,
      options: q.options,
      gradingKey: {
        correctOptionId: q.correctOptionId,
        acceptedAnswers: q.acceptedAnswers,
        keywords: q.keywords,
      },
      explanation: q.explanation || 'Evaluated against curriculum topic rubric.',
    };
  });

  const totalPoints = formattedQuestions.reduce((sum, q) => sum + q.points, 0);

  const newExam: Exam = {
    id: examId,
    teacherId: 'teacher-rostova',
    cohortId: COHORT_ID,
    courseCode: input.courseCode || 'CS-401',
    title: input.title,
    description: input.description,
    status: 'PUBLISHED',
    durationMinutes: Number(input.durationMinutes) || 45,
    availableFrom: now.toISOString(),
    availableUntil: until.toISOString(),
    totalPoints,
    maxStrikes: Number(input.maxStrikes) || 3,
    enforceFullscreen: Boolean(input.enforceFullscreen),
    blockClipboard: Boolean(input.blockClipboard),
    shuffleQuestions: Boolean(input.shuffleQuestions),
    questions: formattedQuestions,
    createdAt: now.toISOString(),
  };

  store.exams.unshift(newExam);
  return newExam;
}
