import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// --- CONFIGURATION ---

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2
].filter(Boolean) as string[];

const OPENROUTER_KEYS = [
  process.env.OPENROUTER_API_KEY
].filter(Boolean) as string[];

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

// State to track current keys
let currentGroqIndex = 0;
let currentOpenRouterIndex = 0;
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
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 512,
    });
    // Sync the global index after success
    currentGroqIndex = indexRef.current;
    return completion.choices[0]?.message?.content || '';
  }, 'Groq');
}

/**
 * ACADEMIND INSIGHTS ENGINE - HIGH AVAILABILITY CASCADE
 * 1st Try: openrouter/free (Auto-routes to best available free model)
 * 2nd Try: meta-llama/llama-3.3-70b-instruct:free (Direct attempt)
 * 3rd Try: Gemini Fallback (via INSIGHT_GEMINI_KEY)
 */
export async function generateDeepInsight(prompt: string): Promise<string> {
  const indexRef = { current: currentOpenRouterIndex };
  
  const attemptOpenRouter = async (modelSlug: string) => {
    return withKeyRotation(OPENROUTER_KEYS, indexRef, async (apiKey) => {
      const openai = new OpenAI({ 
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey 
      });
      const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: modelSlug,
        temperature: 0.65,
        max_tokens: 1024,
      });
      currentOpenRouterIndex = indexRef.current;
      return completion.choices[0]?.message?.content || '';
    }, 'OpenRouter');
  };

  try {
    // Try 1: OpenRouter Smart Auto-Router
    return await attemptOpenRouter('openrouter/free');
  } catch (err1) {
    console.warn('OpenRouter Auto failed (Try 1). Retrying with direct model...', err1);
    try {
      // Try 2: Direct model fallback on OpenRouter
      return await attemptOpenRouter('meta-llama/llama-3.3-70b-instruct:free');
    } catch (err2) {
      console.warn('OpenRouter completely failed (Try 2). Falling back to Gemini (Try 3)...', err2);
      // Try 3: Complete fallback to Google Gemini
      const fallbackKey = process.env.INSIGHT_GEMINI_KEY || process.env.GEMINI_API_KEY;
      if (!fallbackKey) throw new Error("All AI providers failed and no Gemini fallback key is available.");
      
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: fallbackKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: { maxOutputTokens: 1024, temperature: 0.65 },
      });
      return response.text ?? '';
    }
  }
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
