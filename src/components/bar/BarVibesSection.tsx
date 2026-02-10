import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, textStyles, layouts, components, spacing } from '../../theme/tokens';

type InfoRow = { icon: string; text: string };
type Bartender = { name: string; avatar: string; subtitle?: string };

export type BarVibes = {
  crowdAndAtmosphere?: InfoRow[];
  bartender?: Bartender;
  travelTips?: InfoRow[];
  dressCodeAndEntry?: InfoRow[];
};

export default function BarVibesSection({ vibes }: { vibes?: BarVibes }) {
  if (!vibes) return null;

  return (
    <View style={styles.wrap}>
      {/* Crowd & Atmosphere */}
      {!!vibes.crowdAndAtmosphere?.length && (
        <View style={styles.block}>
          <SectionTitle>Crowd & Atmosphere</SectionTitle>
          {vibes.crowdAndAtmosphere.map((r, i) => (
            <IconRow key={`crowd-${i}`} {...r} />
          ))}
        </View>
      )}

      {/* Bartender Spotlight */}
      {vibes.bartender && (
        <View style={styles.block}>
          <SectionTitle>Bartender Spotlight</SectionTitle>
          <View style={styles.bartenderRow}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="account" size={22} color={colors.accentLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bartenderName}>{vibes.bartender.name}</Text>
              {!!vibes.bartender.subtitle && (
                <Text style={styles.subtle}>{vibes.bartender.subtitle}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Travel Tips */}
      {!!vibes.travelTips?.length && (
        <View style={styles.block}>
          <SectionTitle>Travel Tips</SectionTitle>
          {vibes.travelTips.map((r, i) => (
            <IconRow key={`travel-${i}`} {...r} />
          ))}
        </View>
      )}

      {/* Dress Code & Entry */}
      {!!vibes.dressCodeAndEntry?.length && (
        <View style={[styles.block, { marginBottom: 8 }]}>
          <SectionTitle>Dress Code & Entry</SectionTitle>
          {vibes.dressCodeAndEntry.map((r, i) => (
            <IconRow key={`dress-${i}`} {...r} />
          ))}
        </View>
      )}
    </View>
  );
}

/* ───────────────── helpers ───────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

function IconRow({ icon, text }: InfoRow) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon as any} size={22} color={colors.accentLight} />
      </View>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

/* ───────────────── styles (match screenshot) ───────────────── */

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing(2) },
  block: { marginTop: spacing(2.25) },
  title: {
    ...textStyles.h3,
    color: colors.textLight,
    marginBottom: spacing(1),
  },
  row: {
    ...layouts.row,
    gap: spacing(1.5),
    marginVertical: spacing(0.75),
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.line,
    ...layouts.center,
  },
  rowText: {
    ...textStyles.body,
    color: colors.textMuted,
  },
  bartenderRow: {
    ...layouts.row,
    gap: spacing(1.5),
    marginTop: spacing(0.5),
  },
  avatar: components.avatar,
  bartenderName: {
    ...textStyles.bodyMedium,
    color: colors.textLight,
  },
  subtle: {
    ...textStyles.caption,
    marginTop: spacing(0.25),
  },
});