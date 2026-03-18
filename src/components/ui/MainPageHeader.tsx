import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, serif } from '../../theme/tokens';
import { withHaptic } from '../../lib/haptics';

export interface MainPageHeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel?: string;
}

interface MainPageHeaderProps {
  title: string;
  subtitle?: string;
  onTitlePress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: MainPageHeaderAction[];
  rightContent?: React.ReactNode;
  leftContent?: React.ReactNode;
}

export default function MainPageHeader({
  title,
  subtitle,
  onTitlePress,
  showBackButton = false,
  onBackPress,
  rightActions = [],
  rightContent,
  leftContent,
}: MainPageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {leftContent ? (
          <View style={styles.leftSlot}>{leftContent}</View>
        ) : showBackButton ? (
          <TouchableOpacity onPress={withHaptic(onBackPress)} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.leftSpacer} />
        )}

        <View style={styles.headerCenter} pointerEvents="box-none">
          <Pressable
            style={styles.titlePressable}
            disabled={!onTitlePress}
            onPress={onTitlePress ? withHaptic(onTitlePress) : undefined}
          >
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>{title}</Text>
              {onTitlePress ? (
                <Ionicons name="chevron-down" size={14} color={colors.subtext} style={styles.titleChevron} />
              ) : null}
            </View>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </Pressable>
        </View>

        <View style={styles.headerRight}>
          {rightContent ? (
            rightContent
          ) : (
            rightActions.map((action, index) => (
              <Pressable
                key={`${action.icon}-${index}`}
                onPress={withHaptic(action.onPress)}
                style={styles.headerButton}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel || action.icon}
              >
                <Ionicons name={action.icon} size={18} color={colors.text} />
              </Pressable>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing(2),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSlot: {
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
  },
  leftSpacer: {
    width: 36,
    height: 36,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePressable: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleChevron: {
    marginLeft: spacing(0.5),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
    marginTop: spacing(0.25),
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing(1.25),
    minHeight: 32,
    alignItems: 'center',
    minWidth: 36,
    justifyContent: 'flex-end',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
