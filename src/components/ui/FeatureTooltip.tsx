// @ts-nocheck
/**
 * FeatureTooltip Component
 * "What's new" tooltips and coach-marks for new features
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Modal, 
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  ViewStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radii, fonts } from '../../theme/tokens';
import { log } from '../../lib/logger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface FeatureInfo {
  id: string;
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  dismissLabel?: string;
  version?: string; // App version when feature was introduced
  persistent?: boolean; // If true, won't auto-dismiss after time
}

export interface FeatureTooltipProps {
  feature: FeatureInfo;
  targetRef: React.RefObject<View>;
  visible: boolean;
  onDismiss: () => void;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  showArrow?: boolean;
  maxWidth?: number;
  autoCloseDelay?: number; // Auto close after ms (0 = no auto close)
}

export interface TooltipPosition {
  x: number;
  y: number;
  arrowX?: number;
  arrowY?: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export default function FeatureTooltip({
  feature,
  targetRef,
  visible,
  onDismiss,
  placement = 'auto',
  showArrow = true,
  maxWidth = 280,
  autoCloseDelay = 0,
}: FeatureTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && targetRef.current) {
      // Measure target element
      targetRef.current.measureInWindow((x, y, width, height) => {
        const position = calculatePosition(x, y, width, height, placement, maxWidth);
        setTooltipPosition(position);
        
        // Animate in
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 20,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto close if specified
      if (autoCloseDelay > 0 && !feature.persistent) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTooltipPosition(null);
      });
    }
  }, [visible, targetRef, placement, maxWidth, autoCloseDelay, feature.persistent]);

  const calculatePosition = (
    targetX: number,
    targetY: number,
    targetWidth: number,
    targetHeight: number,
    preferredPlacement: string,
    tooltipWidth: number
  ): TooltipPosition => {
    const tooltipHeight = 120; // Estimated height
    const arrowSize = 8;
    const margin = spacing(1);

    let finalPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    let x = 0;
    let y = 0;
    let arrowX = 0;
    let arrowY = 0;

    if (preferredPlacement === 'auto') {
      // Auto placement logic
      const spaceAbove = targetY;
      const spaceBelow = screenHeight - (targetY + targetHeight);
      const spaceLeft = targetX;
      const spaceRight = screenWidth - (targetX + targetWidth);

      if (spaceBelow >= tooltipHeight + margin) {
        finalPlacement = 'bottom';
      } else if (spaceAbove >= tooltipHeight + margin) {
        finalPlacement = 'top';
      } else if (spaceRight >= tooltipWidth + margin) {
        finalPlacement = 'right';
      } else if (spaceLeft >= tooltipWidth + margin) {
        finalPlacement = 'left';
      } else {
        finalPlacement = 'bottom'; // Fallback
      }
    } else {
      finalPlacement = preferredPlacement as any;
    }

    switch (finalPlacement) {
      case 'top':
        x = Math.max(margin, Math.min(
          targetX + targetWidth / 2 - tooltipWidth / 2,
          screenWidth - tooltipWidth - margin
        ));
        y = targetY - tooltipHeight - arrowSize - margin;
        arrowX = targetX + targetWidth / 2 - x;
        arrowY = tooltipHeight;
        break;

      case 'bottom':
        x = Math.max(margin, Math.min(
          targetX + targetWidth / 2 - tooltipWidth / 2,
          screenWidth - tooltipWidth - margin
        ));
        y = targetY + targetHeight + arrowSize + margin;
        arrowX = targetX + targetWidth / 2 - x;
        arrowY = -arrowSize;
        break;

      case 'left':
        x = targetX - tooltipWidth - arrowSize - margin;
        y = Math.max(margin, Math.min(
          targetY + targetHeight / 2 - tooltipHeight / 2,
          screenHeight - tooltipHeight - margin
        ));
        arrowX = tooltipWidth;
        arrowY = targetY + targetHeight / 2 - y;
        break;

      case 'right':
        x = targetX + targetWidth + arrowSize + margin;
        y = Math.max(margin, Math.min(
          targetY + targetHeight / 2 - tooltipHeight / 2,
          screenHeight - tooltipHeight - margin
        ));
        arrowX = -arrowSize;
        arrowY = targetY + targetHeight / 2 - y;
        break;
    }

    return {
      x: Math.max(margin, Math.min(x, screenWidth - tooltipWidth - margin)),
      y: Math.max(margin, Math.min(y, screenHeight - tooltipHeight - margin)),
      arrowX: Math.max(arrowSize, Math.min(arrowX, tooltipWidth - arrowSize)),
      arrowY: Math.max(arrowSize, Math.min(arrowY, tooltipHeight - arrowSize)),
      placement: finalPlacement,
    };
  };

  const handleDismiss = async () => {
    // Mark feature as seen
    await markFeatureAsSeen(feature.id);
    onDismiss();
  };

  const handleAction = () => {
    feature.onAction?.();
    handleDismiss();
  };

  if (!visible || !tooltipPosition) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none">
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.tooltip,
                {
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                  maxWidth,
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Arrow */}
              {showArrow && tooltipPosition.arrowX !== undefined && tooltipPosition.arrowY !== undefined && (
                <View
                  style={[
                    styles.arrow,
                    styles[`arrow${tooltipPosition.placement.charAt(0).toUpperCase() + tooltipPosition.placement.slice(1)}` as keyof typeof styles],
                    {
                      left: tooltipPosition.placement === 'left' || tooltipPosition.placement === 'right' 
                        ? tooltipPosition.arrowX 
                        : tooltipPosition.arrowX - 8,
                      top: tooltipPosition.placement === 'top' || tooltipPosition.placement === 'bottom' 
                        ? tooltipPosition.arrowY 
                        : tooltipPosition.arrowY - 8,
                    },
                  ]}
                />
              )}

              {/* Content */}
              <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  {feature.icon && (
                    <View style={styles.iconContainer}>
                      <Ionicons name={feature.icon} size={20} color={colors.accent} />
                    </View>
                  )}
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{feature.title}</Text>
                    {feature.version && (
                      <Text style={styles.version}>New in v{feature.version}</Text>
                    )}
                  </View>
                  <Pressable style={styles.closeButton} onPress={handleDismiss}>
                    <Ionicons name="close" size={16} color={colors.subtext} />
                  </Pressable>
                </View>

                {/* Description */}
                <Text style={styles.description}>{feature.description}</Text>

                {/* Actions */}
                <View style={styles.actions}>
                  {feature.actionLabel && feature.onAction && (
                    <Pressable style={styles.primaryAction} onPress={handleAction}>
                      <Text style={styles.primaryActionText}>{feature.actionLabel}</Text>
                    </Pressable>
                  )}
                  
                  <Pressable style={styles.dismissAction} onPress={handleDismiss}>
                    <Text style={styles.dismissActionText}>
                      {feature.dismissLabel || 'Got it'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Feature management utilities
const FEATURE_STORAGE_KEY = '@feature_tooltips_seen';

export const markFeatureAsSeen = async (featureId: string): Promise<void> => {
  try {
    const seenFeatures = await getSeenFeatures();
    const updatedFeatures = [...seenFeatures, featureId];
    await AsyncStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(updatedFeatures));
  } catch (error) {
    log.warn('FeatureTooltip', 'Failed to mark feature as seen', { error, featureId });
  }
};

export const getSeenFeatures = async (): Promise<string[]> => {
  try {
    const seenFeatures = await AsyncStorage.getItem(FEATURE_STORAGE_KEY);
    return seenFeatures ? JSON.parse(seenFeatures) : [];
  } catch (error) {
    log.warn('FeatureTooltip', 'Failed to get seen features', { error });
    return [];
  }
};

export const hasSeenFeature = async (featureId: string): Promise<boolean> => {
  const seenFeatures = await getSeenFeatures();
  return seenFeatures.includes(featureId);
};

export const clearSeenFeatures = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FEATURE_STORAGE_KEY);
  } catch (error) {
    log.warn('FeatureTooltip', 'Failed to clear seen features', { error });
  }
};

// Hook for managing feature tooltips
export const useFeatureTooltip = (feature: FeatureInfo) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkIfSeen = async () => {
      const seen = await hasSeenFeature(feature.id);
      if (!seen) {
        setIsVisible(true);
      }
      setHasChecked(true);
    };

    if (!hasChecked) {
      checkIfSeen();
    }
  }, [feature.id, hasChecked]);

  const dismiss = () => {
    setIsVisible(false);
  };

  return {
    isVisible: isVisible && hasChecked,
    dismiss,
  };
};

// Context for managing multiple tooltips
interface FeatureTooltipContextType {
  showTooltip: (feature: FeatureInfo, targetRef: React.RefObject<View>) => void;
  hideTooltip: (featureId: string) => void;
  hideAllTooltips: () => void;
}

const FeatureTooltipContext = React.createContext<FeatureTooltipContextType | null>(null);

export const useFeatureTooltipContext = () => {
  const context = React.useContext(FeatureTooltipContext);
  if (!context) {
    throw new Error('useFeatureTooltipContext must be used within FeatureTooltipProvider');
  }
  return context;
};

interface TooltipState {
  feature: FeatureInfo;
  targetRef: React.RefObject<View>;
  visible: boolean;
}

export const FeatureTooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tooltips, setTooltips] = useState<Map<string, TooltipState>>(new Map());

  const showTooltip = async (feature: FeatureInfo, targetRef: React.RefObject<View>) => {
    const seen = await hasSeenFeature(feature.id);
    if (seen) return;

    setTooltips(prev => new Map(prev).set(feature.id, {
      feature,
      targetRef,
      visible: true,
    }));
  };

  const hideTooltip = (featureId: string) => {
    setTooltips(prev => {
      const newMap = new Map(prev);
      const tooltip = newMap.get(featureId);
      if (tooltip) {
        newMap.set(featureId, { ...tooltip, visible: false });
      }
      return newMap;
    });
  };

  const hideAllTooltips = () => {
    setTooltips(prev => {
      const newMap = new Map();
      prev.forEach((tooltip, id) => {
        newMap.set(id, { ...tooltip, visible: false });
      });
      return newMap;
    });
  };

  return (
    <FeatureTooltipContext.Provider value={{ showTooltip, hideTooltip, hideAllTooltips }}>
      {children}
      {Array.from(tooltips.values()).map(({ feature, targetRef, visible }) => (
        <FeatureTooltip
          key={feature.id}
          feature={feature}
          targetRef={targetRef}
          visible={visible}
          onDismiss={() => hideTooltip(feature.id)}
        />
      ))}
    </FeatureTooltipContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  arrow: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: colors.card,
    borderColor: colors.line,
  },
  arrowTop: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  arrowBottom: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  arrowLeft: {
    borderTopWidth: 1,
    borderRightWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  arrowRight: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  content: {
    padding: spacing(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(1.5),
  },
  iconContainer: {
    backgroundColor: colors.chipBg,
    borderRadius: radii.sm,
    padding: spacing(0.75),
    marginRight: spacing(1),
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  version: {
    fontSize: fonts.micro,
    color: colors.accent,
    fontWeight: '500',
  },
  closeButton: {
    padding: spacing(0.5),
  },
  description: {
    fontSize: fonts.caption,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: spacing(2),
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  primaryAction: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
    flex: 1,
  },
  primaryActionText: {
    fontSize: fonts.caption,
    fontWeight: '600',
    color: colors.accentText,
    textAlign: 'center',
  },
  dismissAction: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: radii.md,
  },
  dismissActionText: {
    fontSize: fonts.caption,
    fontWeight: '500',
    color: colors.subtext,
    textAlign: 'center',
  },
});