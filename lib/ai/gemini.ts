/**
 * Gemini AI client — SERVER-SIDE ONLY
 * Used exclusively in app/api/ routes.
 * NEVER import this file in client components.
 *
 * Package: @google/genai v2.8.0
 * Model: gemini-2.5-flash-lite
 */
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Generate text content from Gemini.
 */
export async function generateContent(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.65,
    },
  });
  return response.text ?? '';
}

/**
 * Generate structured JSON content from Gemini.
 * Strips markdown backticks before parsing.
 */
export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await generateContent(prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as T;
}
