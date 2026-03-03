import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

export type InPageTabItem = {
  key: string;
  label: string;
  icon?: string;
  badge?: number;
};

type Props = {
  items: InPageTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  scrollable?: boolean;
};

export default function InPageTabBar({ items, activeKey, onChange, scrollable = false }: Props) {
  const tabRow = (
    <View style={styles.row}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(item.key)}
          >
            {!!item.icon && (
              <Ionicons
                name={item.icon as any}
                size={15}
                color={isActive ? colors.goldText : colors.textMuted}
              />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{item.badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.shell}>
      {scrollable ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{tabRow}</ScrollView> : tabRow}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingVertical: spacing(0.25),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.6),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  tabActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.goldText,
    fontWeight: '700',
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(0.35),
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badgeActive: {
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  badgeTextActive: {
    color: colors.white,
  },
});
