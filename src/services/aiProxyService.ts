/**
 * AI Proxy Service — Client-side bridge to server-enforced AI
 *
 * All AI calls should route through this service instead of calling
 * OpenAI directly. The Supabase Edge Function validates the user's
 * tier, enforces rate limits, and proxies to OpenAI.
 *
 * This is the client-side counterpart to supabase/functions/ai-proxy.
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type AIFeature =
  | 'bartender_chat'
  | 'recipe_generation'
  | 'taste_match'
  | 'optimize_my_bar'
  | 'hosting_basic'
  | 'hosting_planner'     // backward-compat alias for hosting_basic
  | 'hosting_advanced'
  | 'predictive_engine'
  | 'remix_engine'
  | 'flavor_correction';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProxyResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  dailyUsage: number;
  dailyLimit: number;
}

export interface AIProxyError {
  error: string;
  statusCode: number;
}

// ============================================================================
// CORE
// ============================================================================

/**
 * Send a message through the tier-enforced AI proxy.
 *
 * @param feature - Which AI feature is being used (for tier validation)
 * @param messages - Conversation messages
 * @param systemPrompt - Optional system prompt
 * @returns AI response or throws with error details
 */
export async function sendAIMessage(
  feature: AIFeature,
  messages: AIMessage[],
  systemPrompt?: string
): Promise<AIProxyResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new AIProxyRequestError('Not authenticated', 401);
    }

    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { feature, messages, systemPrompt },
    });

    if (error) {
      log.error('AIProxy', 'Edge function error', error);

      // Parse the error for specific cases
      if (error.message?.includes('429') || error.message?.includes('limit')) {
        throw new AIProxyRequestError('Daily message limit reached. Upgrade for more.', 429);
      }
      if (error.message?.includes('403') || error.message?.includes('requires')) {
        throw new AIProxyRequestError('This feature requires a higher tier.', 403);
      }
      if (error.message?.includes('401')) {
        throw new AIProxyRequestError('Session expired. Please sign in again.', 401);
      }

      throw new AIProxyRequestError(error.message || 'AI service error', 500);
    }

    return data as AIProxyResponse;
  } catch (err) {
    if (err instanceof AIProxyRequestError) throw err;

    log.error('AIProxy', 'Unexpected error', err);
    throw new AIProxyRequestError('Failed to reach AI service', 500);
  }
}

/**
 * Check current AI usage without making a request.
 */
export async function getAIUsageStatus(feature: AIFeature): Promise<{
  dailyUsage: number;
  dailyLimit: number;
  canSend: boolean;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { dailyUsage: 0, dailyLimit: 3, canSend: false };
    }

    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { feature, messages: [], checkUsageOnly: true },
    });

    if (error || !data) {
      return { dailyUsage: 0, dailyLimit: 3, canSend: true };
    }

    return {
      dailyUsage: data.dailyUsage ?? 0,
      dailyLimit: data.dailyLimit ?? 3,
      canSend: (data.dailyUsage ?? 0) < (data.dailyLimit ?? 3),
    };
  } catch {
    return { dailyUsage: 0, dailyLimit: 3, canSend: true };
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class AIProxyRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AIProxyRequestError';
    this.statusCode = statusCode;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isTierBlocked(): boolean {
    return this.statusCode === 403;
  }

  get isAuthError(): boolean {
    return this.statusCode === 401;
  }
}
