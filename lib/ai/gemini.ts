/**
 * Gemini AI client — SERVER-SIDE ONLY
 * Used exclusively in app/api/ routes.
 * NEVER import this file in client components.
 *
 * Package: @google/genai v2.8.0
 * Model: gemini-3.1-flash-lite
 */
import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI;
try {
  // If the API key is missing (e.g. during build time), this will throw an error,
  // but we catch it here so the entire Next.js server doesn't crash on cold boot.
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
} catch (error) {
  console.warn("Gemini API key is missing or invalid. AI features will fail gracefully.");
}

/**
 * Generate text content from Gemini.
 */
export async function generateContent(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
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
