import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExamSys — Minimalist Online Assessment & Proctoring',
  description:
    'Clean, distraction-free student examination and proctoring platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
