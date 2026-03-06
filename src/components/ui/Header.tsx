import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fonts, radii } from '../../theme/tokens';
import { withHaptic } from '../../lib/haptics';

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
  accessibilityLabel?: string;
}

export interface HeaderFilter {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  showMenu?: boolean;
  onSearch?: () => void;
  onFilter?: () => void;
  onMenu?: () => void;
  centerTitle?: boolean;
  rightComponent?: React.ReactNode;
  leftComponent?: React.ReactNode;
  // New props for extended functionality
  rightActions?: HeaderAction[];
  filters?: HeaderFilter[];
  onFilterChange?: (key: string) => void;
}

export default function Header({
  title,
  subtitle,
  showBackButton = true,
  showSearch = false,
  showFilter = false,
  showMenu = false,
  onSearch,
  onFilter,
  onMenu,
  centerTitle = false,
  rightComponent,
  leftComponent,
  rightActions = [],
  filters = [],
  onFilterChange,
}: HeaderProps) {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  const renderLeftContent = () => {
    if (leftComponent) return leftComponent;
    
    if (showBackButton) {
      return (
        <Pressable hitSlop={12} onPress={withHaptic(handleBack)} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      );
    }
    
    return <View style={styles.iconButton} />;
  };

  const renderRightContent = () => {
    if (rightComponent) return rightComponent;

    const icons = [];

    if (showSearch) {
      icons.push(
        <Pressable key="search" hitSlop={10} onPress={withHaptic(onSearch)} style={styles.iconButton}>
          <Ionicons name="search-outline" size={20} color={colors.text} />
        </Pressable>
      );
    }

    if (showFilter) {
      icons.push(
        <Pressable key="filter" hitSlop={10} onPress={withHaptic(onFilter)} style={styles.iconButton}>
          <Ionicons name="funnel-outline" size={20} color={colors.text} />
        </Pressable>
      );
    }

    if (showMenu) {
      icons.push(
        <Pressable key="menu" hitSlop={10} onPress={withHaptic(onMenu)} style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      );
    }

    // Add rightActions support
    rightActions.forEach((action, index) => {
      icons.push(
        <TouchableOpacity
          key={`action-${index}`}
          style={styles.actionButton}
          onPress={withHaptic(action.onPress)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel || action.icon}
        >
          <Ionicons name={action.icon} size={22} color={colors.text} />
          {action.badge !== undefined && action.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {action.badge > 99 ? '99+' : action.badge}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    });

    if (icons.length === 0) {
      return <View style={styles.iconButton} />;
    }

    return (
      <View style={styles.rightContainer}>
        {icons}
      </View>
    );
  };

  const renderFilters = () => {
    if (filters.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              filter.active && styles.filterChipActive,
            ]}
            onPress={withHaptic(() => onFilterChange?.(filter.key))}
            activeOpacity={0.7}
          >
            {filter.icon && (
              <Ionicons
                name={filter.icon}
                size={16}
                color={filter.active ? colors.goldText : colors.subtext}
                style={styles.filterIcon}
              />
            )}
            <Text
              style={[
                styles.filterText,
                filter.active && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        {renderLeftContent()}

        <View style={[styles.titleContainer, centerTitle && styles.centerTitle]}>
          {title && (
            <Text style={[styles.title, centerTitle && styles.centerTitleText]}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, centerTitle && styles.centerTitleText]}>
              {subtitle}
            </Text>
          )}
        </View>

        {renderRightContent()}
      </View>
      {renderFilters()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    minHeight: 56,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: spacing(2),
  },
  centerTitle: {
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fonts.h2,
    fontWeight: '900',
  },
  centerTitleText: {
    textAlign: 'center',
  },
  subtitle: {
    color: colors.subtext,
    fontSize: fonts.caption,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  // Filter styles
  filtersScroll: {
    marginTop: spacing(1),
  },
  filtersContainer: {
    paddingHorizontal: spacing(2),
    gap: spacing(1),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  filterChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  filterIcon: {
    marginRight: spacing(0.5),
  },
  filterText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.subtext,
  },
  filterTextActive: {
    color: colors.goldText,
  },
});
