/**
 * Bartender AI Assistant Service
 * Handles chat conversations, rate limiting, and recipe suggestions
 */

import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import type { UserInventoryItem } from '../types/database';

// OpenAI client (same as AI recipe generation)
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
});

// Tier limits
const MESSAGE_LIMITS = {
  FREE: 10,
  PLUS: 50,
  PRO: 999999, // Unlimited
} as const;

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
 * Check if API key is valid
 */
function isValidApiKey(apiKey: string | undefined): boolean {
  return !!apiKey && apiKey.length > 0 && !apiKey.includes('PLACEHOLDER');
}

/**
 * Check if we're in development mode (no valid API key)
 */
function isDevelopmentMode(): boolean {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return !isValidApiKey(apiKey);
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
 * Check daily usage and remaining messages
 */
export async function checkUsageStatus(
  userId: string,
  tier: 'FREE' | 'PLUS' | 'PRO'
): Promise<UsageStatus> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from('bartender_chat_usage')
      .select('message_count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const messagesUsed = data?.message_count || 0;
    const limit = MESSAGE_LIMITS[tier];
    const messagesRemaining = Math.max(0, limit - messagesUsed);

    return {
      messagesUsed,
      messagesRemaining,
      limit,
      canSendMessage: messagesRemaining > 0,
    };
  } catch (error) {
    log.error('bartenderAssistant', 'Error checking usage', error);
    // Default to allowing message if error (fail open)
    return {
      messagesUsed: 0,
      messagesRemaining: MESSAGE_LIMITS[tier],
      limit: MESSAGE_LIMITS[tier],
      canSendMessage: true,
    };
  }
}

/**
 * Increment usage counter
 */
async function incrementUsage(userId: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Upsert (insert or update)
    const { error } = await supabase
      .from('bartender_chat_usage')
      .upsert({
        user_id: userId,
        date: today,
        message_count: 1,
        last_message_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date',
        // If row exists, increment count
      });

    if (!error) {
      // If upsert succeeded, increment the count
      await supabase.rpc('increment_bartender_usage', {
        p_user_id: userId,
        p_date: today,
      }).catch(() => {
        // Fallback: manual increment
        supabase
          .from('bartender_chat_usage')
          .update({
            message_count: supabase.raw('message_count + 1'),
            last_message_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('date', today);
      });
    }
  } catch (error) {
    log.error('bartenderAssistant', 'Error incrementing usage', error);
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

    // Check rate limit
    const usage = await checkUsageStatus(userId, tier);
    if (!usage.canSendMessage) {
      return {
        response: '',
        error: `You've reached your daily limit of ${usage.limit} messages. Upgrade to Koope ${tier === 'FREE' ? 'Plus' : 'Pro'} for more!`,
      };
    }

    // Get conversation history
    const memoryLimit = CONVERSATION_MEMORY[tier];
    const history = await getConversationHistory(userId, memoryLimit);

    // Build messages array for OpenAI
    const systemPrompt = buildSystemPrompt(userInventory, tier);
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message },
    ];

    // Save user message
    await saveMessage(userId, 'user', message);

    // Increment usage counter
    await incrementUsage(userId);

    let assistantResponse: string;

    // Development mode: use mock response
    if (isDevelopmentMode()) {
      log.info('bartenderAssistant', 'Using mock response (dev mode)');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

      assistantResponse = `Based on your inventory, I can suggest a classic cocktail! 🍸 Try a refreshing drink with what you have. Need help with techniques or substitutions?`;
    } else {
      // Production mode: call OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Faster and cheaper for chat
        messages,
        temperature: 0.7,
        max_tokens: 200, // Keep responses concise
      });

      assistantResponse = completion.choices[0]?.message?.content || 'Sorry, I had trouble responding. Please try again.';
    }

    // Save assistant response
    await saveMessage(userId, 'assistant', assistantResponse);

    return { response: assistantResponse };
  } catch (error: any) {
    log.error('bartenderAssistant', 'Error sending message', error);
    return {
      response: '',
      error: 'Sorry, I encountered an error. Please try again.',
    };
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
