import { NextRequest, NextResponse } from 'next/server';
import { createNewExam, getDashboardSnapshot } from '@/lib/store';
import { isNeonConfigured } from '@/db';

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId') || 'student-alex';
  const snapshot = getDashboardSnapshot(studentId);
  return NextResponse.json({
    ...snapshot,
    infrastructure: {
      runtime: 'Vercel Serverless / Next.js 15 App Router',
      databaseMode: isNeonConfigured ? 'Neon Serverless Postgres (Connected)' : 'Neon Ready (Seeded In-Memory Pool)',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { error: 'Exam title and at least one question are required.' },
        { status: 400 }
      );
    }
    const created = createNewExam(body);
    return NextResponse.json({ exam: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create exam' },
      { status: 500 }
    );
  }
}
