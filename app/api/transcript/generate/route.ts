import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: 'Transcript generation route — implementation in Phase 8' },
    { status: 501 }
  );
}
