/**
 * Bartender AI Assistant Component
 * Floating chat interface for cocktail recommendations and help
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import type { UserInventoryItem } from '../types/database';
import * as BartenderService from '../services/bartenderAssistantService';

interface BartenderAssistantProps {
  userId: string;
  userInventory: UserInventoryItem[];
  tier: 'FREE' | 'PLUS' | 'PRO';
}

export default function BartenderAssistant({
  userId,
  userInventory,
  tier,
}: BartenderAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BartenderService.ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<BartenderService.UsageStatus | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
    checkUsage();
  }, [userId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isOpen]);

  // Animate chat open/close
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isOpen]);

  const loadHistory = async () => {
    const history = await BartenderService.getConversationHistory(userId);
    setMessages(history);
  };

  const checkUsage = async () => {
    const status = await BartenderService.checkUsageStatus(userId, tier);
    setUsage(status);
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMessage: BartenderService.ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const result = await BartenderService.sendMessage({
        userId,
        message: userMessage,
        userInventory,
        tier,
      });

      if (result.error) {
        // Show error as assistant message
        const errorMessage: BartenderService.ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: result.error,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        // Add assistant response
        const assistantMessage: BartenderService.ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.response,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Refresh usage
      await checkUsage();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    // Auto-send
    setTimeout(() => handleSend(), 100);
  };

  const handleClearChat = async () => {
    await BartenderService.clearConversation(userId);
    setMessages([]);
  };

  const suggestedPrompts = BartenderService.getSuggestedPrompts(tier);

  const chatTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0], // Slide up from bottom
  });

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <TouchableOpacity
          style={styles.floatingBubble}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color={colors.white} />
          {usage && usage.messagesRemaining < usage.limit && (
            <View style={styles.bubbleBadge}>
              <Text style={styles.bubbleBadgeText}>{usage.messagesRemaining}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatContainer,
            { transform: [{ translateY: chatTranslateY }] },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatInner}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="wine" size={24} color={colors.gold} />
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>Bartender Assistant</Text>
                  {usage && (
                    <Text style={styles.headerSubtitle}>
                      {usage.messagesRemaining} messages left today
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleClearChat} style={styles.headerButton}>
                  <Ionicons name="trash-outline" size={20} color={colors.subtext} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.headerButton}>
                  <Ionicons name="chevron-down" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.subtext} />
                  <Text style={styles.emptyTitle}>Ask me anything!</Text>
                  <Text style={styles.emptyDescription}>
                    Get recipe suggestions, substitutions, and cocktail tips.
                  </Text>
                </View>
              )}

              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  {message.role === 'assistant' && (
                    <Ionicons name="wine" size={16} color={colors.gold} style={styles.messageIcon} />
                  )}
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userText : styles.assistantText,
                  ]}>
                    {message.content}
                  </Text>
                </View>
              ))}

              {loading && (
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color={colors.gold} />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Quick Prompts */}
            {messages.length === 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.promptsScroll}
                contentContainerStyle={styles.promptsContent}
              >
                {suggestedPrompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.promptChip}
                    onPress={() => handleQuickPrompt(prompt)}
                  >
                    <Text style={styles.promptText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ask about cocktails..."
                placeholderTextColor={colors.subtext}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || loading}
              >
                <Ionicons
                  name={loading ? 'hourglass' : 'send'}
                  size={20}
                  color={inputText.trim() && !loading ? colors.white : colors.subtext}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatingBubble: {
    position: 'absolute',
    bottom: spacing(3),
    right: spacing(3),
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  bubbleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.5),
  },
  bubbleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1000,
  },
  chatInner: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: spacing(0.25),
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing(3),
    paddingBottom: spacing(2),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(6),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(1),
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: radii.lg,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.gold,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    flexDirection: 'row',
    gap: spacing(1),
  },
  messageIcon: {
    marginTop: spacing(0.25),
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  userText: {
    color: colors.white,
    fontWeight: '500',
  },
  assistantText: {
    color: colors.text,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  typingText: {
    fontSize: 14,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  promptsScroll: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  promptsContent: {
    padding: spacing(2),
    gap: spacing(1),
  },
  promptChip: {
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing(1),
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing(1.5),
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
