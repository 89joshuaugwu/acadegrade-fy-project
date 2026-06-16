import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
// pdf-parse is required dynamically inside the handler

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `${PROMPT}\n\nDocument Text:\n${text}`,
            config: { responseMimeType: 'application/json' }
          });
          geminiResponse = response.text;
        } else {
          // Fallback to sending the PDF document directly to Gemini
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: [
              { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
              PROMPT
            ],
            config: { responseMimeType: 'application/json' }
          });
          geminiResponse = response.text;
        }
      } catch (pdfErr) {
        // If pdf-parse fails entirely, just send to Gemini
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
            PROMPT
          ],
          config: { responseMimeType: 'application/json' }
        });
        geminiResponse = response.text;
      }
    } else if (mimeType.startsWith('image/')) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          { inlineData: { data: base64Data, mimeType } },
          PROMPT
        ],
        config: { responseMimeType: 'application/json' }
      });
      geminiResponse = response.text;
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!geminiResponse) {
      throw new Error('No response from AI');
    }

    const courses = JSON.parse(geminiResponse);
    return NextResponse.json({ courses });

  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}
