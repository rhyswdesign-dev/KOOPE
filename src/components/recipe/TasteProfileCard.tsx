import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { computeTasteProfileAxes } from '../../utils/tasteProfileAxes';

// Taste Profile card rows: icon + label paired with the matching key from
// computeTasteProfileAxes(). Icons follow the MaterialCommunityIcons keyword
// convention used in utils/ingredientCategoryIcon.ts.
export const TASTE_AXIS_ROWS: {
  key: 'spiritForward' | 'sweetness' | 'acidity' | 'bitterness' | 'finish';
  label: string;
  icon: string;
}[] = [
  { key: 'spiritForward', label: 'Spirit Forward', icon: 'bottle-wine-outline' },
  { key: 'sweetness', label: 'Sweetness', icon: 'candy-outline' },
  { key: 'acidity', label: 'Acidity', icon: 'fruit-citrus' },
  // Same glyph used for bitters ingredients in ingredientCategoryIcon.ts,
  // for visual consistency with the rest of the app.
  { key: 'bitterness', label: 'Bitterness', icon: 'bottle-tonic-plus-outline' },
  { key: 'finish', label: 'Finish', icon: 'timer-sand' },
];

export interface TasteProfileCardProps {
  ingredients: { name: string; amount: string }[];
  title?: string;
  /**
   * 'eyebrow' renders the small-caps label + trailing rule header; 'title'
   * renders a single plain heading. Matches the two header treatments
   * CocktailDetailScreen already branches between.
   */
  headerVariant?: 'eyebrow' | 'title';
  scaleLabels?: [string, string, string];
  containerStyle?: StyleProp<ViewStyle>;
  headerRowStyle?: StyleProp<ViewStyle>;
  eyebrowStyle?: StyleProp<TextStyle>;
  ruleStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  groupStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<TextStyle>;
  iconSize?: number;
  iconColor?: string;
  labelStyle?: StyleProp<TextStyle>;
  trackWrapStyle?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  trackFillStyle?: StyleProp<ViewStyle>;
  dotStyle?: StyleProp<ViewStyle>;
  scaleRowStyle?: StyleProp<ViewStyle>;
  scaleTextStyle?: StyleProp<TextStyle>;
}

/**
 * The five-axis Taste Profile card (Spirit Forward / Sweetness / Acidity /
 * Bitterness / Finish), estimated from the recipe's ingredients. Renders
 * nothing when there isn't enough parseable data to produce a meaningful
 * estimate, so callers don't each repeat that null check.
 */
export default function TasteProfileCard({
  ingredients,
  title = 'Taste Profile',
  headerVariant = 'eyebrow',
  scaleLabels = ['Low', 'Balanced', 'High'],
  containerStyle,
  headerRowStyle,
  eyebrowStyle,
  ruleStyle,
  titleStyle,
  groupStyle,
  rowStyle,
  iconWrapStyle,
  iconStyle,
  iconSize = 14,
  iconColor = '#C98E4B',
  labelStyle,
  trackWrapStyle,
  trackStyle,
  trackFillStyle,
  dotStyle,
  scaleRowStyle,
  scaleTextStyle,
}: TasteProfileCardProps) {
  const axes = React.useMemo(() => computeTasteProfileAxes(ingredients), [ingredients]);

  if (!axes) return null;

  return (
    <View style={containerStyle}>
      {headerVariant === 'eyebrow' ? (
        <View style={headerRowStyle}>
          <Text style={eyebrowStyle}>{title}</Text>
          <View style={ruleStyle} />
        </View>
      ) : (
        <Text style={titleStyle}>{title}</Text>
      )}
      <View style={groupStyle}>
        {TASTE_AXIS_ROWS.map((row) => {
          const pct = Math.round(axes[row.key] * 100);
          return (
            <View key={row.key} style={rowStyle}>
              <View style={iconWrapStyle}>
                <MaterialCommunityIcons
                  name={row.icon as any}
                  size={iconSize}
                  color={iconColor}
                  style={iconStyle}
                />
              </View>
              <Text style={labelStyle}>{row.label}</Text>
              <View style={trackWrapStyle}>
                <View style={trackStyle}>
                  <View style={[trackFillStyle, { width: `${pct}%` }]} />
                </View>
                <View style={[dotStyle, { left: `${pct}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={scaleRowStyle}>
        {scaleLabels.map((label) => (
          <Text key={label} style={scaleTextStyle}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
