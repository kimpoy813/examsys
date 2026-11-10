import { NextRequest, NextResponse } from 'next/server';
import { recordProctoringViolation } from '@/lib/store';
import { ViolationType } from '@/types/exam';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await req.json();

    const result = recordProctoringViolation({
      examId,
      submissionId: body.submissionId,
      violationType: (body.violationType as ViolationType) || 'TAB_SWITCH',
      countsTowardStrike: Boolean(body.countsTowardStrike),
      description: body.description || 'Proctoring security event detected.',
      clientTimestamp: body.clientTimestamp || new Date().toISOString(),
      metadata: body.metadata || {},
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to log proctoring event' },
      { status: 400 }
    );
  }
}
