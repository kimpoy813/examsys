'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  FilePlus2,
  GraduationCap,
  Layers,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
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
  student: User;
  teacher: User;
  students: User[];
  topics: Topic[];
  exams: Exam[];
  submissions: ExamSubmission[];
  studentSubmissions: ExamSubmission[];
  proctoringLogs: ProctoringLog[];
  topicGaps: TopicGapMetric[];
  growthTimeline: StudentGrowthPoint[];
  infrastructure: {
    runtime: string;
    databaseMode: string;
  };
}

export default function ExamSysApp() {
  const [roleView, setRoleView] = useState<'STUDENT' | 'TEACHER' | 'ARCHITECTURE'>('STUDENT');
  const [teacherTab, setTeacherTab] = useState<'PROCTORING' | 'ANALYTICS' | 'WIZARD'>('PROCTORING');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('student-alex');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [forgivingId, setForgivingId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (studentId = selectedStudentId) => {
    try {
      const res = await fetch(`/api/dashboard?studentId=${studentId}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    fetchDashboard(selectedStudentId);
  }, [selectedStudentId, fetchDashboard]);

  const handleForgiveStrike = async (submissionId: string) => {
    setForgivingId(submissionId);
    try {
      await fetch('/api/proctor/forgive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      await fetchDashboard(selectedStudentId);
    } finally {
      setForgivingId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <span className="text-sm font-medium text-slate-300">
            Loading ExamSys Assessment & Proctoring Suite...
          </span>
        </div>
      </div>
    );
  }

  const publishedExams = data.exams.filter((e) => e.status === 'PUBLISHED');
  const completedSubmissions = data.submissions.filter((s) => s.status !== 'IN_PROGRESS');
  const cohortMeanScore =
    completedSubmissions.length > 0
      ? Math.round(
          completedSubmissions.reduce((acc, s) => acc + s.percentageScore, 0) /
            completedSubmissions.length
        )
      : 0;
  const cohortMeanIntegrity =
    data.submissions.length > 0
      ? Math.round(
          data.submissions.reduce((acc, s) => acc + s.integrityScore, 0) / data.submissions.length
        )
      : 100;
  const violationAutoSubmits = data.submissions.filter(
    (s) => s.status === 'AUTO_SUBMITTED_VIOLATION'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Global Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">ExamSys</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                  Vercel + Neon Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">{data.infrastructure.databaseMode}</p>
            </div>
          </div>

          {/* Primary Role & Architecture Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setRoleView('STUDENT')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  roleView === 'STUDENT'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Student Dashboard
              </button>
              <button
                type="button"
                onClick={() => setRoleView('TEACHER')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  roleView === 'TEACHER'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="h-4 w-4" />
                Teacher & Proctoring Suite
              </button>
              <button
                type="button"
                onClick={() => setRoleView('ARCHITECTURE')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  roleView === 'ARCHITECTURE'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="h-4 w-4" />
                Neon Schema & Security Spec
              </button>
            </div>

            {roleView === 'STUDENT' && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                aria-label="Select Active Student Profile"
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {data.students.map((st) => (
                  <option key={st.id} value={st.id}>
                    Student: {st.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {/* ===================================================================
            VIEW 1: STUDENT DASHBOARD (DISTRACTION-FREE)
        =================================================================== */}
        {roleView === 'STUDENT' && (
          <div className="space-y-8">
            {/* Student Welcome & Quick Stats Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30 font-bold text-indigo-300">
                  {data.student.avatarInitials}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Distraction-Free Student Portal • Cohort CS-401
                  </span>
                  <h1 className="text-xl font-bold text-white">{data.student.fullName}</h1>
                  <p className="text-xs text-slate-400">{data.student.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                  <div className="text-[11px] text-slate-400">Completed Exams</div>
                  <div className="text-lg font-bold text-white">
                    {data.studentSubmissions.filter((s) => s.status !== 'IN_PROGRESS').length}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                  <div className="text-[11px] text-slate-400">Latest Score</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {data.growthTimeline.length > 0
                      ? `${data.growthTimeline[data.growthTimeline.length - 1].studentPct}%`
                      : 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                  <div className="text-[11px] text-slate-400">Growth Z-Score</div>
                  <div className="text-lg font-bold text-indigo-400 font-mono">
                    {data.growthTimeline.length > 0
                      ? `${
                          data.growthTimeline[data.growthTimeline.length - 1].zScore >= 0 ? '+' : ''
                        }${data.growthTimeline[data.growthTimeline.length - 1].zScore}σ`
                      : '0.00σ'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Upcoming & Active Proctored Assessments */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">
                    Upcoming & Active Proctored Assessments
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Full-Screen Lock & 3-Strike Auto-Submit Enforced
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {publishedExams.map((exam) => {
                  const existingSub = data.studentSubmissions.find((s) => s.examId === exam.id);
                  const isCompleted = existingSub && existingSub.status !== 'IN_PROGRESS';

                  return (
                    <div
                      key={exam.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300">
                            {exam.courseCode}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{exam.durationMinutes} mins</span>
                            <span>•</span>
                            <span>{exam.questions.length} questions</span>
                            <span>•</span>
                            <span>{exam.totalPoints} pts</span>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white mb-1.5">{exam.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          {exam.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-5">
                          <span className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300">
                            Max Strikes: <strong>{exam.maxStrikes}</strong>
                          </span>
                          <span className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300">
                            Fullscreen: <strong>{exam.enforceFullscreen ? 'Locked' : 'Off'}</strong>
                          </span>
                          <span className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300">
                            Copy/Paste: <strong>{exam.blockClipboard ? 'Disabled' : 'Allowed'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                        {existingSub ? (
                          <div className="text-xs">
                            <span className="text-slate-400">Status: </span>
                            <span
                              className={`font-semibold ${
                                existingSub.status === 'AUTO_SUBMITTED_VIOLATION'
                                  ? 'text-rose-400'
                                  : existingSub.status === 'IN_PROGRESS'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {existingSub.status.replace(/_/g, ' ')}
                              {isCompleted ? ` (${existingSub.percentageScore}%)` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Ready to begin attempt</span>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveExamId(exam.id)}
                          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {isCompleted
                            ? 'View Graded Report / Re-Test'
                            : existingSub
                            ? 'Resume Proctored Exam'
                            : 'Launch Proctored Exam'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Student Progress Over Time & Personalized Topic Learning Gaps */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: Topic Learning Gaps & Remediation Engine */}
              <section className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Diagnostic Competency Matrix
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      Topic Mastery & Learning Gap Analysis
                    </h2>
                  </div>
                  <BookOpen className="h-5 w-5 text-slate-400" />
                </div>

                <div className="space-y-4">
                  {data.topicGaps.map((gap) => (
                    <div
                      key={gap.topicId}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-indigo-300">
                              {gap.topicCode}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                gap.competencyStatus === 'CRITICAL_GAP'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : gap.competencyStatus === 'DEVELOPING'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {gap.competencyStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-white mt-1">{gap.topicName}</h3>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-white">
                            {gap.studentMasteryPct}%{' '}
                            <span className="text-xs font-normal text-slate-400">
                              (Class Avg: {gap.cohortAvgPct}%)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Target Mastery Benchmark: {gap.targetMasteryPct}%
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar with Target Marker */}
                      <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden mb-2.5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            gap.competencyStatus === 'CRITICAL_GAP'
                              ? 'bg-rose-500'
                              : gap.competencyStatus === 'DEVELOPING'
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, gap.studentMasteryPct)}%` }}
                        />
                      </div>

                      <p className="text-xs text-slate-400">{gap.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Right 5 Cols: Historical Growth Over Time & Past Exam Results */}
              <section className="lg:col-span-5 flex flex-col justify-between gap-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Longitudinal Growth Tracking
                      </span>
                      <h2 className="text-base font-bold text-white mt-0.5">
                        Performance Trajectory Across Exams
                      </h2>
                    </div>
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>

                  {data.growthTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6">
                      No graded submissions yet. Complete an assessment to view growth metrics.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {data.growthTimeline.map((pt, index) => (
                        <div
                          key={pt.examId + index}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-white line-clamp-1">
                              {pt.examTitle}
                            </span>
                            <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">
                              {pt.studentPct}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                            <span>Cohort Mean: {pt.cohortAvgPct}%</span>
                            <span className="font-mono text-indigo-300">
                              Z-Score: {pt.zScore >= 0 ? `+${pt.zScore}` : pt.zScore}σ
                            </span>
                            <span>Integrity: {pt.integrityScore}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${pt.studentPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past Submissions Feedback Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-indigo-400" />
                    Recent Faculty Feedback & Rubrics
                  </h3>
                  <div className="space-y-3">
                    {data.studentSubmissions
                      .filter((s) => s.status !== 'IN_PROGRESS')
                      .map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-white mb-1">
                            <span>{sub.examTitle}</span>
                            <span className="font-mono text-emerald-400">
                              {sub.percentageScore}%
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">
                            {sub.teacherSummaryFeedback}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 2: TEACHER ANALYTICS, PROCTORING & EXAM WIZARD SUITE
        =================================================================== */}
        {roleView === 'TEACHER' && (
          <div className="space-y-8">
            {/* Class-Wide Analytics KPI Strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Class-Wide Average Score</span>
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="mt-2 text-2xl font-bold text-white">{cohortMeanScore}%</div>
                <div className="mt-1 text-xs text-emerald-400">
                  Across {completedSubmissions.length} graded submissions
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cohort Completion Rate</span>
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {Math.round(
                    (data.submissions.filter(
                      (s) => s.examId === 'exam-distributed-2026' && s.status !== 'IN_PROGRESS'
                    ).length /
                      data.students.length) *
                      100
                  )}
                  %
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {data.students.length} enrolled students in Cohort CS-401
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Proctoring Violation Logs</span>
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-bold text-amber-300">
                  {data.proctoringLogs.length} Events
                </div>
                <div className="mt-1 text-xs text-rose-400">
                  {violationAutoSubmits} Auto-Submitted for 3/3 Strikes
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Mean Cohort Integrity Score</span>
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-400">
                  {cohortMeanIntegrity}%
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Real-time server-verified telemetry
                </div>
              </div>
            </div>

            {/* Teacher Sub-Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeacherTab('PROCTORING')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    teacherTab === 'PROCTORING'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Live Proctoring & Strike Command Center
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherTab('ANALYTICS')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    teacherTab === 'ANALYTICS'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Cohort Learning Gaps & Student Progress
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherTab('WIZARD')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    teacherTab === 'WIZARD'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FilePlus2 className="h-4 w-4" />
                  Exam Creation Wizard ({data.exams.length} Exams)
                </button>
              </div>

              <button
                type="button"
                onClick={() => fetchDashboard(selectedStudentId)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Telemetry
              </button>
            </div>

            {/* TEACHER TAB 1: LIVE PROCTORING & STRIKE COMMAND CENTER */}
            {teacherTab === 'PROCTORING' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Student Submission & Strike Roster */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Real-Time Proctoring Roster
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      Student Submissions, Strike Counters & Override Controls
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {data.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">
                              {sub.studentName}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                sub.status === 'AUTO_SUBMITTED_VIOLATION'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : sub.status === 'IN_PROGRESS'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {sub.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{sub.examTitle}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-mono">
                            <span>Score: {sub.percentageScore}%</span>
                            <span>Integrity: {sub.integrityScore}%</span>
                            <span
                              className={
                                sub.strikeCount >= sub.maxStrikes
                                  ? 'text-rose-400 font-bold'
                                  : sub.strikeCount > 0
                                  ? 'text-amber-300 font-bold'
                                  : 'text-emerald-400'
                              }
                            >
                              Strikes: {sub.strikeCount}/{sub.maxStrikes}
                            </span>
                          </div>
                        </div>

                        {sub.strikeCount > 0 && (
                          <button
                            type="button"
                            disabled={forgivingId === sub.id}
                            onClick={() => handleForgiveStrike(sub.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25 transition cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {forgivingId === sub.id
                              ? 'Updating...'
                              : sub.status === 'AUTO_SUBMITTED_VIOLATION'
                              ? 'Forgive Strike & Reopen Exam'
                              : 'Forgive 1 Strike'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Immutable Proctoring Audit Stream */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Append-Only Audit Log (proctoring_logs)
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      Real-Time Security & Violation Stream
                    </h2>
                  </div>

                  <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                    {data.proctoringLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`rounded-xl border p-3.5 text-xs ${
                          log.strikeDelta > 0
                            ? 'border-rose-500/30 bg-rose-950/25'
                            : 'border-slate-800 bg-slate-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-white">{log.studentName}</span>
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              log.strikeDelta > 0
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {log.violationType}{' '}
                            {log.strikeDelta > 0
                              ? `(STRIKE ${log.strikeCountAfter})`
                              : '(BLOCKED)'}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{log.description}</p>
                        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-500">
                          <span>
                            Question: {String(log.metadata?.activeQuestionId || 'N/A')}
                          </span>
                          <span>{new Date(log.serverTimestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TEACHER TAB 2: COHORT LEARNING GAPS & STUDENT PROGRESS */}
            {teacherTab === 'ANALYTICS' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="mb-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Curriculum Topic Bottleneck Detection
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      Class-Wide Topic Mastery vs. Target Curriculum Benchmarks
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {data.topicGaps.map((topic) => {
                      const isCohortStruggling = topic.cohortAvgPct < topic.targetMasteryPct;
                      return (
                        <div
                          key={topic.topicId}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-xs font-bold text-indigo-300">
                              {topic.topicCode} • {topic.subject}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isCohortStruggling
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isCohortStruggling ? 'CLASS LEARNING GAP' : 'BENCHMARK MET'}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white mb-3">{topic.topicName}</h3>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span>Class Average Mastery: {topic.cohortAvgPct}%</span>
                            <span>Curriculum Target: {topic.targetMasteryPct}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isCohortStruggling ? 'bg-amber-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${topic.cohortAvgPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Student Cohort Comparison Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 overflow-x-auto">
                  <h3 className="text-base font-bold text-white mb-4">
                    Individual Student Completion & Historical Progress Matrix
                  </h3>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase">
                        <th className="py-3 pr-4">Student</th>
                        <th className="py-3 px-4">Submissions</th>
                        <th className="py-3 px-4">Average Score</th>
                        <th className="py-3 px-4">Integrity Score</th>
                        <th className="py-3 px-4">Total Strikes</th>
                        <th className="py-3 pl-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {data.students.map((st) => {
                        const subs = data.submissions.filter((s) => s.studentId === st.id);
                        const avgScore =
                          subs.length > 0
                            ? Math.round(
                                subs.reduce((a, b) => a + b.percentageScore, 0) / subs.length
                              )
                            : 0;
                        const avgIntegrity =
                          subs.length > 0
                            ? Math.round(
                                subs.reduce((a, b) => a + b.integrityScore, 0) / subs.length
                              )
                            : 100;
                        const totalStrikes = subs.reduce((a, b) => a + b.strikeCount, 0);

                        return (
                          <tr key={st.id} className="hover:bg-slate-950/60">
                            <td className="py-3.5 pr-4 font-semibold text-white">
                              {st.fullName}
                              <div className="text-[11px] font-normal text-slate-400">
                                {st.email}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">{subs.length} Exams</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                              {avgScore}%
                            </td>
                            <td className="py-3.5 px-4 font-mono text-indigo-300">
                              {avgIntegrity}%
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span
                                className={`rounded px-2 py-0.5 ${
                                  totalStrikes >= 3
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : totalStrikes > 0
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {totalStrikes} Strikes
                              </span>
                            </td>
                            <td className="py-3.5 pl-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(st.id);
                                  setRoleView('STUDENT');
                                }}
                                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                              >
                                Inspect Student View →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TEACHER TAB 3: EXAM CREATION WIZARD */}
            {teacherTab === 'WIZARD' && (
              <ExamCreationWizard
                topics={data.topics}
                onExamCreated={() => fetchDashboard(selectedStudentId)}
              />
            )}
          </div>
        )}

        {/* ===================================================================
            VIEW 3: ARCHITECTURE & NEON POSTGRES SCHEMA EXPLORER
        =================================================================== */}
        {roleView === 'ARCHITECTURE' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Code2 className="h-4 w-4" />
                Vercel + Neon Serverless Architecture
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Production Implementation & Repository Structure
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                This application is structured for zero-config deployment to Vercel paired with Neon
                Serverless PostgreSQL. Below is a summary of the key architectural modules included
                in this repository:
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="font-mono text-xs font-bold text-indigo-300 mb-1">
                    src/lib/proctoring/ExamProctorGuard.ts
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Capture-phase browser event guard blocking right-click, text selection,
                    copy/cut/paste, DevTools shortcuts, tab switches (visibilitychange), window blur,
                    and fullscreen exits with a 1,500ms deduplication cooldown.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="font-mono text-xs font-bold text-emerald-300 mb-1">
                    db/schema.sql & src/db/schema.ts
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Relational schema for Neon Postgres 16+ & Drizzle ORM covering users, topics,
                    exams, questions (with server-isolated grading_key), exam_submissions,
                    submission_answers, and append-only proctoring_logs.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="font-mono text-xs font-bold text-amber-300 mb-1">
                    src/app/api/exams/[examId]/proctor/route.ts
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Atomic strike processor that increments strike_count, deducts integrity points,
                    and transitions status to AUTO_SUBMITTED_VIOLATION upon reaching max_strikes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Active Proctored Exam Modal */}
      {activeExamId && (
        <ExamRunnerModal
          examId={activeExamId}
          studentId={selectedStudentId}
          onClose={() => setActiveExamId(null)}
          onExamCompleted={() => fetchDashboard(selectedStudentId)}
        />
      )}
    </div>
  );
}
