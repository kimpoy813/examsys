import { NextRequest, NextResponse } from 'next/server';
import { forgiveSubmissionStrike } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }
    const updated = forgiveSubmissionStrike(body.submissionId);
    return NextResponse.json({ submission: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to forgive strike' },
      { status: 400 }
    );
  }
}
