import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: 'Notification send route — implementation in Phase 10' },
    { status: 501 }
  );
}
