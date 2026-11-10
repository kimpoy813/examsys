'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { ExamRunnerModal } from '@/components/ExamRunnerModal';
import { ExamCreationWizard } from '@/components/ExamCreationWizard';
import {
  Exam,
  ExamSubmission,
  ProctoringLog,
  StudentGrowthPoint,
  Topic,
  TopicGapMetric,
  User,
} from '@/types/exam';

interface DashboardData {
  student: User | null;
  students: User[];
  topics: Topic[];
  exams: Exam[];
  submissions: ExamSubmission[];
  studentSubmissions: ExamSubmission[];
  proctoringLogs: ProctoringLog[];
  topicGaps: TopicGapMetric[];
  growthTimeline: StudentGrowthPoint[];
}

export default function ExamSysApp() {
  const [roleView, setRoleView] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [teacherTab, setTeacherTab] = useState<'EXAMS' | 'PROCTORING' | 'ANALYTICS' | 'CREATE'>(
    'EXAMS'
  );
  const [studentName, setStudentName] = useState<string>('Student');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [forgivingId, setForgivingId] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (name = studentName) => {
      try {
        const res = await fetch(
          `/api/dashboard?studentName=${encodeURIComponent(name.trim() || 'Student')}`
        );
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    },
    [studentName]
  );

  useEffect(() => {
    fetchDashboard(studentName);
  }, [fetchDashboard, studentName]);

  const handleForgiveStrike = async (submissionId: string) => {
    setForgivingId(submissionId);
    try {
      await fetch('/api/proctor/forgive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      await fetchDashboard(studentName);
    } finally {
      setForgivingId(null);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    await fetch(`/api/dashboard?examId=${encodeURIComponent(examId)}`, {
      method: 'DELETE',
    });
    await fetchDashboard(studentName);
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500 text-xs">
        Loading...
      </div>
    );
  }

  const publishedExams = data.exams.filter((e) => e.status === 'PUBLISHED');
  const completedSubmissions = data.submissions.filter((s) => s.status !== 'IN_PROGRESS');
  const studentCompleted = data.studentSubmissions.filter((s) => s.status !== 'IN_PROGRESS');

  const classAverage =
    completedSubmissions.length > 0
      ? Math.round(
          completedSubmissions.reduce((acc, s) => acc + s.percentageScore, 0) /
            completedSubmissions.length
        )
      : null;

  const studentAverage =
    studentCompleted.length > 0
      ? Math.round(
          studentCompleted.reduce((acc, s) => acc + s.percentageScore, 0) /
            studentCompleted.length
        )
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Minimal Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white text-xs font-bold">
              E
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">ExamSys</span>
          </div>

          <div className="flex items-center gap-3">
            {roleView === 'STUDENT' && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Your Name"
                  aria-label="Student Name"
                  className="w-28 bg-transparent text-xs text-zinc-800 focus:outline-none"
                />
              </div>
            )}

            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5">
              <button
                type="button"
                onClick={() => setRoleView('STUDENT')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  roleView === 'STUDENT'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRoleView('TEACHER')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  roleView === 'TEACHER'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Teacher
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* ===================================================================
            STUDENT VIEW
        =================================================================== */}
        {roleView === 'STUDENT' && (
          <div className="space-y-8">
            {/* Minimal Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6">
              <div>
                <h1 className="text-xl font-semibold text-zinc-900">Student Dashboard</h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  View available assessments, results, and topic progress.
                </p>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-[11px] text-zinc-400">Available</div>
                  <div className="text-base font-semibold text-zinc-900">
                    {publishedExams.length}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">Completed</div>
                  <div className="text-base font-semibold text-zinc-900">
                    {studentCompleted.length}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">Average</div>
                  <div className="text-base font-semibold text-zinc-900">
                    {studentAverage !== null ? `${studentAverage}%` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Available Exams */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Assessments
              </h2>

              {publishedExams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-10 text-center space-y-3">
                  <FileText className="mx-auto h-6 w-6 text-zinc-300" />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">No exams available yet</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Switch to the Teacher view to create and publish an exam.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleView('TEACHER');
                      setTeacherTab('CREATE');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create an Exam
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                  {publishedExams.map((exam) => {
                    const sub = data.studentSubmissions.find((s) => s.examId === exam.id);
                    const isDone = sub && sub.status !== 'IN_PROGRESS';

                    return (
                      <div
                        key={exam.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-400">
                              {exam.courseCode}
                            </span>
                            <h3 className="text-sm font-semibold text-zinc-900">{exam.title}</h3>
                          </div>
                          {exam.description && (
                            <p className="text-xs text-zinc-500">{exam.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {exam.durationMinutes}m
                            </span>
                            <span>{exam.questions.length} questions</span>
                            <span>{exam.totalPoints} pts</span>
                            <span className="inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" /> {exam.maxStrikes} strike limit
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isDone && (
                            <span className="rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-800">
                              {sub.percentageScore}%
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveExamId(exam.id)}
                            className={`rounded-lg px-4 py-2 text-xs font-medium transition cursor-pointer ${
                              isDone
                                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                : 'bg-zinc-900 text-white hover:bg-zinc-800'
                            }`}
                          >
                            {isDone ? 'View Result' : sub ? 'Resume' : 'Start Exam'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Student Progress & Topic Mastery (Shown when student has completed exams) */}
            {studentCompleted.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Past Results
                  </h2>
                  <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                    {studentCompleted.map((sub) => (
                      <div key={sub.id} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-zinc-900">{sub.examTitle}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {sub.status === 'AUTO_SUBMITTED_VIOLATION'
                              ? `Auto-submitted (${sub.strikeCount}/${sub.maxStrikes} strikes)`
                              : `Strikes: ${sub.strikeCount}/${sub.maxStrikes}`}
                          </div>
                        </div>
                        <div className="font-mono text-sm font-semibold text-zinc-900">
                          {sub.percentageScore}%
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Topic Mastery & Learning Gaps
                  </h2>
                  <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                    {data.topicGaps.map((gap) => (
                      <div key={gap.topicId} className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-900">{gap.topicName}</span>
                          <span className="font-mono text-zinc-600">{gap.studentMasteryPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              gap.competencyStatus === 'CRITICAL_GAP'
                                ? 'bg-red-500'
                                : gap.competencyStatus === 'DEVELOPING'
                                ? 'bg-amber-500'
                                : 'bg-zinc-900'
                            }`}
                            style={{ width: `${Math.min(100, gap.studentMasteryPct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TEACHER VIEW
        =================================================================== */}
        {roleView === 'TEACHER' && (
          <div className="space-y-6">
            {/* Teacher Header & Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
              <div className="flex items-center gap-1">
                {[
                  { id: 'EXAMS', label: `Exams (${data.exams.length})` },
                  { id: 'PROCTORING', label: `Submissions & Proctoring (${data.submissions.length})` },
                  { id: 'ANALYTICS', label: 'Analytics' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTeacherTab(tab.id as any)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                      teacherTab === tab.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {teacherTab !== 'CREATE' && (
                <button
                  type="button"
                  onClick={() => setTeacherTab('CREATE')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Exam
                </button>
              )}
            </div>

            {/* TAB: CREATE EXAM */}
            {teacherTab === 'CREATE' && (
              <ExamCreationWizard
                onExamCreated={() => {
                  fetchDashboard(studentName);
                  setTeacherTab('EXAMS');
                }}
                onCancel={() => setTeacherTab('EXAMS')}
              />
            )}

            {/* TAB: EXAMS LIST */}
            {teacherTab === 'EXAMS' && (
              <div>
                {data.exams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-12 text-center space-y-3">
                    <p className="text-sm font-medium text-zinc-800">No exams created</p>
                    <p className="text-xs text-zinc-400">
                      Create your first exam to begin assessing students.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTeacherTab('CREATE')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Exam
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                    {data.exams.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-400">
                              {exam.courseCode}
                            </span>
                            <h3 className="text-sm font-semibold text-zinc-900">{exam.title}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <span>{exam.durationMinutes} mins</span>
                            <span>•</span>
                            <span>{exam.questions.length} questions</span>
                            <span>•</span>
                            <span>{exam.totalPoints} pts</span>
                            <span>•</span>
                            <span>Max {exam.maxStrikes} strikes</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteExam(exam.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete exam"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUBMISSIONS & PROCTORING */}
            {teacherTab === 'PROCTORING' && (
              <div className="space-y-6">
                <section className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Student Submissions
                  </h2>
                  {data.submissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400">
                      No student submissions yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                      {data.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-wrap items-center justify-between gap-4 p-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900">
                                {sub.studentName}
                              </span>
                              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                                {sub.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">{sub.examTitle}</div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <span className="font-mono text-zinc-700">
                              Score: <strong>{sub.percentageScore}%</strong>
                            </span>
                            <span
                              className={`font-mono ${
                                sub.strikeCount > 0 ? 'text-red-600 font-semibold' : 'text-zinc-500'
                              }`}
                            >
                              Strikes: {sub.strikeCount}/{sub.maxStrikes}
                            </span>

                            {sub.strikeCount > 0 && (
                              <button
                                type="button"
                                disabled={forgivingId === sub.id}
                                onClick={() => handleForgiveStrike(sub.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {forgivingId === sub.id ? '...' : 'Forgive Strike'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Proctoring Violation Logs ({data.proctoringLogs.length})
                  </h2>
                  {data.proctoringLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400">
                      No proctoring violations recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                      {data.proctoringLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldAlert
                              className={`h-4 w-4 shrink-0 ${
                                log.strikeDelta > 0 ? 'text-red-600' : 'text-zinc-400'
                              }`}
                            />
                            <div>
                              <span className="font-semibold text-zinc-900">
                                {log.studentName}
                              </span>{' '}
                              <span className="text-zinc-500">— {log.description}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                            <span>{log.violationType}</span>
                            <span>•</span>
                            <span>{new Date(log.serverTimestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB: ANALYTICS */}
            {teacherTab === 'ANALYTICS' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="text-xs text-zinc-400">Class Average</div>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {classAverage !== null ? `${classAverage}%` : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="text-xs text-zinc-400">Completed Submissions</div>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {completedSubmissions.length}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="text-xs text-zinc-400">Total Violations Logged</div>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">
                      {data.proctoringLogs.length}
                    </div>
                  </div>
                </div>

                <section className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Topic Performance & Learning Gaps
                  </h2>
                  {data.topicGaps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400">
                      Topic analytics will appear once students complete an exam.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                      {data.topicGaps.map((topic) => (
                        <div key={topic.topicId} className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-900">{topic.topicName}</span>
                            <span className="font-mono text-zinc-600">
                              Class Avg: {topic.cohortAvgPct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-zinc-900"
                              style={{ width: `${Math.min(100, topic.cohortAvgPct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Active Exam Runner Modal */}
      {activeExamId && (
        <ExamRunnerModal
          examId={activeExamId}
          studentName={studentName}
          onClose={() => setActiveExamId(null)}
          onExamCompleted={() => fetchDashboard(studentName)}
        />
      )}
    </div>
  );
}
