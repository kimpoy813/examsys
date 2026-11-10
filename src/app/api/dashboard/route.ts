import { NextRequest, NextResponse } from 'next/server';
import { createNewExam, deleteExamById, getDashboardSnapshot } from '@/lib/store';

export async function GET(req: NextRequest) {
  const studentName = req.nextUrl.searchParams.get('studentName') || undefined;
  const studentEmail = req.nextUrl.searchParams.get('studentEmail') || undefined;
  const snapshot = getDashboardSnapshot(studentName, studentEmail);
  return NextResponse.json(snapshot);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an exam title and at least one question.' },
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

export async function DELETE(req: NextRequest) {
  try {
    const examId = req.nextUrl.searchParams.get('examId');
    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 });
    }
    deleteExamById(examId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete exam' },
      { status: 500 }
    );
  }
}
