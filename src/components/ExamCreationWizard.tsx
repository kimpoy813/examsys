'use client';

import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { QuestionType } from '@/types/exam';

interface DraftQuestion {
  topicName: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  acceptedAnswersRaw: string;
  keywordsRaw: string;
}

interface ExamCreationWizardProps {
  onExamCreated: () => void;
  onCancel?: () => void;
}

function createEmptyQuestion(type: QuestionType = 'MCQ'): DraftQuestion {
  return {
    topicName: '',
    type,
    prompt: '',
    points: 10,
    options:
      type === 'MCQ'
        ? [
            { id: 'opt-1', text: '' },
            { id: 'opt-2', text: '' },
            { id: 'opt-3', text: '' },
            { id: 'opt-4', text: '' },
          ]
        : [],
    correctOptionId: 'opt-1',
    acceptedAnswersRaw: '',
    keywordsRaw: '',
  };
}

export function ExamCreationWizard({ onExamCreated, onCancel }: ExamCreationWizardProps) {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [enforceFullscreen, setEnforceFullscreen] = useState(true);
  const [blockClipboard, setBlockClipboard] = useState(true);

  const [questions, setQuestions] = useState<DraftQuestion[]>([createEmptyQuestion('MCQ')]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [...prev, createEmptyQuestion(type)]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const updated = { ...q, ...patch };
        if (patch.type === 'MCQ' && updated.options.length === 0) {
          updated.options = [
            { id: 'opt-1', text: '' },
            { id: 'opt-2', text: '' },
            { id: 'opt-3', text: '' },
            { id: 'opt-4', text: '' },
          ];
          updated.correctOptionId = 'opt-1';
        }
        return updated;
      })
    );
  };

  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter an exam title.');
      return;
    }

    const hasEmptyPrompt = questions.some((q) => !q.prompt.trim());
    if (hasEmptyPrompt) {
      setError('Please enter a prompt for every question.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        courseCode: courseCode.trim() || 'GENERAL',
        description: description.trim(),
        durationMinutes,
        maxStrikes,
        enforceFullscreen,
        blockClipboard,
        questions: questions.map((q) => ({
          topicName: q.topicName.trim() || 'General',
          type: q.type,
          prompt: q.prompt.trim(),
          points: Number(q.points) || 10,
          options:
            q.type === 'MCQ'
              ? q.options.map((o, idx) => ({
                  id: o.id,
                  text: o.text.trim() || `Option ${idx + 1}`,
                }))
              : undefined,
          correctOptionId: q.type === 'MCQ' ? q.correctOptionId : undefined,
          acceptedAnswers:
            q.type === 'SHORT_ANSWER'
              ? q.acceptedAnswersRaw
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
          keywords:
            q.type === 'ESSAY'
              ? q.keywordsRaw
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
        })),
      };

      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to publish exam.');
        return;
      }

      onExamCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handlePublish}
      className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-8"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Create Exam</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure exam details, proctoring rules, and questions.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Basic Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Exam Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Midterm Examination"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Course / Subject
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g., CS 101"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            Instructions (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief instructions for students..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
          />
        </div>

        {/* Settings & Proctoring */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Auto-Submit Strike Limit
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxStrikes}
              onChange={(e) => setMaxStrikes(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={enforceFullscreen}
              onChange={(e) => setEnforceFullscreen(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            Enforce fullscreen mode
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={blockClipboard}
              onChange={(e) => setBlockClipboard(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            Disable copy, paste & right-click
          </label>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4 border-t border-zinc-100 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Questions ({questions.length})
            </h3>
            <p className="text-xs text-zinc-500">Total: {totalPoints} points</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => addQuestion('MCQ')}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => addQuestion('SHORT_ANSWER')}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Short Answer
            </button>
            <button
              type="button"
              onClick={() => addQuestion('ESSAY')}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Essay
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900">#{idx + 1}</span>
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestion(idx, { type: e.target.value as QuestionType })
                    }
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 focus:border-zinc-900 focus:outline-none"
                  >
                    <option value="MCQ">Multiple Choice</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="ESSAY">Essay</option>
                  </select>
                  <input
                    type="text"
                    value={q.topicName}
                    onChange={(e) => updateQuestion(idx, { topicName: e.target.value })}
                    placeholder="Topic tag (e.g., Algebra)"
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.points}
                    onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) })}
                    className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 text-right focus:border-zinc-900 focus:outline-none"
                  />
                  <span className="text-xs text-zinc-500">pts</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-1 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                      title="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={2}
                required
                value={q.prompt}
                onChange={(e) => updateQuestion(idx, { prompt: e.target.value })}
                placeholder="Write the question prompt..."
                className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
              />

              {q.type === 'MCQ' && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-medium text-zinc-500">
                    Choices (select the correct answer):
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 ${
                          q.correctOptionId === opt.id
                            ? 'border-zinc-900 ring-1 ring-zinc-900'
                            : 'border-zinc-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-opt-${idx}`}
                          checked={q.correctOptionId === opt.id}
                          onChange={() => updateQuestion(idx, { correctOptionId: opt.id })}
                          className="h-3.5 w-3.5 accent-zinc-900 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const next = [...q.options];
                            next[oIdx] = { ...opt, text: e.target.value };
                            updateQuestion(idx, { options: next });
                          }}
                          placeholder={`Option ${oIdx + 1}`}
                          className="w-full text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.type === 'SHORT_ANSWER' && (
                <div>
                  <input
                    type="text"
                    value={q.acceptedAnswersRaw}
                    onChange={(e) =>
                      updateQuestion(idx, { acceptedAnswersRaw: e.target.value })
                    }
                    placeholder="Expected answer(s), comma-separated (optional)"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              )}

              {q.type === 'ESSAY' && (
                <div>
                  <input
                    type="text"
                    value={q.keywordsRaw}
                    onChange={(e) => updateQuestion(idx, { keywordsRaw: e.target.value })}
                    placeholder="Grading keywords/concepts, comma-separated (optional)"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {submitting ? 'Publishing...' : 'Publish Exam'}
        </button>
      </div>
    </form>
  );
}
