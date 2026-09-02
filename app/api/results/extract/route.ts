import { NextRequest, NextResponse } from 'next/server';
import { generateMultimodalGeminiContent } from '@/lib/ai/manager';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
// pdf-parse is required dynamically inside the handler

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const OCR_LIMITS = [
  { name: 'fifteen_minutes', limit: 5, windowMs: 15 * 60 * 1000 },
  { name: 'daily', limit: 20, windowMs: 24 * 60 * 60 * 1000 },
];

const PROMPT = `Extract course results from the provided academic result slip.
Return ONLY a JSON array of objects representing each course. 
Do not include markdown blocks or any other text.
Each object should have:
- code: string (e.g. "CSC 401")
- title: string (the name of the course)
- units: number
- caScore: number or null (if not found or is AR)
- examScore: number or null (if not found or is AR)
- isAR: boolean (true if grade is AR/Awaiting Result)

If the document contains no courses, return an empty array [].`;

export async function POST(req: NextRequest) {
  const timer = apiTimer();
  let uid: string | null = null;
  try {
    const verifiedUser = await getVerifiedApiUser(req);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    uid = verifiedUser.uid;

    const { base64Data, mimeType } = await req.json();

    if (typeof base64Data !== 'string' || typeof mimeType !== 'string' || !base64Data || !mimeType) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    // Base64 is about 4/3 the binary size; reject oversized payloads before decoding.
    if (base64Data.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 8) {
      return NextResponse.json({ error: 'Result file is too large. Maximum size is 10 MB.' }, { status: 413 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Invalid or oversized result file.' }, { status: 413 });
    }

    const rateLimit = await checkRateLimit(uid, 'results_extract', OCR_LIMITS);
    if (!rateLimit.allowed) {
      logApiCall({ endpoint: '/api/results/extract', category: 'extract', uid, status: 429, durationMs: timer(), provider: 'gemini', error: 'Per-user rate limit exceeded' });
      return rateLimitResponse(rateLimit, `Result scanning limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`);
    }

    let geminiResponse;

    if (mimeType === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        const text = data.text.trim();
        
        // Very basic check if text is "clean" (contains standard alphanumeric characters)
        const isClean = text.length > 50 && /[a-zA-Z0-9]/.test(text);

        if (isClean) {
          // Use cheaper text-only extraction
          geminiResponse = await generateMultimodalGeminiContent([`${PROMPT}\n\nDocument Text:\n${text}`], 'application/json');
        } else {
          // Fallback to sending the PDF document directly to Gemini
          geminiResponse = await generateMultimodalGeminiContent([
            { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
            PROMPT
          ], 'application/json');
        }
      } catch (pdfErr) {
        // If pdf-parse fails entirely, just send to Gemini
        geminiResponse = await generateMultimodalGeminiContent([
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          PROMPT
        ], 'application/json');
      }
    } else if (mimeType.startsWith('image/')) {
      geminiResponse = await generateMultimodalGeminiContent([
        { inlineData: { data: base64Data, mimeType } },
        PROMPT
      ], 'application/json');
    }

    if (!geminiResponse) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(geminiResponse);
    if (!Array.isArray(parsed)) throw new Error('AI returned an invalid course list.');
    const courses = parsed.slice(0, 100);
    logApiCall({ endpoint: '/api/results/extract', category: 'extract', uid, status: 200, durationMs: timer(), provider: 'gemini' });
    return NextResponse.json({ courses }, { headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } });

  } catch (error: any) {
    console.error('Extract error:', error);
    logApiCall({ endpoint: '/api/results/extract', category: 'extract', uid, status: 500, durationMs: timer(), provider: 'gemini', error: error?.message });
    return NextResponse.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}
