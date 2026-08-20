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
  /**
   * When provided, renders the "eyebrow label + trailing rule" header
   * (matching the Ingredients section) instead of the bare `titleStyle`
   * heading. Pass headerRowStyle/eyebrowStyle/ruleStyle together.
   */
  headerRowStyle?: StyleProp<ViewStyle>;
  eyebrowStyle?: StyleProp<TextStyle>;
  ruleStyle?: StyleProp<ViewStyle>;
  listStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  indexStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
  /**
   * Connected-timeline treatment (reference/`headerRowStyle` layout only):
   * the circular step-number badge, its number text, and the vertical
   * connector line drawn down to the next badge. Unused by the legacy
   * plain index+text row.
   */
  markerStyle?: StyleProp<ViewStyle>;
  markerTextStyle?: StyleProp<TextStyle>;
  connectorStyle?: StyleProp<ViewStyle>;
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
  headerRowStyle,
  eyebrowStyle,
  ruleStyle,
  listStyle,
  rowStyle,
  indexStyle,
  textStyle,
  markerStyle,
  markerTextStyle,
  connectorStyle,
}: MethodSectionProps) {
  return (
    <View style={sectionStyle}>
      <View style={localStyles.titleRow}>
        {headerRowStyle ? (
          <View style={[headerRowStyle, localStyles.headerFlex]}>
            <Text style={eyebrowStyle}>Method</Text>
            <View style={ruleStyle} />
          </View>
        ) : (
          <Text style={titleStyle}>Method</Text>
        )}
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
          {steps.map((step, index) =>
            headerRowStyle ? (
              // Reference layout: connected vertical timeline — a circular
              // marker per step with a connector line down to the next
              // marker (omitted after the final step).
              <View key={`step-${index}`} style={rowStyle}>
                <View style={localStyles.markerColumn}>
                  <View style={markerStyle}>
                    <Text style={markerTextStyle}>{String(index + 1).padStart(2, '0')}</Text>
                  </View>
                  {index < steps.length - 1 && (
                    <View style={[localStyles.connector, connectorStyle]} />
                  )}
                </View>
                <Text style={textStyle}>{step}</Text>
              </View>
            ) : (
              // Legacy plain index+text row.
              <View key={`step-${index}`} style={rowStyle}>
                <Text style={indexStyle}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={textStyle}>{step}</Text>
              </View>
            ),
          )}
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
  headerFlex: {
    flex: 1,
  },
  // Structural only — sizing/color for the marker circle and connector
  // line itself come from markerStyle/connectorStyle (call site). This
  // just centers the badge and lets the connector fill the rest of the
  // row's stretched height so it reaches the next marker.
  markerColumn: {
    alignItems: 'center',
  },
  connector: {
    flex: 1,
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
