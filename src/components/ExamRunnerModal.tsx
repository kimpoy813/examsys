'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import { ExamProctorGuard } from '@/lib/proctoring/ExamProctorGuard';
import {
  Exam,
  ExamSubmission,
  SafeStudentQuestion,
  ViolationType,
} from '@/types/exam';

interface ActiveExamPayload {
  id: string;
  title: string;
  courseCode: string;
  description: string;
  durationMinutes: number;
  totalPoints: number;
  maxStrikes: number;
  enforceFullscreen: boolean;
  blockClipboard: boolean;
  questions: SafeStudentQuestion[];
}

interface ExamRunnerModalProps {
  examId: string;
  studentId: string;
  onClose: () => void;
  onExamCompleted: () => void;
}

interface LocalViolationNotice {
  violationType: ViolationType;
  reason: string;
  currentStrikes: number;
  maxStrikes: number;
  isFormalStrike: boolean;
  timestamp: string;
}

export function ExamRunnerModal({
  examId,
  studentId,
  onClose,
  onExamCompleted,
}: ExamRunnerModalProps) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'PREFLIGHT' | 'ACTIVE' | 'COMPLETED'>('PREFLIGHT');
  const [exam, setExam] = useState<ActiveExamPayload | null>(null);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [gradedExamWithKeys, setGradedExamWithKeys] = useState<Exam | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, { selectedOptionId?: string; textResponse?: string }>
  >({});
  const [saveState, setSaveState] = useState<'IDLE' | 'SAVING' | 'SAVED'>('SAVED');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(2700);

  const [strikes, setStrikes] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lockdownModal, setLockdownModal] = useState<LocalViolationNotice | null>(null);
  const [toastBanner, setToastBanner] = useState<LocalViolationNotice | null>(null);
  const [eventFeed, setEventFeed] = useState<LocalViolationNotice[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guardRef = useRef<ExamProctorGuard | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    let mounted = true;
    async function loadAttempt() {
      setLoading(true);
      try {
        const res = await fetch(`/api/exams/${examId}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId }),
        });
        const data = await res.json();
        if (!mounted) return;

        setExam(data.exam);
        setSubmission(data.submission);
        setStrikes(data.submission.strikeCount || 0);

        const existingAnswers: Record<
          string,
          { selectedOptionId?: string; textResponse?: string }
        > = {};
        Object.entries(data.submission.answers || {}).forEach(([qId, ans]: [string, any]) => {
          existingAnswers[qId] = {
            selectedOptionId: ans.selectedOptionId,
            textResponse: ans.textResponse,
          };
        });
        setAnswers(existingAnswers);

        const expiryMs = new Date(data.submission.expiresAt).getTime();
        const diffSec = Math.max(60, Math.floor((expiryMs - Date.now()) / 1000));
        setRemainingSeconds(diffSec);

        if (data.submission.status !== 'IN_PROGRESS') {
          setPhase('COMPLETED');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAttempt();
    return () => {
      mounted = false;
      guardRef.current?.destroy();
    };
  }, [examId, studentId]);

  // Keep activeQuestionIdRef synced for proctoring telemetry metadata
  useEffect(() => {
    if (exam && exam.questions[activeIndex]) {
      activeQuestionIdRef.current = exam.questions[activeIndex].id;
    }
  }, [exam, activeIndex]);

  // Countdown timer during ACTIVE phase
  useEffect(() => {
    if (phase !== 'ACTIVE') return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit('AUTO_SUBMITTED_TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Debounced autosave to server
  useEffect(() => {
    if (phase !== 'ACTIVE' || !submission || !exam) return;
    setSaveState('SAVING');
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/exams/${exam.id}/attempt`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: submission.id,
            answers: answersRef.current,
          }),
        });
        setSaveState('SAVED');
      } catch {
        setSaveState('IDLE');
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [answers, phase, submission, exam]);

  const startProctoredSession = async () => {
    if (!exam || !submission) return;

    const guard = new ExamProctorGuard({
      submissionId: submission.id,
      examId: exam.id,
      maxStrikes: exam.maxStrikes,
      initialStrikes: submission.strikeCount || 0,
      enforceFullscreen: exam.enforceFullscreen,
      blockClipboard: exam.blockClipboard,
      getActiveQuestionId: () => activeQuestionIdRef.current,
      onFullscreenChange: (fs) => setIsFullscreen(fs),
      onWarning: (currentStrikes, maxStrikes, violationType, reason, isFormalStrike) => {
        setStrikes(currentStrikes);
        const notice: LocalViolationNotice = {
          violationType,
          reason,
          currentStrikes,
          maxStrikes,
          isFormalStrike,
          timestamp: new Date().toLocaleTimeString(),
        };
        setEventFeed((prev) => [notice, ...prev.slice(0, 7)]);

        if (isFormalStrike) {
          setLockdownModal(notice);
        } else {
          setToastBanner(notice);
          setTimeout(() => {
            setToastBanner((curr) => (curr === notice ? null : curr));
          }, 4000);
        }
      },
      onAutoSubmit: async () => {
        setStrikes(exam.maxStrikes);
        setLockdownModal(null);
        await handleFinalSubmit('AUTO_SUBMITTED_VIOLATION');
      },
    });

    guard.init();
    guardRef.current = guard;
    await guard.enterFullscreen();
    setPhase('ACTIVE');
  };

  const handleFinalSubmit = async (
    finalStatus: 'GRADED' | 'AUTO_SUBMITTED_VIOLATION' | 'AUTO_SUBMITTED_TIMEOUT' = 'GRADED'
  ) => {
    if (!exam || !submission || isSubmitting) return;
    setIsSubmitting(true);
    guardRef.current?.destroy();
    await guardRef.current?.exitFullscreen();

    try {
      const res = await fetch(`/api/exams/${exam.id}/attempt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          status: finalStatus,
          answers: answersRef.current,
        }),
      });
      const data = await res.json();
      if (data.submission) {
        setSubmission(data.submission);
      }
      if (data.examWithKeys) {
        setGradedExamWithKeys(data.examWithKeys);
      }
      setPhase('COMPLETED');
      onExamCompleted();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAttempt = async () => {
    setLoading(true);
    guardRef.current?.destroy();
    const res = await fetch(`/api/exams/${examId}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, reset: true }),
    });
    const data = await res.json();
    setExam(data.exam);
    setSubmission(data.submission);
    setStrikes(0);
    setAnswers({});
    setEventFeed([]);
    setLockdownModal(null);
    setPhase('PREFLIGHT');
    setLoading(false);
    onExamCompleted();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading || !exam || !submission) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-8 py-7 text-slate-100 shadow-2xl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <p className="text-sm font-medium text-slate-300">
            Initializing Secure Proctoring Sandbox & Syncing Server Clock...
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[activeIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || {} : {};
  const answeredCount = exam.questions.filter((q) => {
    const a = answers[q.id];
    return Boolean(a?.selectedOptionId || (a?.textResponse && a.textResponse.trim().length > 0));
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-y-auto">
      {/* Top Security & Telemetry Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 px-6 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-300">
                  {exam.courseCode}
                </span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  PROCTOR GUARD ACTIVE
                </span>
              </div>
              <h1 className="text-sm font-semibold text-white sm:text-base">{exam.title}</h1>
            </div>
          </div>

          {phase === 'ACTIVE' && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Autosave status */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400">
                <span
                  className={`h-2 w-2 rounded-full ${
                    saveState === 'SAVING' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                  }`}
                />
                {saveState === 'SAVING' ? 'Syncing to Neon...' : 'Answers Saved'}
              </div>

              {/* Strike Counter Pill */}
              <div
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold ${
                  strikes === 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : strikes === 1
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border-rose-500/50 bg-rose-500/20 text-rose-200 animate-pulse'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>
                  Strikes: {strikes} / {exam.maxStrikes}
                </span>
              </div>

              {/* Server Countdown Clock */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-1.5 font-mono text-sm font-semibold text-white">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>

              <button
                onClick={() => handleFinalSubmit('GRADED')}
                disabled={isSubmitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          )}

          {phase !== 'ACTIVE' && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            >
              Exit to Dashboard
            </button>
          )}
        </div>
      </header>

      {/* PHASE 1: PRE-FLIGHT INTEGRITY GATE */}
      {phase === 'PREFLIGHT' && (
        <div className="mx-auto my-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400 mb-3">
              <ShieldCheck className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Mandatory Proctoring & Environment Check
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{exam.title}</h2>
            <p className="text-sm text-slate-400 mb-6">{exam.description}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="text-xs text-slate-400">Duration</div>
                <div className="mt-1 text-lg font-bold text-white">
                  {exam.durationMinutes} Minutes
                </div>
                <div className="mt-0.5 text-xs text-slate-500">Server-authoritative clock</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="text-xs text-slate-400">Questions & Points</div>
                <div className="mt-1 text-lg font-bold text-white">
                  {exam.questions.length} Items ({exam.totalPoints} pts)
                </div>
                <div className="mt-0.5 text-xs text-slate-500">MCQ, Short Answer & Essay</div>
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                <div className="text-xs text-rose-300">Auto-Submit Policy</div>
                <div className="mt-1 text-lg font-bold text-rose-200">
                  {exam.maxStrikes} Strikes Maximum
                </div>
                <div className="mt-0.5 text-xs text-rose-400/80">Atomic server lock on 3rd strike</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 mb-7 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Active Security Rules Enforced During This Assessment:
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>No Copy-Pasting or Context Menu:</strong> Right-click, text selection,
                    drag-and-drop, and <code className="text-indigo-300">Ctrl/Cmd + C, V, X, P, F</code>{' '}
                    shortcuts are intercepted and logged in the capture phase.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Tab & Window Switch Detection:</strong> Navigating to another tab (
                    <code className="text-indigo-300">visibilitychange</code>) or losing window focus (
                    <code className="text-indigo-300">window.blur</code>) immediately triggers a formal
                    strike with a 1,500ms deduplication window.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Mandatory Full-Screen Lock:</strong> Exiting full-screen mode locks the
                    question viewport behind a security warning overlay and records a formal strike.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel & Return
              </button>
              <button
                onClick={startProctoredSession}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition cursor-pointer"
              >
                <Maximize2 className="h-4 w-4" />
                Enter Full-Screen & Start Proctored Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE DISTRACTION-FREE EXAM RUNNER */}
      {phase === 'ACTIVE' && currentQuestion && (
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6">
          {/* Interactive Security Verification Bar (Allows testing strikes inside preview) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/25 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 text-indigo-200">
              <Terminal className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Live Proctoring Verification Bar:</strong> Try right-clicking, pressing{' '}
                <code className="rounded bg-slate-800 px-1.5 py-0.5">Ctrl+C</code> /{' '}
                <code className="rounded bg-slate-800 px-1.5 py-0.5">Ctrl+V</code>, switching browser
                tabs, or trigger a test event:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  guardRef.current?.triggerViolation(
                    'CLIPBOARD_PASTE',
                    false,
                    'Clipboard PASTE shortcut (Ctrl+V) intercepted and blocked.'
                  )
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-indigo-400 transition cursor-pointer"
              >
                Test Copy/Paste Block (0 Strike)
              </button>
              <button
                type="button"
                onClick={() =>
                  guardRef.current?.triggerViolation(
                    'TAB_SWITCH',
                    true,
                    'Student navigated away from the active exam tab (visibilityState: hidden).'
                  )
                }
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition cursor-pointer"
              >
                Simulate Tab Switch (+1 Strike)
              </button>
              <button
                type="button"
                onClick={() =>
                  guardRef.current?.triggerViolation(
                    'FULLSCREEN_EXIT',
                    true,
                    'Student exited mandatory Full-Screen mode during active assessment.'
                  )
                }
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 transition cursor-pointer"
              >
                Simulate Fullscreen Exit (+1 Strike)
              </button>
            </div>
          </div>

          {/* Non-strike Toast Banner (e.g., Right-click or Copy/Paste blocked) */}
          {toastBanner && (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/60 px-4 py-3 text-xs text-amber-200 shadow-lg">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Security Action Blocked ({toastBanner.violationType}):</strong>{' '}
                  {toastBanner.reason} (Logged to Teacher Audit Feed — 0 Strike Penalty)
                </span>
              </div>
              <button
                onClick={() => setToastBanner(null)}
                className="text-amber-300 hover:text-white font-semibold ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Exam Grid */}
          <div
            className={`grid grid-cols-1 gap-6 lg:grid-cols-12 transition duration-200 ${
              lockdownModal ? 'blur-xl pointer-events-none select-none' : ''
            }`}
          >
            {/* Left Sidebar: Question Navigator & Proctoring Telemetry Log */}
            <aside className="lg:col-span-3 space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Question Navigator
                  </h3>
                  <span className="text-xs font-medium text-indigo-400">
                    {answeredCount}/{exam.questions.length} Answered
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {exam.questions.map((q, idx) => {
                    const ans = answers[q.id];
                    const isAnswered = Boolean(
                      ans?.selectedOptionId || (ans?.textResponse && ans.textResponse.trim())
                    );
                    const isCurrent = idx === activeIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setActiveIndex(idx)}
                        className={`flex h-10 items-center justify-center rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                            : isAnswered
                            ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        Q{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Client Telemetry Feed */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Proctor Event Log
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    {isFullscreen ? 'FULLSCREEN: ON' : 'SANDBOX: LOCKED'}
                  </span>
                </div>
                {eventFeed.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    No violations recorded. Session integrity at 100%.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {eventFeed.map((ev, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-2.5 text-[11px] ${
                          ev.isFormalStrike
                            ? 'border-rose-500/30 bg-rose-950/30 text-rose-200'
                            : 'border-slate-800 bg-slate-950 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono font-semibold">
                          <span>{ev.violationType}</span>
                          <span>{ev.timestamp}</span>
                        </div>
                        <p className="mt-1 text-slate-400">{ev.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Center/Right: Active Question Canvas */}
            <section className="lg:col-span-9 flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300">
                      Question {activeIndex + 1} of {exam.questions.length}
                    </span>
                    <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {currentQuestion.type.replace('_', ' ')}
                    </span>
                    <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-400">
                      Topic: {currentQuestion.topicCode}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {currentQuestion.points} Points
                  </span>
                </div>

                {/* Question Prompt (Selection & Copy Blocked) */}
                <h2 className="text-base sm:text-lg font-medium leading-relaxed text-white mb-6">
                  {currentQuestion.prompt}
                </h2>

                {/* Question Input by Type */}
                {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt) => {
                      const selected = currentAnswer.selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQuestion.id]: { selectedOptionId: opt.id },
                            }))
                          }
                          className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left text-sm transition cursor-pointer ${
                            selected
                              ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                              : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                              selected
                                ? 'border-indigo-400 bg-indigo-500 text-white'
                                : 'border-slate-600 text-transparent'
                            }`}
                          >
                            ✓
                          </div>
                          <span className="leading-relaxed">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'SHORT_ANSWER' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Concise Technical Response (Paste Disabled)
                    </label>
                    <input
                      type="text"
                      value={currentAnswer.textResponse || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: { textResponse: e.target.value },
                        }))
                      }
                      placeholder="Type your answer directly (e.g., O(n))..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none select-text"
                    />
                  </div>
                )}

                {currentQuestion.type === 'ESSAY' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Structured Architectural Essay (External Clipboard Paste Restricted)
                      </label>
                      <span className="font-mono text-xs text-slate-400">
                        {(currentAnswer.textResponse || '')
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean).length}{' '}
                        words
                      </span>
                    </div>
                    <textarea
                      rows={8}
                      value={currentAnswer.textResponse || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: { textResponse: e.target.value },
                        }))
                      }
                      placeholder="Write your architectural response here. Note: Ctrl+V / Right-Click Paste is intercepted by ExamProctorGuard..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-relaxed text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none select-text"
                    />
                  </div>
                )}
              </div>

              {/* Footer Pagination */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 disabled:opacity-40 hover:bg-slate-700 transition cursor-pointer"
                >
                  ← Previous Question
                </button>
                {activeIndex < exam.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((i) => Math.min(exam.questions.length - 1, i + 1))
                    }
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFinalSubmit('GRADED')}
                    disabled={isSubmitting}
                    className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                  >
                    {isSubmitting ? 'Grading & Sealing...' : 'Finish & Submit Assessment'}
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* VIOLATION LOCKDOWN OVERLAY MODAL (Blurs Exam Questions on Formal Strike) */}
          {lockdownModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6 backdrop-blur-md">
              <div className="max-w-lg rounded-2xl border-2 border-rose-500 bg-slate-900 p-7 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-400 mb-3">
                  <ShieldAlert className="h-7 w-7" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Proctoring Violation Recorded
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Strike {lockdownModal.currentStrikes} of {lockdownModal.maxStrikes} Issued
                    </h3>
                  </div>
                </div>

                <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-100 mb-4">
                  <strong>{lockdownModal.violationType}:</strong> {lockdownModal.reason}
                </p>

                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  This incident has been logged to the immutable Neon Postgres audit table with your
                  timestamp and active question ID. Reaching{' '}
                  <strong>{lockdownModal.maxStrikes} strikes</strong> triggers immediate, irreversible
                  server-side auto-submission.
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    await guardRef.current?.enterFullscreen();
                    setLockdownModal(null);
                  }}
                  className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-500 transition cursor-pointer"
                >
                  Acknowledge Warning & Restore Full-Screen Lock
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: COMPLETED / AUTO-SUBMITTED REPORT */}
      {phase === 'COMPLETED' && (
        <div className="mx-auto my-auto w-full max-w-4xl px-6 py-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {submission.status === 'AUTO_SUBMITTED_VIOLATION' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300">
                      <XCircle className="h-4 w-4" />
                      AUTO-SUBMITTED: 3/3 PROCTORING STRIKES
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      ASSESSMENT SUBMITTED & AUTO-GRADED
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">{exam.title}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {submission.teacherSummaryFeedback}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 text-center">
                  <div className="text-[11px] uppercase text-slate-400">Final Score</div>
                  <div className="text-2xl font-bold text-white">
                    {submission.percentageScore}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {submission.totalScore} / {submission.maxPossibleScore} pts
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 text-center">
                  <div className="text-[11px] uppercase text-slate-400">Integrity Score</div>
                  <div
                    className={`text-2xl font-bold ${
                      submission.integrityScore >= 90
                        ? 'text-emerald-400'
                        : submission.integrityScore >= 70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {submission.integrityScore}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {submission.strikeCount}/{submission.maxStrikes} Strikes
                  </div>
                </div>
              </div>
            </div>

            {/* Question-by-Question Graded Feedback */}
            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Question-Level Evaluation & Rubric Breakdown
              </h3>
              {(gradedExamWithKeys?.questions || exam.questions).map((q, idx) => {
                const ans = submission.answers[q.id];
                const awarded = ans?.pointsAwarded ?? 0;
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-semibold text-indigo-300">
                        Q{idx + 1} • {q.topicName} ({q.topicCode})
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          awarded >= q.points * 0.7 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {awarded} / {q.points} pts
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 mb-2">{q.prompt}</p>
                    {ans?.teacherFeedback && (
                      <div className="flex items-start gap-2 rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300">
                        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{ans.teacherFeedback}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleResetAttempt}
                className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
              >
                Reset Attempt (Re-Test Proctoring & Strikes)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
              >
                Return to Student Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
