import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExamSys — Proctored Student Assessment & Analytics Platform (Vercel + Neon)',
  description:
    'Online Student Examination, Anti-Cheating Proctoring & Learning Gap Analytics Platform built with Next.js App Router and Neon Serverless Postgres.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
