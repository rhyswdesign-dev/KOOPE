/**
 * Bartender AI Assistant Service
 * Handles chat conversations and recipe suggestions.
 * All AI calls route through the ai-proxy Edge Function — the OpenAI key
 * never touches the client bundle.
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { sendAIMessage, getAIUsageStatus, AIProxyRequestError } from './aiProxyService';
import type { UserInventoryItem } from '../types/database';

const CONVERSATION_MEMORY = {
  FREE: 3,
  PLUS: 10,
  PRO: 20,
} as const;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UsageStatus {
  messagesUsed: number;
  messagesRemaining: number;
  limit: number;
  canSendMessage: boolean;
}

/**
 * Build system prompt with user context
 */
function buildSystemPrompt(userInventory: UserInventoryItem[], tier: 'FREE' | 'PLUS' | 'PRO'): string {
  const inventoryList = userInventory.length > 0
    ? userInventory.map(item => item.item_name).join(', ')
    : 'None yet';

  const improvementFeature = tier === 'PLUS' || tier === 'PRO'
    ? `\n\nWhen asked "Want to improve your inventory?" or similar, suggest 3 high-impact ingredients (syrups, infusions, or bitters) that would unlock many new cocktails. Provide DIY recipes for syrups/infusions.`
    : '';

  return `You are a professional bartender assistant helping users make cocktails.

User's current inventory: ${inventoryList}
User tier: ${tier}

Guidelines:
- Keep responses concise (under 150 words)
- Recommend recipes they can make with their inventory
- Suggest ingredient substitutions when asked
- Explain techniques briefly
- Be friendly and encouraging
- When suggesting recipes, use format: "🍸 Recipe Name: brief description"${improvementFeature}

IMPORTANT: Only suggest cocktails they can make with ingredients in their inventory. If they ask for something they can't make, suggest the closest alternative they CAN make, or tell them what's missing.`;
}

/**
 * Get conversation history for user
 */
export async function getConversationHistory(
  userId: string,
  limit: number = 10
): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('bartender_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('bartenderAssistant', 'Error fetching history', error);
      return [];
    }

    // Reverse to get chronological order (oldest first)
    return (data || []).reverse() as ChatMessage[];
  } catch (error) {
    log.error('bartenderAssistant', 'Error in getConversationHistory', error);
    return [];
  }
}

/**
 * Check daily usage via the proxy — returns the same shape as before
 * so callers don't need to change.
 */
export async function checkUsageStatus(
  _userId: string,
  _tier: 'FREE' | 'PLUS' | 'PRO'
): Promise<UsageStatus> {
  try {
    const status = await getAIUsageStatus('bartender_chat');
    return {
      messagesUsed: status.dailyUsage,
      messagesRemaining: status.dailyLimit - status.dailyUsage,
      limit: status.dailyLimit,
      canSendMessage: status.canSend,
    };
  } catch {
    return { messagesUsed: 0, messagesRemaining: 3, limit: 3, canSendMessage: true };
  }
}

/**
 * Save message to database
 */
async function saveMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    await supabase.from('bartender_chat_messages').insert({
      user_id: userId,
      role,
      content,
    });
  } catch (error) {
    log.error('bartenderAssistant', 'Error saving message', error);
  }
}

/**
 * Send message to AI bartender
 */
export async function sendMessage(params: {
  userId: string;
  message: string;
  userInventory: UserInventoryItem[];
  tier: 'FREE' | 'PLUS' | 'PRO';
}): Promise<{ response: string; error?: string }> {
  const { userId, message, userInventory, tier } = params;

  try {
    log.info('bartenderAssistant', 'Sending message', { userId, tier });

    // Get conversation history
    const memoryLimit = CONVERSATION_MEMORY[tier];
    const history = await getConversationHistory(userId, memoryLimit);

    // Build conversation for the proxy
    const systemPrompt = buildSystemPrompt(userInventory, tier);
    const messages = [
      ...history.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
      { role: 'user' as const, content: message },
    ];

    // Save user message before calling the proxy
    await saveMessage(userId, 'user', message);

    // Route through the server-side proxy (handles auth, tier, rate limits)
    const result = await sendAIMessage('bartender_chat', messages, systemPrompt);
    const assistantResponse = result.content || 'Sorry, I had trouble responding. Please try again.';

    // Save assistant response
    await saveMessage(userId, 'assistant', assistantResponse);

    return { response: assistantResponse };
  } catch (error: any) {
    log.error('bartenderAssistant', 'Error sending message', error);

    if (error instanceof AIProxyRequestError) {
      if (error.isRateLimited) {
        return { response: '', error: 'Daily message limit reached. Upgrade for more!' };
      }
      if (error.isTierBlocked) {
        return { response: '', error: 'This feature requires a higher tier.' };
      }
      if (error.isAuthError) {
        return { response: '', error: 'Session expired. Please sign in again.' };
      }
    }

    return { response: '', error: 'Sorry, I encountered an error. Please try again.' };
  }
}

/**
 * Clear conversation history for user
 */
export async function clearConversation(userId: string): Promise<void> {
  try {
    await supabase
      .from('bartender_chat_messages')
      .delete()
      .eq('user_id', userId);

    log.info('bartenderAssistant', 'Cleared conversation', { userId });
  } catch (error) {
    log.error('bartenderAssistant', 'Error clearing conversation', error);
  }
}

/**
 * Get suggested prompts based on tier
 */
export function getSuggestedPrompts(tier: 'FREE' | 'PLUS' | 'PRO'): string[] {
  const base = [
    "What can I make?",
    "Substitute for lime juice?",
  ];

  if (tier === 'PLUS' || tier === 'PRO') {
    return [
      ...base,
      "Want to improve your inventory?",
    ];
  }

  return base;
}
