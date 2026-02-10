/**
 * Match Exercise Component
 * Clean tap-to-connect interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../../theme/tokens';
import { Item } from '../../types/domain';

interface MatchPair {
  left: string;
  right: string;
}

interface MatchExerciseProps {
  item: Item;
  onResult: (result: { correct: boolean; msToAnswer: number }) => void;
}

export const MatchExercise: React.FC<MatchExerciseProps> = ({ item, onResult }) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const leftAnims = useRef((item.pairs || []).map(() => new Animated.Value(1))).current;
  const rightAnims = useRef((item.pairs || []).map(() => new Animated.Value(1))).current;

  const pairs: MatchPair[] = item.pairs || [];
  const leftItems = pairs.map(p => p.left);
  const rightItems = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);

  useEffect(() => {
    setSelectedLeft(null);
    setMatches({});
    setSubmitted(false);

    fadeAnim.setValue(0);
    leftAnims.forEach(anim => anim.setValue(0));
    rightAnims.forEach(anim => anim.setValue(0));

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.stagger(60, [
        ...leftAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          })
        ),
        ...rightAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          })
        ),
      ]),
    ]).start();
  }, [item.id]);

  const handleLeftPress = (leftItem: string) => {
    if (submitted) return;

    if (matches[leftItem]) {
      const newMatches = { ...matches };
      delete newMatches[leftItem];
      setMatches(newMatches);
      setSelectedLeft(leftItem);
    } else {
      setSelectedLeft(leftItem);
    }
  };

  const handleRightPress = (rightItem: string) => {
    if (!selectedLeft || submitted) return;

    const newMatches = { ...matches };
    Object.keys(newMatches).forEach(left => {
      if (newMatches[left] === rightItem) {
        delete newMatches[left];
      }
    });

    newMatches[selectedLeft] = rightItem;
    setMatches(newMatches);
    setSelectedLeft(null);
  };

  const handleSubmit = () => {
    if (submitted || Object.keys(matches).length !== pairs.length) return;

    setSubmitted(true);
    const msToAnswer = Date.now() - startTime;

    let isCorrect = true;
    for (const pair of pairs) {
      if (matches[pair.left] !== pair.right) {
        isCorrect = false;
        break;
      }
    }

    setTimeout(() => {
      onResult({
        correct: isCorrect,
        msToAnswer
      });
    }, 800);
  };

  const canSubmit = Object.keys(matches).length === pairs.length;
  const isRightItemMatched = (rightItem: string) => Object.values(matches).includes(rightItem);

  // Color palette for matched pair indicators
  const pairColors = ['#D68A38', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0', '#FF9800'];

  // Get the match index for a left item (order in which it was matched)
  const getMatchIndex = (leftItem: string): number => {
    const matchedKeys = Object.keys(matches);
    return matchedKeys.indexOf(leftItem);
  };

  // Get the match index for a right item
  const getRightMatchIndex = (rightItem: string): number => {
    const entry = Object.entries(matches).find(([_, v]) => v === rightItem);
    if (!entry) return -1;
    return Object.keys(matches).indexOf(entry[0]);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Text style={styles.prompt}>
        Match the trait to its professional application
      </Text>

      <View style={styles.matchContainer}>
        {/* Left Column - Traits (White Pills) */}
        <View style={styles.column}>
          {leftItems.map((leftItem, index) => {
            const isSelected = selectedLeft === leftItem;
            const isMatched = !!matches[leftItem];

            return (
              <Animated.View
                key={index}
                style={{
                  opacity: leftAnims[index],
                  transform: [{ scale: leftAnims[index] }],
                }}
              >
                <Pressable
                  style={[
                    styles.itemLeft,
                    isSelected && styles.itemLeftSelected,
                    isMatched && [styles.itemLeftMatched, { borderColor: pairColors[getMatchIndex(leftItem) % pairColors.length] }],
                  ]}
                  onPress={() => handleLeftPress(leftItem)}
                  disabled={submitted}
                >
                  {isMatched && (
                    <View style={[styles.matchBadge, { backgroundColor: pairColors[getMatchIndex(leftItem) % pairColors.length] }]}>
                      <Text style={styles.matchBadgeText}>{getMatchIndex(leftItem) + 1}</Text>
                    </View>
                  )}
                  <Text style={[
                    styles.itemTextLeft,
                    (isSelected || isMatched) && styles.itemTextLeftHighlight
                  ]}>
                    {leftItem}
                  </Text>

                  {/* Connection Point (Right side) */}
                  {(isSelected || isMatched) && (
                    <View style={[styles.connectionPointRight, isMatched && { backgroundColor: pairColors[getMatchIndex(leftItem) % pairColors.length] }]} />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Right Column - Applications (Dark Outline Pills) */}
        <View style={styles.column}>
          {rightItems.map((rightItem, index) => {
            const isMatched = isRightItemMatched(rightItem);

            // Find if this specific right item is involved in a current selection/match
            // For selection visualization, we only highlight if it's the confirmed match
            const isActive = isMatched;

            return (
              <Animated.View
                key={index}
                style={{
                  opacity: rightAnims[index],
                  transform: [{ scale: rightAnims[index] }],
                }}
              >
                <Pressable
                  style={[
                    styles.itemRight,
                    isMatched && [styles.itemRightMatched, { borderColor: pairColors[getRightMatchIndex(rightItem) % pairColors.length] }],
                    !selectedLeft && !isMatched && styles.itemDisabled,
                  ]}
                  onPress={() => handleRightPress(rightItem)}
                  disabled={!selectedLeft || submitted}
                >
                  {isMatched && (
                    <View style={[styles.matchBadge, styles.matchBadgeRight, { backgroundColor: pairColors[getRightMatchIndex(rightItem) % pairColors.length] }]}>
                      <Text style={styles.matchBadgeText}>{getRightMatchIndex(rightItem) + 1}</Text>
                    </View>
                  )}
                  <Text style={[
                    styles.itemTextRight,
                    isMatched && [styles.itemTextRightHighlight, { color: pairColors[getRightMatchIndex(rightItem) % pairColors.length] }],
                  ]}>
                    {rightItem}
                  </Text>

                  {/* Connection Point (Left side) */}
                  {isMatched && (
                    <View style={[styles.connectionPointLeft, { backgroundColor: pairColors[getRightMatchIndex(rightItem) % pairColors.length] }]} />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <Text style={styles.footerInstruction}>
        Tap a trait on the left, then its match on the right.
      </Text>

      {!submitted && (
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <LinearGradient
            colors={canSubmit
              ? [colors.gold, colors.accent]
              : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
            }
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[
              styles.submitText,
              !canSubmit && styles.submitTextDisabled
            ]}>
              Check Answers
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing(1),
  },
  prompt: {
    fontSize: 28,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(5),
    lineHeight: 34,
  },
  matchContainer: {
    flexDirection: 'row',
    gap: spacing(4),
    marginBottom: spacing(6),
  },
  column: {
    flex: 1,
    gap: spacing(3),
    justifyContent: 'center',
  },

  // Left Item Styles (White Pill)
  itemLeft: {
    backgroundColor: '#FBFBFB', // Keeping close to white for paper contrast
    borderRadius: 30,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FBFBFB',
    position: 'relative',
  },
  itemLeftSelected: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  itemLeftMatched: {
    borderColor: colors.gold,
    backgroundColor: '#FFF8E1', // Very light gold/cream
  },
  itemTextLeft: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A120D', // Dark text on paper
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  itemTextLeftHighlight: {
    color: '#1A120D',
  },

  // Right Item Styles (Dark Outline Pill)
  itemRight: {
    backgroundColor: 'transparent',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemRightMatched: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(214, 138, 56, 0.1)', // colors.gold with opacity
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemTextRight: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  itemTextRightHighlight: {
    color: colors.gold,
    fontWeight: '600',
  },

  // Match Badge - numbered indicator showing which pairs are connected
  matchBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  matchBadgeRight: {
    left: undefined,
    right: -8,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Connection Points (Pseudo-elements)
  connectionPointRight: {
    position: 'absolute',
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
    zIndex: 10,
  },
  connectionPointLeft: {
    position: 'absolute',
    left: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
    zIndex: 10,
  },

  footerInstruction: {
    fontStyle: 'italic',
    color: colors.muted,
    textAlign: 'center',
    fontSize: 14,
    marginBottom: spacing(3),
    fontFamily: Platform.OS === 'ios' ? 'Georgia-Italic' : 'serif',
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
    color: '#1A120D', // Dark text on gold button
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  submitTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});

export default MatchExercise;
