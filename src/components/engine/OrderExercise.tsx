/**
 * Order Exercise Component
 * Slot-based drag-and-drop interface with clear visual structure
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Item } from '../../types/domain';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { log } from '../../lib/logger';

const SLOT_TRACK_OFFSET = 32 + spacing(2);

export type ExerciseCommonProps = {
  item: Item;
  onResult: (res: { correct: boolean; msToAnswer: number }) => void;
  disabled?: boolean;
};

export default function OrderExercise({ item, onResult, disabled = false }: ExerciseCommonProps): React.JSX.Element {
  // slots[0] = item in first position, slots[1] = item in second position, etc.
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  // Initialize items when component loads
  useEffect(() => {
    setSubmitted(false);

    if (item.orderTarget && item.orderTarget.length > 0) {
      // Shuffle available items
      const shuffled = [...item.orderTarget].sort(() => Math.random() - 0.5);
      setAvailableItems(shuffled);

      // Create empty slots
      setSlots(new Array(item.orderTarget.length).fill(null));
    }
  }, [item.id]);

  const handleItemClick = (itemText: string, fromAvailable: boolean, fromSlotIndex?: number) => {
    if (submitted || disabled) return;

    if (fromAvailable) {
      // Item clicked from available pool - try to place in first empty slot
      const emptySlotIndex = slots.findIndex(slot => slot === null);
      if (emptySlotIndex !== -1) {
        const newSlots = [...slots];
        newSlots[emptySlotIndex] = itemText;
        setSlots(newSlots);
        const removeIndex = availableItems.findIndex((i) => i === itemText);
        if (removeIndex >= 0) {
          setAvailableItems([
            ...availableItems.slice(0, removeIndex),
            ...availableItems.slice(removeIndex + 1),
          ]);
        }
      }
    } else if (fromSlotIndex !== undefined) {
      // Item clicked from a slot - return it to available pool
      const newSlots = [...slots];
      newSlots[fromSlotIndex] = null;
      setSlots(newSlots);
      setAvailableItems([...availableItems, itemText]);
    }
  };

  const handleSubmit = () => {
    if (submitted || disabled) return;

    // Get ordered items from slots (filter out nulls)
    const orderedItems = slots.filter((item): item is string => item !== null);
    const targetOrder = item.orderTarget || [];

    log.debug('OrderExercise', 'Order validation', {
      slots: JSON.stringify(slots),
      orderedItems: JSON.stringify(orderedItems),
      targetOrder: JSON.stringify(targetOrder)
    });

    // Check if all slots are filled
    if (orderedItems.length !== targetOrder.length) {
      log.warn('OrderExercise', 'Not all slots filled', {
        orderedLength: orderedItems.length,
        targetLength: targetOrder.length
      });
      return;
    }

    const isCorrect = arraysEqual(orderedItems, targetOrder);
    const timeToAnswer = Date.now() - startTime;

    const comparisonDetails = orderedItems.map((itemText, idx) => ({
      slot: idx + 1,
      actual: itemText,
      expected: targetOrder[idx],
      match: itemText === targetOrder[idx]
    }));

    log.debug('OrderExercise', 'Order comparison', {
      isCorrect,
      timeToAnswer,
      comparisonDetails
    });

    setSubmitted(true);

    setTimeout(() => {
      onResult({ correct: isCorrect, msToAnswer: timeToAnswer });
    }, 280);
  };

  const arraysEqual = (a: string[], b: string[]): boolean => {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  };

  if (!item.orderTarget || item.orderTarget.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No order items available</Text>
      </View>
    );
  }

  const allSlotsFilled = slots.every(slot => slot !== null);
  const promptText = item.prompt?.trim() || 'Place the process in order.';

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.container}>
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>Question</Text>
          <Text style={styles.prompt}>{promptText}</Text>
        </View>

        {/* Ordered Slots */}
        <View style={styles.slotsSection}>
          <Text style={styles.sectionLabel}>Your Order:</Text>
          <View style={styles.slotsContainer}>
            {slots.map((slotItem, index) => (
              <View key={index} style={styles.slotWrapper}>
                <View style={styles.slotNumber}>
                  <Text style={styles.slotNumberText}>{index + 1}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.slot,
                    slotItem ? styles.slotFilled : styles.slotEmpty,
                  ]}
                  onPress={() => slotItem && handleItemClick(slotItem, false, index)}
                  disabled={submitted || disabled || !slotItem}
                  activeOpacity={0.7}
                >
                  {slotItem ? (
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                      style={styles.slotContent}
                    >
                      <Text style={styles.slotText}>{slotItem}</Text>
                      {!submitted && (
                        <Ionicons name="close-circle" size={20} color={colors.gold} />
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={styles.slotContent}>
                      <Text style={styles.emptySlotText}>Tap item below</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Available Items Pool */}
        {availableItems.length > 0 && (
          <View style={styles.availableSection}>
            <Text style={styles.sectionLabel}>Available Items:</Text>
            <View style={styles.availableContainer}>
              {availableItems.map((itemText, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.availableItem}
                  onPress={() => handleItemClick(itemText, true)}
                  disabled={submitted || disabled}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[colors.gold, colors.accent]}
                    style={styles.availableGradient}
                  >
                    <Text style={styles.availableText}>{itemText}</Text>
                    <Ionicons name="arrow-up" size={18} color={colors.goldText} />
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        {!submitted && allSlotsFilled && (
          <Pressable
            style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={disabled}
          >
            <LinearGradient
              colors={!disabled
                ? [colors.gold, colors.accent]
                : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
              }
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[
                styles.submitText,
                disabled && styles.submitTextDisabled
              ]}>
                CHECK MY ORDER
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    width: '100%',
    flex: 1,
  },
  scrollView: {
    width: '100%',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(4),
  },
  container: {
    width: '100%',
  },
  questionCard: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    marginBottom: spacing(2.5),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  prompt: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing(0.5),
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
    marginBottom: spacing(2),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slotsSection: {
    marginBottom: spacing(4),
  },
  slotsContainer: {
    gap: spacing(2),
  },
  slotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  slotNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  slotNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
  },
  slot: {
    flex: 1,
    minHeight: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  slotEmpty: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  slotFilled: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  slotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
  },
  slotText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  emptySlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
    fontStyle: 'italic',
    opacity: 0.5,
  },
  availableSection: {
    marginBottom: spacing(4),
  },
  availableContainer: {
    gap: spacing(2),
    // Align available item chips with the slot column.
    marginLeft: SLOT_TRACK_OFFSET,
  },
  availableItem: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  availableGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
  },
  availableText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldText,
    lineHeight: 22,
  },
  submitButton: {
    borderRadius: radii.full,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginHorizontal: spacing(4),
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitGradient: {
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A120D',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  submitTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    padding: spacing(4),
  },
});
