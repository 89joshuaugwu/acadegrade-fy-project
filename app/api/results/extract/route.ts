import { NextRequest, NextResponse } from 'next/server';
import { generateMultimodalGeminiContent } from '@/lib/ai/manager';
import { logApiCall, apiTimer } from '@/lib/api/logger';
// pdf-parse is required dynamically inside the handler

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
  try {
    const timer = apiTimer();
    const { base64Data, mimeType } = await req.json();

    if (!base64Data || !mimeType) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
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
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!geminiResponse) {
      throw new Error('No response from AI');
    }

    const courses = JSON.parse(geminiResponse);
    logApiCall({ endpoint: '/api/results/extract', category: 'extract', uid: null, status: 200, durationMs: timer(), provider: 'gemini' });
    return NextResponse.json({ courses });

  } catch (error: any) {
    console.error('Extract error:', error);
    logApiCall({ endpoint: '/api/results/extract', category: 'extract', uid: null, status: 500, durationMs: 0, provider: 'gemini', error: error?.message });
    return NextResponse.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}
