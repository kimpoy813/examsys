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

const DEFAULT_COHORT_ID = 'cohort-default';

interface StoreState {
  users: User[];
  topics: Topic[];
  exams: Exam[];
  submissions: ExamSubmission[];
  proctoringLogs: ProctoringLog[];
  lastStrikeTimestampBySubmission: Record<string, number>;
}

const globalForStore = globalThis as unknown as { __EXAMSYS_CLEAN_STORE__?: StoreState };

function getStore(): StoreState {
  if (!globalForStore.__EXAMSYS_CLEAN_STORE__) {
    globalForStore.__EXAMSYS_CLEAN_STORE__ = {
      users: [],
      topics: [],
      exams: [],
      submissions: [],
      proctoringLogs: [],
      lastStrikeTimestampBySubmission: {},
    };
  }
  return globalForStore.__EXAMSYS_CLEAN_STORE__;
}

export function ensureStudentUser(studentName?: string, studentEmail?: string): User {
  const store = getStore();
  const cleanName = (studentName || 'Student').trim() || 'Student';
  const cleanEmail =
    (studentEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.edu`).trim();

  let user = store.users.find(
    (u) => u.role === 'STUDENT' && u.email.toLowerCase() === cleanEmail.toLowerCase()
  );

  if (!user) {
    const initials = cleanName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    user = {
      id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      fullName: cleanName,
      role: 'STUDENT',
      cohortId: DEFAULT_COHORT_ID,
      avatarInitials: initials || 'ST',
    };
    store.users.push(user);
  } else if (cleanName && user.fullName !== cleanName) {
    user.fullName = cleanName;
  }

  return user;
}

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
        ? 'Correct'
        : question.explanation
        ? `Incorrect. ${question.explanation}`
        : 'Incorrect option selected.',
      updatedAt: now,
    };
  }

  if (question.type === 'SHORT_ANSWER') {
    const raw = (payload.textResponse || '').trim().toLowerCase();
    const accepted = (question.gradingKey.acceptedAnswers || [])
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    const keywords = (question.gradingKey.keywords || [])
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (!raw) {
      return {
        questionId: question.id,
        textResponse: '',
        isAutoGraded: true,
        isCorrect: false,
        pointsAwarded: 0,
        maxPoints: question.points,
        teacherFeedback: 'No answer provided.',
        updatedAt: now,
      };
    }

    const exactMatch = accepted.length > 0 && accepted.includes(raw);
    const keywordMatch =
      !exactMatch && keywords.length > 0 && keywords.some((kw) => raw.includes(kw));
    const openEndedFallback = accepted.length === 0 && keywords.length === 0 && raw.length > 0;

    const pointsAwarded =
      exactMatch || openEndedFallback
        ? question.points
        : keywordMatch
        ? Math.round(question.points * 0.75)
        : 0;

    return {
      questionId: question.id,
      textResponse: payload.textResponse || '',
      isAutoGraded: true,
      isCorrect: pointsAwarded > 0,
      pointsAwarded,
      maxPoints: question.points,
      teacherFeedback:
        exactMatch || openEndedFallback
          ? 'Accepted.'
          : keywordMatch
          ? 'Partial credit awarded based on key terms.'
          : question.explanation || 'Does not match expected answer.',
      updatedAt: now,
    };
  }

  // ESSAY evaluation
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
  const keywords = (question.gradingKey.keywords || [])
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) {
    const wordCount = essayText.split(/\s+/).filter(Boolean).length;
    const ratio = Math.min(1, Math.max(0.5, wordCount / 20));
    const pointsAwarded = Math.round(question.points * ratio);
    return {
      questionId: question.id,
      textResponse: essayText,
      isAutoGraded: true,
      isCorrect: true,
      pointsAwarded,
      maxPoints: question.points,
      teacherFeedback: `Response recorded (${wordCount} words).`,
      updatedAt: now,
    };
  }

  const matched = keywords.filter((kw) => lower.includes(kw));
  const keywordRatio = Math.min(1, matched.length / keywords.length);
  const wordCount = essayText.split(/\s+/).filter(Boolean).length;
  const lengthRatio = Math.min(1, wordCount / 20);
  const pointsAwarded = Math.round(question.points * (keywordRatio * 0.75 + lengthRatio * 0.25));

  return {
    questionId: question.id,
    textResponse: essayText,
    isAutoGraded: true,
    isCorrect: pointsAwarded >= question.points * 0.6,
    pointsAwarded,
    maxPoints: question.points,
    teacherFeedback: `Matched ${matched.length} of ${keywords.length} rubric criteria (${wordCount} words).`,
    updatedAt: now,
  };
}

export function getDashboardSnapshot(studentName?: string, studentEmail?: string) {
  const store = getStore();
  const currentStudent = studentName
    ? ensureStudentUser(studentName, studentEmail)
    : store.users.find((u) => u.role === 'STUDENT') || null;

  const studentSubmissions = currentStudent
    ? store.submissions.filter((s) => s.studentId === currentStudent.id)
    : [];

  // Calculate Topic Learning Gaps only from real completed submissions
  const completedSubmissions = store.submissions.filter((s) => s.status !== 'IN_PROGRESS');

  const topicGaps: TopicGapMetric[] = store.topics
    .map((topic) => {
      let studentEarned = 0;
      let studentPossible = 0;
      let studentAttempts = 0;

      let cohortEarned = 0;
      let cohortPossible = 0;

      for (const exam of store.exams) {
        for (const q of exam.questions) {
          if (q.topicId !== topic.id) continue;

          for (const sub of completedSubmissions) {
            if (sub.examId !== exam.id) continue;
            const ans = sub.answers[q.id];
            const earned = ans ? ans.pointsAwarded : 0;

            cohortEarned += earned;
            cohortPossible += q.points;

            if (currentStudent && sub.studentId === currentStudent.id) {
              studentEarned += earned;
              studentPossible += q.points;
              studentAttempts += 1;
            }
          }
        }
      }

      if (cohortPossible === 0 && studentPossible === 0) {
        return null;
      }

      const cohortAvgPct =
        cohortPossible > 0 ? Math.round((cohortEarned / cohortPossible) * 100) : 0;
      const studentMasteryPct =
        studentPossible > 0 ? Math.round((studentEarned / studentPossible) * 100) : cohortAvgPct;
      const deltaFromCohort = studentMasteryPct - cohortAvgPct;

      let competencyStatus: TopicGapMetric['competencyStatus'] = 'MASTERED';
      let recommendedAction = 'Meets mastery target.';

      if (studentMasteryPct < 60) {
        competencyStatus = 'CRITICAL_GAP';
        recommendedAction = `Needs review on ${topic.name}.`;
      } else if (studentMasteryPct < topic.targetMasteryPct) {
        competencyStatus = 'DEVELOPING';
        recommendedAction = `Approaching ${topic.targetMasteryPct}% target benchmark.`;
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
    })
    .filter((item): item is TopicGapMetric => item !== null);

  const growthTimeline: StudentGrowthPoint[] = studentSubmissions
    .filter((s) => s.status !== 'IN_PROGRESS')
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((sub) => {
      const cohortSubs = completedSubmissions.filter((cs) => cs.examId === sub.examId);
      const cohortAvg =
        cohortSubs.length > 0
          ? Math.round(
              cohortSubs.reduce((acc, item) => acc + item.percentageScore, 0) / cohortSubs.length
            )
          : sub.percentageScore;

      return {
        examId: sub.examId,
        examTitle: sub.examTitle,
        date: sub.submittedAt || sub.startedAt,
        studentPct: sub.percentageScore,
        cohortAvgPct: cohortAvg,
        zScore: Number(((sub.percentageScore - cohortAvg) / 10).toFixed(2)),
        integrityScore: sub.integrityScore,
      };
    });

  return {
    student: currentStudent,
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

export function startOrResumeSubmission(
  examId: string,
  studentName?: string,
  studentEmail?: string
) {
  const store = getStore();
  const exam = store.exams.find((e) => e.id === examId);
  if (!exam) {
    throw new Error('Exam not found');
  }
  const student = ensureStudentUser(studentName, studentEmail);

  let submission = store.submissions.find(
    (s) => s.examId === examId && s.studentId === student.id
  );

  if (!submission) {
    const now = new Date();
    const expires = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
    submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      questions: exam.questions.map(sanitizeQuestionForStudent),
    },
  };
}

export function resetStudentExamAttempt(
  examId: string,
  studentName?: string,
  studentEmail?: string
) {
  const store = getStore();
  const student = ensureStudentUser(studentName, studentEmail);
  store.submissions = store.submissions.filter(
    (s) => !(s.examId === examId && s.studentId === student.id)
  );
  store.proctoringLogs = store.proctoringLogs.filter(
    (l) => !(l.examId === examId && l.studentId === student.id)
  );
  return startOrResumeSubmission(examId, student.fullName, student.email);
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
    throw new Error(`Submission is already ${submission.status}`);
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
    submission.teacherSummaryFeedback = `Auto-submitted after reaching maximum proctoring strikes (${submission.strikeCount}/${submission.maxStrikes}).`;
  } else if (finalStatus === 'AUTO_SUBMITTED_TIMEOUT') {
    submission.teacherSummaryFeedback = 'Auto-submitted when the exam time limit expired.';
  } else {
    submission.teacherSummaryFeedback = 'Submitted and graded.';
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
    strikeDelta = 0;
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
    finalizeSubmission(submission.examId, submission.id, 'AUTO_SUBMITTED_VIOLATION');
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
    submission.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }

  submission.updatedAt = new Date().toISOString();
  return submission;
}

export function deleteExamById(examId: string) {
  const store = getStore();
  store.exams = store.exams.filter((e) => e.id !== examId);
  store.submissions = store.submissions.filter((s) => s.examId !== examId);
  store.proctoringLogs = store.proctoringLogs.filter((l) => l.examId !== examId);
}

export function createNewExam(input: {
  title: string;
  courseCode?: string;
  description?: string;
  durationMinutes: number;
  maxStrikes: number;
  enforceFullscreen: boolean;
  blockClipboard: boolean;
  shuffleQuestions?: boolean;
  questions: Array<{
    topicName?: string;
    type: Question['type'];
    difficulty?: Question['difficulty'];
    prompt: string;
    points: number;
    options?: Array<{ id: string; text: string }>;
    correctOptionId?: string;
    acceptedAnswers?: string[];
    keywords?: string[];
    explanation?: string;
  }>;
}) {
  const store = getStore();
  const examId = `exam-${Date.now()}`;
  const now = new Date();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const formattedQuestions: Question[] = input.questions.map((q, idx) => {
    const cleanTopicName = (q.topicName || 'General').trim() || 'General';
    let topic = store.topics.find(
      (t) => t.name.toLowerCase() === cleanTopicName.toLowerCase()
    );

    if (!topic) {
      const codePrefix = cleanTopicName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6);
      topic = {
        id: `topic-${Date.now()}-${idx}`,
        subject: input.courseCode || 'General',
        name: cleanTopicName,
        code: `${codePrefix || 'TOP'}-${store.topics.length + 1}`,
        targetMasteryPct: 75,
      };
      store.topics.push(topic);
    }

    return {
      id: `q-${examId}-${idx + 1}`,
      examId,
      topicId: topic.id,
      topicName: topic.name,
      topicCode: topic.code,
      type: q.type,
      difficulty: q.difficulty || 'INTERMEDIATE',
      displayOrder: idx + 1,
      prompt: q.prompt,
      points: Number(q.points) || 10,
      options: q.options,
      gradingKey: {
        correctOptionId: q.correctOptionId,
        acceptedAnswers: q.acceptedAnswers,
        keywords: q.keywords,
      },
      explanation: q.explanation || '',
    };
  });

  const totalPoints = formattedQuestions.reduce((sum, q) => sum + q.points, 0);

  const newExam: Exam = {
    id: examId,
    teacherId: 'teacher-default',
    cohortId: DEFAULT_COHORT_ID,
    courseCode: (input.courseCode || 'EXAM').trim(),
    title: input.title.trim(),
    description: (input.description || '').trim(),
    status: 'PUBLISHED',
    durationMinutes: Number(input.durationMinutes) || 30,
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
