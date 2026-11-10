'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DifficultyLevel, QuestionType, Topic } from '@/types/exam';

interface DraftQuestion {
  topicId: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  prompt: string;
  points: number;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  acceptedAnswersRaw: string;
  keywordsRaw: string;
  explanation: string;
}

interface ExamCreationWizardProps {
  topics: Topic[];
  onExamCreated: () => void;
}

export function ExamCreationWizard({ topics, onExamCreated }: ExamCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('Final Assessment: Cloud-Native Postgres & Edge Security');
  const [courseCode, setCourseCode] = useState('CS-401');
  const [description, setDescription] = useState(
    'Comprehensive proctored assessment covering serverless Postgres branching, transaction isolation, and zero-trust web security.'
  );
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [enforceFullscreen, setEnforceFullscreen] = useState(true);
  const [blockClipboard, setBlockClipboard] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  const [questions, setQuestions] = useState<DraftQuestion[]>([
    {
      topicId: topics[2]?.id || 'topic-dist',
      type: 'MCQ',
      difficulty: 'INTERMEDIATE',
      prompt:
        'Which protocol does @neondatabase/serverless use to execute SQL queries from Vercel Edge Functions where raw TCP sockets are unavailable?',
      points: 30,
      options: [
        { id: 'opt-1', text: 'WebSockets and HTTPS fetch over port 443' },
        { id: 'opt-2', text: 'UDP multicast packets over port 5432' },
        { id: 'opt-3', text: 'Local Unix domain sockets' },
      ],
      correctOptionId: 'opt-1',
      acceptedAnswersRaw: '',
      keywordsRaw: '',
      explanation:
        'Neon Serverless driver tunnels Postgres wire protocol over WebSockets or stateless HTTP fetch requests.',
    },
    {
      topicId: topics[0]?.id || 'topic-dp',
      type: 'SHORT_ANSWER',
      difficulty: 'INTERMEDIATE',
      prompt:
        'What is the time complexity of looking up a memoized subproblem state stored in a hash map or direct-address table?',
      points: 30,
      options: [],
      correctOptionId: '',
      acceptedAnswersRaw: 'O(1), constant, O(1) time',
      keywordsRaw: 'o(1), constant',
      explanation: 'Memoization caches already-solved subproblems for O(1) constant-time lookup.',
    },
    {
      topicId: topics[3]?.id || 'topic-sec',
      type: 'ESSAY',
      difficulty: 'ADVANCED',
      prompt:
        'Design a deduplication strategy for browser focus and visibilitychange events so a student who presses Alt+Tab once is not penalized with two simultaneous strikes.',
      points: 40,
      options: [],
      correctOptionId: '',
      acceptedAnswersRaw: '',
      keywordsRaw: 'cooldown, timestamp, visibilitychange, blur, server, transaction',
      explanation:
        'Combine a 1,500ms client-side cooldown window with a server-side check against proctoring_logs.server_timestamp.',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [publishedBanner, setPublishedBanner] = useState<string | null>(null);

  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [
      ...prev,
      {
        topicId: topics[0]?.id || 'topic-dp',
        type,
        difficulty: 'INTERMEDIATE',
        prompt: '',
        points: 25,
        options:
          type === 'MCQ'
            ? [
                { id: 'opt-1', text: 'Option A' },
                { id: 'opt-2', text: 'Option B' },
                { id: 'opt-3', text: 'Option C' },
              ]
            : [],
        correctOptionId: 'opt-1',
        acceptedAnswersRaw: 'O(n)',
        keywordsRaw: 'architecture, security, transaction',
        explanation: '',
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);

  const handlePublish = async () => {
    setSubmitting(true);
    setPublishedBanner(null);
    try {
      const payload = {
        title,
        courseCode,
        description,
        durationMinutes,
        maxStrikes,
        enforceFullscreen,
        blockClipboard,
        shuffleQuestions,
        questions: questions.map((q) => ({
          topicId: q.topicId,
          type: q.type,
          difficulty: q.difficulty,
          prompt: q.prompt || 'Untitled Assessment Question',
          points: Number(q.points) || 20,
          options: q.type === 'MCQ' ? q.options : undefined,
          correctOptionId: q.type === 'MCQ' ? q.correctOptionId : undefined,
          acceptedAnswers:
            q.type === 'SHORT_ANSWER'
              ? q.acceptedAnswersRaw
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
          keywords:
            q.type !== 'MCQ'
              ? q.keywordsRaw
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
          explanation: q.explanation,
        })),
      };

      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setPublishedBanner(
          `Published "${title}" (${questions.length} questions, ${totalPoints} pts) to Cohort ${courseCode}! Switch to Student View to take it immediately.`
        );
        onExamCreated();
        setStep(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
      {/* Stepper Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Assessment Authoring Studio
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Multi-Step Exam & Proctoring Creation Wizard
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {[
            { num: 1, label: '1. Policy & Proctoring' },
            { num: 2, label: '2. Questions & Topics' },
            { num: 3, label: '3. Review & Publish' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as 1 | 2 | 3)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                step === s.num
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {publishedBanner && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{publishedBanner}</span>
        </div>
      )}

      {/* STEP 1: METADATA & PROCTORING RULES */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assessment Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Instructions & Scope Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Time Limit (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Enforced via server-calculated expires_at timestamp.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Maximum Proctoring Strikes Before Auto-Submit
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxStrikes}
                onChange={(e) => setMaxStrikes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Default: 3 strikes (Tab Switch, Window Blur, Fullscreen Exit).
              </p>
            </div>
          </div>

          {/* Proctoring Toggles */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Shield className="h-4 w-4" />
              Anti-Cheating & Browser Lockdown Policies
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceFullscreen}
                  onChange={(e) => setEnforceFullscreen(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span>Enforce Mandatory Fullscreen Mode</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockClipboard}
                  onChange={(e) => setBlockClipboard(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span>Block Copy, Paste, Context Menu & Shortcuts</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span>Deterministic Per-Student Question Shuffling</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
            >
              Continue to Question Builder →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: QUESTION & CURRICULUM TOPIC BUILDER */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Total Assessment Points:{' '}
              <strong className="text-emerald-400 font-mono">{totalPoints} pts</strong> across{' '}
              <strong>{questions.length} questions</strong>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addQuestion('MCQ')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => addQuestion('SHORT_ANSWER')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Short Answer
              </button>
              <button
                type="button"
                onClick={() => addQuestion('ESSAY')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Essay
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300">
                      Q{idx + 1}
                    </span>
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(idx, { type: e.target.value as QuestionType })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                    >
                      <option value="MCQ">Multiple Choice (MCQ)</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="ESSAY">Architectural Essay</option>
                    </select>
                    <select
                      value={q.topicId}
                      onChange={(e) => updateQuestion(idx, { topicId: e.target.value })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-indigo-200"
                    >
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          Topic: {t.code} — {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-emerald-400"
                    />
                    <span className="text-xs text-slate-400">pts</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                  placeholder="Enter question prompt..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-white"
                />

                {q.type === 'MCQ' && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase text-slate-400">
                      Options (Select Radio for Server-Only Correct Key):
                    </div>
                    {q.options.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${idx}`}
                          checked={q.correctOptionId === opt.id}
                          onChange={() => updateQuestion(idx, { correctOptionId: opt.id })}
                          className="h-4 w-4 accent-emerald-500"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const nextOpts = [...q.options];
                            nextOpts[oIdx] = { ...opt, text: e.target.value };
                            updateQuestion(idx, { options: nextOpts });
                          }}
                          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'SHORT_ANSWER' && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Accepted Canonical Answers (Comma-Separated, Server-Only):
                    </label>
                    <input
                      type="text"
                      value={q.acceptedAnswersRaw}
                      onChange={(e) =>
                        updateQuestion(idx, { acceptedAnswersRaw: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-emerald-300 font-mono"
                    />
                  </div>
                )}

                {q.type === 'ESSAY' && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Auto-Grading Rubric Concepts / Keywords (Comma-Separated):
                    </label>
                    <input
                      type="text"
                      value={q.keywordsRaw}
                      onChange={(e) => updateQuestion(idx, { keywordsRaw: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-indigo-300 font-mono"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300 cursor-pointer"
            >
              ← Back to Policy
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
            >
              Review & Publish →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & PUBLISH */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-xs text-indigo-300">
                  {courseCode}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{title}</h3>
              </div>
              <div className="text-right font-mono text-xs text-emerald-400">
                {questions.length} Questions • {totalPoints} Total Points • {durationMinutes} Mins
              </div>
            </div>
            <p className="text-xs text-slate-400">{description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                Auto-Submit Threshold: <strong>{maxStrikes} Strikes</strong>
              </span>
              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                Fullscreen Lock: <strong>{enforceFullscreen ? 'Required' : 'Optional'}</strong>
              </span>
              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                Clipboard & Shortcuts:{' '}
                <strong>{blockClipboard ? 'Blocked' : 'Permitted'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300 cursor-pointer"
            >
              ← Edit Questions
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              {submitting ? 'Publishing to Cohort...' : 'Publish Assessment to Student Dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
