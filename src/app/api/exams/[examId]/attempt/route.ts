import { NextRequest, NextResponse } from 'next/server';
import {
  finalizeSubmission,
  resetStudentExamAttempt,
  saveStudentAnswers,
  startOrResumeSubmission,
} from '@/lib/store';
import { SubmissionStatus } from '@/types/exam';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await req.json().catch(() => ({}));
    const studentName = body.studentName || 'Student';
    const studentEmail = body.studentEmail;

    if (body.reset === true) {
      const data = resetStudentExamAttempt(examId, studentName, studentEmail);
      return NextResponse.json(data);
    }

    const data = startOrResumeSubmission(examId, studentName, studentEmail);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to start exam attempt' },
      { status: 400 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await req.json();
    const { submissionId, answers } = body;

    const updated = saveStudentAnswers(examId, submissionId, answers || {});
    return NextResponse.json({ submission: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Autosave failed' },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await req.json();
    const { submissionId, status, answers } = body;

    const finalStatus: SubmissionStatus = status || 'GRADED';
    const result = finalizeSubmission(examId, submissionId, finalStatus, answers);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit exam' },
      { status: 400 }
    );
  }
}
