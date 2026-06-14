import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: 'AI insights route — implementation in Phase 7' },
    { status: 501 }
  );
}
