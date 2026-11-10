'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Maximize2,
  ShieldAlert,
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
  studentName: string;
  studentEmail?: string;
  onClose: () => void;
  onExamCompleted: () => void;
}

interface ViolationAlert {
  violationType: ViolationType;
  reason: string;
  currentStrikes: number;
  maxStrikes: number;
  isFormalStrike: boolean;
}

export function ExamRunnerModal({
  examId,
  studentName,
  studentEmail,
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
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [strikes, setStrikes] = useState(0);

  const [lockdownModal, setLockdownModal] = useState<ViolationAlert | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guardRef = useRef<ExamProctorGuard | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    let mounted = true;
    async function initAttempt() {
      setLoading(true);
      try {
        const res = await fetch(`/api/exams/${examId}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentName, studentEmail }),
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
    initAttempt();
    return () => {
      mounted = false;
      guardRef.current?.destroy();
    };
  }, [examId, studentName, studentEmail]);

  useEffect(() => {
    if (exam && exam.questions[activeIndex]) {
      activeQuestionIdRef.current = exam.questions[activeIndex].id;
    }
  }, [exam, activeIndex]);

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

  // Quiet background autosave
  useEffect(() => {
    if (phase !== 'ACTIVE' || !submission || !exam) return;
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
      } catch {
        // Ignore transient network errors
      }
    }, 800);
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
      onFullscreenChange: () => {},
      onWarning: (currentStrikes, maxStrikes, violationType, reason, isFormalStrike) => {
        setStrikes(currentStrikes);
        if (isFormalStrike) {
          setLockdownModal({
            violationType,
            reason,
            currentStrikes,
            maxStrikes,
            isFormalStrike,
          });
        } else {
          setInlineNotice(reason);
          setTimeout(() => {
            setInlineNotice((curr) => (curr === reason ? null : curr));
          }, 3000);
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
      if (data.submission) setSubmission(data.submission);
      if (data.examWithKeys) setGradedExamWithKeys(data.examWithKeys);
      setPhase('COMPLETED');
      onExamCompleted();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading || !exam || !submission) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50">
        <div className="text-xs font-medium text-zinc-500">Loading exam...</div>
      </div>
    );
  }

  const currentQuestion = exam.questions[activeIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || {} : {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 text-zinc-900 select-none overflow-y-auto">
      {/* Minimal Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-900">{exam.title}</span>
          </div>

          {phase === 'ACTIVE' ? (
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  strikes === 0
                    ? 'bg-zinc-100 text-zinc-600'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                Strikes: {strikes} / {exam.maxStrikes}
              </span>

              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs font-semibold text-zinc-800">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>

              <button
                type="button"
                onClick={() => handleFinalSubmit('GRADED')}
                disabled={isSubmitting}
                className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </header>

      {/* PREFLIGHT CONFIRMATION */}
      {phase === 'PREFLIGHT' && (
        <div className="mx-auto my-auto w-full max-w-lg px-6 py-12">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {exam.courseCode}
              </span>
              <h1 className="text-xl font-semibold text-zinc-900 mt-1">{exam.title}</h1>
              {exam.description && (
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{exam.description}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 border-y border-zinc-100 py-4 text-center">
              <div>
                <div className="text-[11px] text-zinc-400">Duration</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5">
                  {exam.durationMinutes}m
                </div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-400">Questions</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5">
                  {exam.questions.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-400">Strike Limit</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5">
                  {exam.maxStrikes} strikes
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-600">
              <div className="font-medium text-zinc-900">Proctoring Rules:</div>
              <ul className="space-y-1.5 text-zinc-500 list-disc list-inside">
                {exam.enforceFullscreen && (
                  <li>Exam runs in fullscreen mode. Exiting fullscreen records a strike.</li>
                )}
                {exam.blockClipboard && (
                  <li>Copy, paste, right-click, and text selection are disabled.</li>
                )}
                <li>
                  Switching tabs or windows records a strike. Reaching {exam.maxStrikes} strikes
                  automatically submits your exam.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startProctoredSession}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Start Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE QUESTION VIEW */}
      {phase === 'ACTIVE' && currentQuestion && (
        <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 space-y-6">
          {inlineNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{inlineNotice}</span>
            </div>
          )}

          {/* Question Stepper Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {exam.questions.map((q, idx) => {
              const ans = answers[q.id];
              const answered = Boolean(
                ans?.selectedOptionId || (ans?.textResponse && ans.textResponse.trim())
              );
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isCurrent
                      ? 'bg-zinc-900 text-white'
                      : answered
                      ? 'border border-zinc-300 bg-zinc-100 text-zinc-800'
                      : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question Card */}
          <div
            className={`rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm transition ${
              lockdownModal ? 'blur-lg pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-4">
              <span>
                Question {activeIndex + 1} of {exam.questions.length}
                {currentQuestion.topicName ? ` • ${currentQuestion.topicName}` : ''}
              </span>
              <span className="font-medium text-zinc-600">{currentQuestion.points} pts</span>
            </div>

            <h2 className="text-base font-medium text-zinc-900 leading-relaxed mb-6">
              {currentQuestion.prompt}
            </h2>

            {currentQuestion.type === 'MCQ' && currentQuestion.options && (
              <div className="space-y-2.5">
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
                      className={`flex w-full items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition cursor-pointer ${
                        selected
                          ? 'border-zinc-900 bg-zinc-900/5 font-medium text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300'
                        }`}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'SHORT_ANSWER' && (
              <input
                type="text"
                value={currentAnswer.textResponse || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: { textResponse: e.target.value },
                  }))
                }
                placeholder="Type your answer..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none select-text"
              />
            )}

            {currentQuestion.type === 'ESSAY' && (
              <textarea
                rows={7}
                value={currentAnswer.textResponse || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: { textResponse: e.target.value },
                  }))
                }
                placeholder="Write your response..."
                className="w-full rounded-lg border border-zinc-200 bg-white p-3.5 text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none select-text"
              />
            )}

            <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-5">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 disabled:opacity-40 hover:bg-zinc-50 transition cursor-pointer"
              >
                Previous
              </button>

              {activeIndex < exam.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((i) => Math.min(exam.questions.length - 1, i + 1))
                  }
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFinalSubmit('GRADED')}
                  disabled={isSubmitting}
                  className="rounded-lg bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              )}
            </div>
          </div>

          {/* Strike Warning Modal */}
          {lockdownModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6 backdrop-blur-sm">
              <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                  <h3 className="text-sm font-semibold">
                    Proctoring Warning ({lockdownModal.currentStrikes} of{' '}
                    {lockdownModal.maxStrikes} Strikes)
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">{lockdownModal.reason}</p>
                <p className="text-xs text-zinc-500">
                  Your exam will automatically submit if you reach {lockdownModal.maxStrikes}{' '}
                  strikes.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await guardRef.current?.enterFullscreen();
                    setLockdownModal(null);
                  }}
                  className="w-full rounded-lg bg-zinc-900 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  Acknowledge & Return to Exam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED RESULT VIEW */}
      {phase === 'COMPLETED' && (
        <div className="mx-auto my-auto w-full max-w-2xl px-6 py-12">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-zinc-900" />
                  <span>
                    {submission.status === 'AUTO_SUBMITTED_VIOLATION'
                      ? 'Auto-Submitted (Strike Limit Reached)'
                      : 'Completed'}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">{exam.title}</h2>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-[11px] text-zinc-400">Score</div>
                  <div className="text-xl font-bold text-zinc-900">
                    {submission.percentageScore}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">Strikes</div>
                  <div className="text-xl font-bold text-zinc-900">
                    {submission.strikeCount}/{submission.maxStrikes}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium text-zinc-500">Question Summary</div>
              {(gradedExamWithKeys?.questions || exam.questions).map((q, idx) => {
                const ans = submission.answers[q.id];
                const awarded = ans?.pointsAwarded ?? 0;
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium text-zinc-900">
                      <span>
                        #{idx + 1} {q.prompt}
                      </span>
                      <span className="shrink-0 ml-3 font-mono">
                        {awarded} / {q.points} pts
                      </span>
                    </div>
                    {ans?.teacherFeedback && (
                      <p className="text-zinc-500">{ans.teacherFeedback}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
