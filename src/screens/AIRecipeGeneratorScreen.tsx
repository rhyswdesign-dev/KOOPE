/**
 * AI Recipe Generator Screen -> Bar Assistant Chat
 * Replaces the old Wizard flow with a direct Chat Interface
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { UserInventoryItem } from '../types/database';
import * as BartenderService from '../services/bartenderAssistantService';
import { useAuth } from '../contexts/AuthContext';
import { useUserTier } from '../store/useUserTier';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RouteParams {
  userInventory: UserInventoryItem[];
  selectedItems: Set<string>;
}

const { width } = Dimensions.get('window');

export default function AIRecipeGeneratorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;
  const userInventory = params?.userInventory || [];

  const { user } = useAuth();
  const { tier } = useUserTier();

  const [messages, setMessages] = useState<BartenderService.ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Hide default header
  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Load history on mount
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const history = await BartenderService.getConversationHistory(user.id);

      // If no history, add an initial greeting locally
      if (!history || history.length === 0) {
        const greeting: BartenderService.ChatMessage = {
          id: 'init-greeting',
          role: 'assistant',
          content: "I see you have a great inventory. Shall we try a Gin Basil Smash, or are you in the mood for something more boozy?",
          created_at: new Date().toISOString(),
        };
        setMessages([greeting]);
      } else {
        setMessages(history);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading || !user) return;

    const userMessageContent = inputText.trim();
    setInputText('');
    setLoading(true);

    // Optimistic Update
    const userMsg: BartenderService.ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await BartenderService.sendMessage({
        userId: user.id,
        message: userMessageContent,
        userInventory,
        tier: tier || 'FREE',
      });

      if (result.error) {
        // Handle error visually
        const errorMsg: BartenderService.ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting to the bar service. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        const assistantMsg: BartenderService.ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: result.response,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeTap = (recipeId: string) => {
    // Logic to detect if a message contains a recipe link or if we render specific recipe chips
    // For now, assuming standard text response. 
    // If the reference implies rich recipe cards in chat, we handle that in renderItem.
  };

  const renderItem = ({ item }: { item: BartenderService.ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="face-man-profile" size={24} color={colors.text} />
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {/* Label above bubble? Reference shows labels OUTSIDE or INSIDE? 
               Reference: "CONCIERGE" label above assistant bubble. "YOU" label above user bubble.
           */}
          <Text style={[styles.senderLabel, isUser ? styles.senderLabelUser : styles.senderLabelAssistant]}>
            {isUser ? 'YOU' : 'BAR CONCIERGE'}
          </Text>

          <Text style={styles.messageText}>
            {item.content}
          </Text>

          {/* If assistant, maybe show a recipe card if detected? 
               Reference shows a "Dry Martini" card INSIDE the bubble area? 
               We'll simulate a simple card if needed later. 
           */}
        </View>

        {isUser && (
          <View style={styles.avatarContainerUser}>
            <Ionicons name="person-circle-outline" size={28} color={colors.gold} />
          </View>
        )}
      </View>
    );
  };

  // Get tier-based suggested prompts
  const baseSuggestedPrompts = BartenderService.getSuggestedPrompts(tier || 'FREE');

  // Map prompts to include icons
  const suggestedPrompts = [
    ...baseSuggestedPrompts.map(prompt => ({
      label: prompt,
      icon: prompt.includes('make') ? 'wine' :
        prompt.includes('Substitute') ? 'swap-horizontal' :
          prompt.includes('improve') ? 'sparkles' : 'chatbubble-ellipses'
    })),
    { label: 'MAKE IT SPICY', icon: 'flame' },
    { label: 'LOWER ABV', icon: 'water' },
    { label: 'SURPRISE ME', icon: 'gift' },
  ];

  const handleQuickPrompt = (text: string) => {
    setInputText(text);
    // Auto-send the prompt
    setTimeout(() => {
      if (!user) return;

      const userMsg: BartenderService.ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);

      BartenderService.sendMessage({
        userId: user.id,
        message: text,
        userInventory,
        tier: tier || 'FREE',
      }).then(result => {
        if (result.error) {
          const errorMsg: BartenderService.ChatMessage = {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: "I'm having trouble connecting to the bar service. Please try again.",
            created_at: new Date().toISOString(),
          };
          setMessages(prev => [...prev, errorMsg]);
        } else {
          const assistantMsg: BartenderService.ChatMessage = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: result.response,
            created_at: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      }).finally(() => {
        setLoading(false);
        setInputText('');
      });
    }, 100);
  };

  return (
    <LinearGradient colors={['#1A120D', '#000000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={15}
          >
            <Ionicons name="chevron-back" size={20} color={colors.gold} />
            <Text style={styles.backText}>Back to Discovery</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Heading level={2} style={styles.headerTitle}>Bar Assistant</Heading>
            <View style={styles.liveStatus}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE INVENTORY ({userInventory.length})</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert('Bar Assistant', 'Powered by KŌOPE AI')}>
            <Ionicons name="information-circle-outline" size={24} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* Chat List */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatArea}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />

          {/* Quick Prompts / Chips - Horizontally Scrollable */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
            style={styles.chipsScroll}
          >
            {suggestedPrompts.map((p, idx) => (
              <TouchableOpacity key={idx} style={styles.chip} onPress={() => handleQuickPrompt(p.label)}>
                <Ionicons name={p.icon as any} size={12} color={colors.gold} />
                <Text style={styles.chipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask your concierge..."
              placeholderTextColor="#665"
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() && !loading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align top to handle multiline title if needed
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    paddingBottom: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  backText: {
    color: colors.gold,
    fontSize: 16,
    fontFamily: serif,
    marginLeft: -2,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: serif,
    marginBottom: 4,
  },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  liveText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoButton: {
    marginTop: 4,
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    padding: spacing(3),
    paddingBottom: spacing(2),
    gap: spacing(3), // Space between messages
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: spacing(1),
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(1.5),
    marginTop: 20, // push down to align with bubble top? or normal
  },
  avatarContainerUser: {
    width: 32,
    height: 32,
    marginLeft: spacing(1.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  bubble: {
    maxWidth: '80%',
    padding: spacing(2.5),
    borderRadius: radii.xl,
    position: 'relative',
  },
  bubbleAssistant: {
    backgroundColor: '#2B1F17', // Dark Espresso/Card
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.gold,
    borderTopRightRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#665', // Muted
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: serif,
    textTransform: 'uppercase',
  },
  senderLabelUser: {
    color: colors.gold,
    textAlign: 'right',
    marginBottom: 8,
  },
  senderLabelAssistant: {
    color: colors.gold, // or muted gold
    marginBottom: 8,
  },
  messageText: {
    color: '#F2E5D5',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: serif,
  },
  chipsScroll: {
    maxHeight: 50, // Limit height to prevent taking up screen
    marginBottom: spacing(1), // Reduced gap to sit tightly over input
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center', // Prevent stretching
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: 8, // Reduced from 12
    paddingHorizontal: 16, // Reduced from 20
    gap: 8,
  },
  chipText: {
    color: '#F2E5D5', // Cream text
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: serif,
    textTransform: 'uppercase',
  },
  inputContainer: {
    marginHorizontal: spacing(3),
    marginBottom: spacing(2), // Safe area handles bottom?
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.pill,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#443',
    opacity: 0.5,
  },
});
