import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// --- CONFIGURATION ---

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2
].filter(Boolean) as string[];

const DEEPSEEK_KEYS = [
  process.env.DEEPSEEK_API_KEY_1
].filter(Boolean) as string[];

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

// State to track current keys
let currentGroqIndex = 0;
let currentDeepseekIndex = 0;
let currentGeminiIndex = 0;

/**
 * Execute a function with API Key rotation on 429 errors.
 */
async function withKeyRotation<T>(
  keys: string[],
  currentIndexRef: { current: number },
  executeWithKey: (key: string) => Promise<T>,
  providerName: string
): Promise<T> {
  if (keys.length === 0) {
    throw new Error(`No API keys configured for ${providerName}`);
  }

  let attempts = 0;
  const maxAttempts = keys.length;

  while (attempts < maxAttempts) {
    const key = keys[currentIndexRef.current];
    try {
      return await executeWithKey(key);
    } catch (error: any) {
      const status = error?.status || error?.response?.status || error?.code;
      if (status === 429 && keys.length > 1) {
        console.warn(`[${providerName}] Key ${currentIndexRef.current + 1} hit 429 rate limit. Rotating...`);
        currentIndexRef.current = (currentIndexRef.current + 1) % keys.length;
        attempts++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`[${providerName}] All API keys exhausted their rate limits (429).`);
}

// --- PROVIDER IMPLEMENTATIONS ---

/**
 * GROQ: Ultra-low latency for What-If sliders.
 * Model: llama3-8b-8192
 */
export async function generateFastResponse(prompt: string): Promise<string> {
  const indexRef = { current: currentGroqIndex };
  
  return withKeyRotation(GROQ_KEYS, indexRef, async (apiKey) => {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.5,
      max_tokens: 512,
    });
    // Sync the global index after success
    currentGroqIndex = indexRef.current;
    return completion.choices[0]?.message?.content || '';
  }, 'Groq');
}

/**
 * DEEPSEEK: High-quality reasoning for Insights generation.
 * Model: deepseek-chat
 */
export async function generateDeepInsight(prompt: string): Promise<string> {
  const indexRef = { current: currentDeepseekIndex };
  
  return withKeyRotation(DEEPSEEK_KEYS, indexRef, async (apiKey) => {
    const openai = new OpenAI({ 
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey 
    });
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'deepseek-chat',
      temperature: 0.65,
      max_tokens: 1024,
    });
    currentDeepseekIndex = indexRef.current;
    return completion.choices[0]?.message?.content || '';
  }, 'DeepSeek');
}

/**
 * GEMINI: Multimodal & text fallback.
 * Model: gemini-3.1-flash-lite
 */
export async function generateGeminiContent(prompt: string): Promise<string> {
  const indexRef = { current: currentGeminiIndex };
  
  return withKeyRotation(GEMINI_KEYS, indexRef, async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        maxOutputTokens: 1024,
        temperature: 0.65,
      },
    });
    currentGeminiIndex = indexRef.current;
    return response.text ?? '';
  }, 'Gemini');
}

/**
 * GEMINI JSON extraction helper (replaces generateJSON in gemini.ts)
 */
export async function generateGeminiJSON<T>(prompt: string): Promise<T> {
  const text = await generateGeminiContent(prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

/**
 * DEEPSEEK JSON extraction helper
 */
export async function generateDeepInsightJSON<T>(prompt: string): Promise<T> {
  const text = await generateDeepInsight(prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as T;
}
/**
 * GEMINI: Multimodal fallback.
 */
export async function generateMultimodalGeminiContent(contents: any[], responseMimeType?: string): Promise<string> {
  const indexRef = { current: currentGeminiIndex };
  
  return withKeyRotation(GEMINI_KEYS, indexRef, async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    const config: any = { maxOutputTokens: 2048, temperature: 0.2 };
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config,
    });
    currentGeminiIndex = indexRef.current;
    return response.text ?? '';
  }, 'Gemini');
}
