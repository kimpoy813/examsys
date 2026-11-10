# Technical Specification & System Architecture: ExamSys

**Target Infrastructure:** Vercel (Edge & Serverless Compute) + Neon (Serverless PostgreSQL)

## 1. System Design & Stack

- **Frontend & Backend Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) + Drizzle ORM (`src/db/schema.ts`, `db/schema.sql`)
- **Proctoring Security Engine:** `src/lib/proctoring/ExamProctorGuard.ts`
  - **No Copy-Pasting:** Intercepts `contextmenu`, `selectstart`, `copy`, `cut`, `paste`, `dragstart`, `drop`, and keyboard shortcuts (`Ctrl/Cmd + C, V, X, P, S, F, U`, `F12`, `Ctrl+Shift+I/J/C`) in the DOM capture phase.
  - **Tab & Window Switching Detection:** Monitors `document.visibilitychange` (`hidden`) and `window.blur` with a **1,500ms deduplication window** so simultaneous browser focus events count as a single strike.
  - **Fullscreen Enforcement:** Requests Fullscreen via `Element.requestFullscreen({ navigationUI: 'hide' })` on exam start, locks the viewport behind a blur overlay if exited, and auto-submits the exam on the 3rd strike (`AUTO_SUBMITTED_VIOLATION`).

## 2. Database Schema

See [`db/schema.sql`](./db/schema.sql) for the full Neon PostgreSQL DDL and [`src/db/schema.ts`](./src/db/schema.ts) for the Drizzle ORM schema covering:
1. `users` (`STUDENT`, `TEACHER`, `ADMIN`)
2. `topics` (Curriculum competency benchmarks)
3. `exams` (Duration, proctoring rules, `max_strikes`, `enforce_fullscreen`, `block_clipboard`)
4. `questions` (`MCQ`, `SHORT_ANSWER`, `ESSAY` with server-isolated `grading_key`)
5. `exam_submissions` (Server-authoritative `expires_at`, `strike_count`, `integrity_score`, `status`)
6. `submission_answers` (Per-question auto-graded and rubric-graded responses)
7. `proctoring_logs` (Immutable append-only audit log of all security events)
