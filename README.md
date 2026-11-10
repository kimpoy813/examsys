# ExamSys — Online Student Examination, Proctoring & Learning Analytics Platform

A production-ready **Student Examination, Anti-Cheating Proctoring, and Learning Gap Analytics System** built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Drizzle ORM**, and **Neon Serverless PostgreSQL** (`@neondatabase/serverless`).

---

## Key Features

### 1. User Roles & Dashboards
- **Student Dashboard:** Distraction-free portal showing upcoming proctored assessments, longitudinal performance growth (raw score + cohort Z-score), personalized topic mastery & learning gap diagnostics (`CRITICAL_GAP`, `DEVELOPING`, `MASTERED`), and detailed question-level rubric feedback.
- **Teacher Dashboard:**
  - **Live Proctoring & Strike Command Center:** Real-time submission roster with strike counters (`0/3`, `1/3`, `3/3 AUTO-SUBMITTED`), live immutable violation stream (`proctoring_logs`), and 1-click **"Forgive Strike & Reopen Exam"** override controls.
  - **Cohort Analytics & Topic Learning Gaps:** Class-wide average scores, completion rates, curriculum topic bottleneck detection, and student comparison matrix.
  - **Multi-Step Exam Creation Wizard:** Author and publish proctored assessments with **Multiple Choice (`MCQ`)**, **Short Answer (`SHORT_ANSWER`)**, and **Essay (`ESSAY`)** questions mapped to curriculum topics.

### 2. Anti-Cheating & Proctoring Engine (`src/lib/proctoring/ExamProctorGuard.ts`)
- **No Copy-Pasting:** Disables right-click context menus, text selection outside inputs, drag-and-drop, clipboard `copy`/`cut`/`paste` events, and `Ctrl/Cmd + C, V, X, P, S, F, U` & DevTools keyboard shortcuts in the capture phase.
- **Tab & Window Switching Detection:** Detects `document.visibilitychange` (`hidden`) and `window.blur` with a **1,500ms deduplication cooldown** so overlapping OS focus events count as a single strike.
- **Fullscreen Enforcement & 3-Strike Auto-Submit:** Forces fullscreen mode on exam launch, blurs the exam canvas behind a lockdown modal if exited, logs every event via `fetch(..., { keepalive: true })`, and automatically seals & grades the submission upon reaching 3 strikes (`AUTO_SUBMITTED_VIOLATION`).

---

## Quick Start

```bash
npm install
npm run dev
```

### Connecting to Neon Serverless Postgres on Vercel
1. Copy `.env.example` to `.env.local` and set your Neon pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings.
2. Push the schema to Neon:
   ```bash
   npm run db:push
   # or execute db/schema.sql directly in the Neon SQL Editor
   ```
3. Deploy to Vercel (`vercel deploy`). Even before `DATABASE_URL` is configured, the app runs seamlessly using its pre-seeded in-memory store for instant previewing and testing.
