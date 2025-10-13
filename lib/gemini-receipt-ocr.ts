import { GoogleGenAI, Type } from '@google/genai';
import { captureLLMEvent } from '@/lib/posthog/server';

export interface ExtractedReceiptData {
  vendor: string | null;
  total: number | null;
  date: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

export interface GeminiTrackingContext {
  distinctId: string;
  traceId?: string;
  orgId?: string;
}

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    vendor: { type: Type.STRING, description: 'Merchant/vendor name' },
    total: { type: Type.NUMBER, description: 'Final total amount (numeric only)' },
    date: { type: Type.STRING, description: 'Transaction date in YYYY-MM-DD format' },
    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
  },
  required: ['vendor', 'total', 'date'],
};

const RECEIPT_PROMPT = `
Analyze this receipt image and extract the following information:
1. Vendor/Merchant name
2. Transaction date (convert to YYYY-MM-DD)
3. Total amount (final/grand total as a number)

Rules:
- For dates: Convert any format to YYYY-MM-DD
- For total: Extract only the final total (not subtotal or tax)
- For vendor: Use the business name (not address)
- If blurry, make your best inference
- Return null only if truly unreadable
- Include confidence level (high/medium/low)
- Respond using a single JSON object that matches this shape:
  {"vendor": string|null, "total": number|null, "date": "YYYY-MM-DD"|null, "confidence": "high"|"medium"|"low"|null}
`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

const modelName = process.env.GEMINI_RECEIPT_MODEL || 'gemini-flash-latest';

let client: GoogleGenAI | null = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your environment variables.');
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return client;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeTotal(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const isoMatch = value.trim().match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }

  return null;
}

function normalizeVendor(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function normalizeConfidence(value: unknown): ExtractedReceiptData['confidence'] {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return undefined;
}

async function callGemini({
  fileBuffer,
  mimeType,
}: {
  fileBuffer: Buffer;
  mimeType: string;
}) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: 'user',
        parts: [
          { text: RECEIPT_PROMPT },
          {
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      topP: 0.8,
      responseSchema: receiptSchema,
      responseMimeType: 'application/json',
    },
  });

  const text =
    response.text ??
    response.candidates?.[0]?.content?.parts?.reduce((acc, part) => {
      if (typeof part.text === 'string' && part.text.length > 0) {
        return acc + part.text;
      }
      return acc;
    }, '');

  if (!text) {
    throw new Error('Gemini OCR response was empty.');
  }

  return JSON.parse(text) as Partial<ExtractedReceiptData>;
}

export async function processReceiptWithGemini({
  fileBuffer,
  mimeType,
  trackingContext,
}: {
  fileBuffer: Buffer;
  mimeType: string;
  trackingContext?: GeminiTrackingContext;
}): Promise<ExtractedReceiptData> {
  let lastError: unknown;
  const startTime = performance.now();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const rawResult = await callGemini({ fileBuffer, mimeType });

      const normalized: ExtractedReceiptData = {
        vendor: normalizeVendor(rawResult.vendor) ?? null,
        total: normalizeTotal(rawResult.total) ?? null,
        date: normalizeDate(rawResult.date) ?? null,
        confidence: normalizeConfidence(rawResult.confidence),
      };

      console.debug('[Gemini OCR] Extraction success', {
        attempt,
        vendor: normalized.vendor,
        total: normalized.total,
        date: normalized.date,
        confidence: normalized.confidence,
      });

      if (!normalized.vendor && !normalized.total && !normalized.date) {
        throw new Error('Gemini OCR returned empty data.');
      }

      // Track successful LLM call with PostHog
      if (trackingContext) {
        const latencyMs = performance.now() - startTime;
        // Gemini Flash pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens
        // Rough estimate: 1 image ≈ 258 tokens, output ≈ 50 tokens
        const estimatedInputTokens = 258;
        const estimatedOutputTokens = 50;
        const inputCost = (estimatedInputTokens / 1_000_000) * 0.075;
        const outputCost = (estimatedOutputTokens / 1_000_000) * 0.30;
        const totalCost = inputCost + outputCost;

        captureLLMEvent({
          distinctId: trackingContext.distinctId,
          traceId: trackingContext.traceId || `receipt_scan_${Date.now()}`,
          model: modelName,
          provider: 'gemini',
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          totalCostUsd: totalCost,
          latencyMs,
          properties: {
            feature: 'receipt_ocr',
            attempt,
            confidence: normalized.confidence,
            has_vendor: !!normalized.vendor,
            has_total: !!normalized.total,
            has_date: !!normalized.date,
          },
          groups: trackingContext.orgId ? { company: trackingContext.orgId } : undefined,
        });
      }

      return normalized;
    } catch (error) {
      lastError = error;

      console.error('[Gemini OCR] Attempt failed', {
        attempt,
        error: error instanceof Error ? error.message : error,
      });

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        await sleep(delay);
      }
    }
  }

  console.error('[Gemini OCR] All attempts failed. Falling back to manual entry.', {
    error: lastError instanceof Error ? lastError.message : lastError,
  });

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : 'Failed to extract receipt data with Gemini OCR.'
  );
}

export const GeminiReceiptOcr = {
  processReceipt: processReceiptWithGemini,
  schema: receiptSchema,
  prompt: RECEIPT_PROMPT,
};
