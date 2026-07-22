import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';

export type MethodRenderMode = 'full' | 'condensed' | 'spec';

interface MethodSectionProps {
  mode: MethodRenderMode;
  steps: string[];
  specLine: string;
  showEscapeHatch: boolean;
  onShowEverything: () => void;
  sectionStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  listStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  indexStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Renders the recipe's Method section, fading from a full numbered
 * walkthrough to condensed steps to a single-line spec as the user racks
 * up makes of this recipe (Plus/Pro only — Free's method preview is a
 * separate tier-truncated teaser, untouched by this).
 */
export default function MethodSection({
  mode,
  steps,
  specLine,
  showEscapeHatch,
  onShowEverything,
  sectionStyle,
  titleStyle,
  listStyle,
  rowStyle,
  indexStyle,
  textStyle,
}: MethodSectionProps) {
  return (
    <View style={sectionStyle}>
      <View style={localStyles.titleRow}>
        <Text style={titleStyle}>Method</Text>
        {showEscapeHatch && (
          <TouchableOpacity
            onPress={onShowEverything}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={localStyles.showEverythingText}>Show everything</Text>
          </TouchableOpacity>
        )}
      </View>

      {mode === 'spec' ? (
        <View style={localStyles.specBlock}>
          <Text style={localStyles.specText}>{specLine}</Text>
        </View>
      ) : (
        <View style={listStyle}>
          {steps.map((step, index) => (
            <View key={`step-${index}`} style={rowStyle}>
              <Text style={indexStyle}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={textStyle}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showEverythingText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing(1.5),
  },
  specBlock: {
    backgroundColor: 'rgba(214, 165, 102, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 165, 102, 0.16)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
  },
  specText: {
    color: '#EDE0D0',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
});
