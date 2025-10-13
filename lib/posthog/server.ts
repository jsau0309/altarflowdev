import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog client for tracking backend events and LLM analytics
 *
 * This is separate from the client-side PostHog (posthog-js) and is used for:
 * - LLM analytics (Gemini, OpenAI, Anthropic)
 * - Server-side event tracking
 * - Cost and performance monitoring
 *
 * Note: This client is a singleton and safe to use across multiple requests
 */

let posthogServerClient: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    console.warn('Server PostHog client should not be used on client-side');
    return null;
  }

  if (!posthogServerClient) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('PostHog API key not found. LLM analytics will not be tracked.');
      }
      return null;
    }

    posthogServerClient = new PostHog(apiKey, {
      host: apiHost,
      // Flush events every 30 seconds or when 10 events are queued
      flushAt: 10,
      flushInterval: 30000,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('PostHog server client initialized for LLM analytics');
    }
  }

  return posthogServerClient;
}

/**
 * Gracefully shutdown PostHog client
 * Call this when the server is shutting down to ensure all events are flushed
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogServerClient) {
    await posthogServerClient.shutdown();
    posthogServerClient = null;
  }
}

/**
 * Helper to capture LLM events with consistent formatting
 */
export interface LLMEventData {
  distinctId: string;
  traceId?: string;
  model: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  inputTokens?: number;
  outputTokens?: number;
  totalCostUsd?: number;
  latencyMs?: number;
  properties?: Record<string, unknown>;
  groups?: Record<string, string>;
}

export function captureLLMEvent(data: LLMEventData): void {
  const client = getServerPostHog();
  if (!client) return;

  client.capture({
    distinctId: data.distinctId,
    event: '$ai_generation',
    properties: {
      $ai_model: data.model,
      $ai_provider: data.provider,
      $ai_input_tokens: data.inputTokens,
      $ai_output_tokens: data.outputTokens,
      $ai_total_cost_usd: data.totalCostUsd,
      $ai_latency: data.latencyMs ? data.latencyMs / 1000 : undefined, // Convert to seconds
      $ai_trace_id: data.traceId,
      ...data.properties,
    },
    groups: data.groups,
  });
}
