import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts } from '../../theme/tokens';

interface SectionProps {
  title: string;
  subtitle?: string;
  onPress?: () => void; // "See All" functionality
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  onPress,
  rightAction,
  children,
  style,
}) => {
  const renderHeader = () => {
    const titleContent = (
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.accent}
            style={styles.chevron}
          />
        )}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {titleContent}
        </TouchableOpacity>
      );
    }

    return titleContent;
  };

  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {renderHeader()}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightAction && <View style={styles.headerRight}>{rightAction}</View>}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing(3),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(2),
    marginBottom: spacing(1.5),
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: spacing(2),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.h2,
    fontWeight: '800',
    color: colors.text,
  },
  chevron: {
    marginLeft: spacing(0.5),
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
});

export default Section;