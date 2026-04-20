/**
 * Spirit Education Panel
 *
 * Collapsible panel on BottleDetailScreen (below thumbs, above recipes).
 * Surfaces depth content for exploration without requiring any manual input.
 *
 * Contents (collapsed by default):
 *   1. Category overview — 1 paragraph from spirit type + region
 *   2. Flavour development note — 2-3 sentences about production/cask/region
 *   3. "If you like this, try…" — substitutions from spiritsDatabase matching 2+ flavour tags
 *   4. Classic serves — top 2-3 from BottleServeService
 *
 * Always expanded for Pro tier.
 * Data is generated from existing bottle profile + BottleServeService — no new API calls.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { SPIRITS_DATABASE, type Spirit } from '../data/spiritsDatabase';
import type { BottleServeRecommendation } from '../services/bottleServeService';

// ── Category overview copy ────────────────────────────────────────────────────

const CATEGORY_OVERVIEW: Record<string, string> = {
  gin: 'Gin is a neutral spirit redistilled with botanicals — juniper must dominate, everything else is the distiller\'s signature. London Dry is the driest and most bartender-friendly style. Contemporary and Old Tom styles lean sweeter and more experimental.',
  vodka: 'Vodka is defined by what it doesn\'t impose on a drink — clean, neutral, and versatile. The craft is in the water source, distillation cuts, and filtration. Grain vodkas lean creamy; potato vodkas tend richer.',
  whiskey: 'Whiskey is grain spirit aged in oak, and the barrel does most of the work. American bourbons lean sweet and vanilla-forward from new charred oak. Scotch single malts are shaped by peat, copper, and coastal air. Irish whiskeys are typically triple-distilled for smoothness.',
  rum: 'Rum is distilled from sugarcane juice or molasses — the base material defines the style. Column-distilled light rums are cocktail workhorses. Pot-still aged rums from the Caribbean and Latin America develop layers of tropical fruit, caramel, and oak over years in barrel.',
  tequila: 'All tequila must come from blue agave grown in Jalisco and a few nearby states. Blanco is unaged and shows the raw agave character most clearly. Reposado rests 2–12 months in oak; añejo at least a year. The agave terroir — highland vs. lowland — shapes everything.',
  mezcal: 'Mezcal can be made from many agave varieties, but the defining step is roasting the piñas in earthen pits. That process creates the distinctive smoke. Every mezcal is shaped by the specific agave species, the source water, and the maestro mezcalero\'s technique — each batch is essentially handmade.',
  brandy: 'Brandy is distilled wine or fermented fruit juice, then aged. Cognac must come from the Cognac region of France and be made from specific grape varieties. Armagnac, just to the south, uses continuous distillation for a richer, earthier result. Both develop complexity from years in Limousin oak.',
  liqueur: 'Liqueurs are sweetened spirits flavoured with fruits, herbs, spices, or nuts. They bridge the gap between base spirits and modifiers — too bold to drink in volume, too useful to leave out of a build. Most work best as secondary components that add complexity, sweetness, or bitterness to a cocktail.',
  other: 'This spirit has its own rules. Explore it neat first — understand the base character before adding ice or dilution. Once you know what it\'s doing on its own, you\'ll know where it belongs in a build.',
};

// ── Flavour development notes ─────────────────────────────────────────────────

const FLAVOUR_DEVELOPMENT: Record<string, string> = {
  gin: 'The botanical bill is macerated or vapour-infused during distillation, then the wash is redistilled. Juniper binds the other aromatics together. Citrus peel adds brightness; coriander brings a warm, nutty spice; angelica root grounds the whole thing. The balance between these determines whether a gin leans floral, citrus-forward, or juniper-dominant.',
  vodka: 'The flavour profile starts with the base material — wheat gives a lighter, slightly sweet finish; rye adds a subtle spice; potato creates a creamy, earthy texture. Multiple distillation runs remove congeners; charcoal filtration polishes the spirit further. The goal is a clean canvas that lets mixers and other ingredients shine.',
  whiskey: 'New make spirit enters the barrel colourless and sharp. Over years, it passes in and out of the oak as temperatures rise and fall — extracting vanillin, tannins, and caramel compounds, while mellowing raw alcohol. American law mandates new charred barrels for bourbon, which drive intense sweetness. Scotch distillers reuse ex-bourbon and sherry casks, creating softer, more layered results.',
  rum: 'Molasses-based rums carry the residual sweetness and complexity of the sugarcane. Longer fermentation (Jamaica, Barbados) builds heavy esters — banana, overripe fruit — before distillation. Lighter column-still rums (Cuba, Puerto Rico) are stripped clean and aged briefly. Each island has its own tradition of what \'finished\' looks like.',
  tequila: 'The agave hearts (piñas) are slow-roasted to convert starches to fermentable sugars before crushing and fermentation. Highland agave, grown above 1,500m, tends toward floral and fruit notes. Lowland agave near the town of Tequila produces more herbaceous, earthy, and mineral character. Aging in American oak softens the spirit but risks masking the agave if overdone.',
  mezcal: 'The agave roasting happens in a conical pit lined with hot volcanic rocks. This slow cook — lasting 3–7 days — caramelises the plant sugars and infuses smoke into the pulp. After crushing (often by stone tahona) and open-air fermentation, pot distillation concentrates both the smoke and the natural agave complexity. The result is a spirit with more variation from batch to batch than almost any other category.',
  brandy: 'Wine is distilled while it\'s still rough and relatively low in alcohol — impurities and all. The distillate is then aged, and the oak exposure does the heavy lifting. Cognac is double-distilled in alembic pot stills; the second pass (the \'bonne chauffe\') sharpens the character. Years in Limousin or Tronçais oak extract vanilla, dried fruit, and rancio — a complex waxy richness that only develops with time.',
  liqueur: 'Most liqueurs are built by cold-macerating or distilling the flavouring materials, then blending with a base spirit, sugar, and water. High-quality producers use real fruit, bark, and botanicals at every stage; cheaper versions rely on essences. The flavour profile reflects both the source material and the production philosophy.',
  other: 'This spirit follows its own production logic. The ingredients, fermentation approach, and ageing conditions all contribute to its distinct character — often built around a regional tradition or craft methodology.',
};

// ── Substitution logic ────────────────────────────────────────────────────────

function findSubstitutions(bottle: Spirit): Spirit[] {
  const flavorSet = new Set(bottle.flavorProfile.map((f) => f.toLowerCase()));
  return SPIRITS_DATABASE
    .filter((s) => {
      if (s.id === bottle.id) return false;
      const overlap = s.flavorProfile.filter((f) => flavorSet.has(f.toLowerCase())).length;
      return overlap >= 2;
    })
    .sort((a, b) => {
      const aOverlap = a.flavorProfile.filter((f) => flavorSet.has(f.toLowerCase())).length;
      const bOverlap = b.flavorProfile.filter((f) => flavorSet.has(f.toLowerCase())).length;
      return bOverlap - aOverlap;
    })
    .slice(0, 3);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  bottle: Spirit;
  serveRecommendation: BottleServeRecommendation;
  alwaysExpanded?: boolean; // Pro tier
}

export default function SpiritEducationPanel({ bottle, serveRecommendation, alwaysExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const spiritType = (bottle.type || 'other').toLowerCase();

  const overview = CATEGORY_OVERVIEW[spiritType] ?? CATEGORY_OVERVIEW.other;
  const flavourDev = FLAVOUR_DEVELOPMENT[spiritType] ?? FLAVOUR_DEVELOPMENT.other;
  const substitutions = findSubstitutions(bottle);
  const classicServes = serveRecommendation.serveModes.slice(0, 3);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => { if (!alwaysExpanded) setExpanded((e) => !e); }}
        activeOpacity={alwaysExpanded ? 1 : 0.8}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="book-outline" size={15} color={colors.accent} />
          <Text style={styles.headerTitle}>About this spirit</Text>
        </View>
        {!alwaysExpanded && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={colors.subtext}
          />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {/* 1. Category overview */}
          <Text style={styles.overviewText}>{overview}</Text>

          {/* 2. Flavour development */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>How the flavour develops</Text>
            <Text style={styles.sectionBody}>{flavourDev}</Text>
          </View>

          {/* 3. Substitutions */}
          {substitutions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>If you like this, try…</Text>
              <View style={styles.subsList}>
                {substitutions.map((sub) => (
                  <View key={sub.id} style={styles.subItem}>
                    <Text style={styles.subName}>{sub.name}</Text>
                    <Text style={styles.subMeta}>{sub.flavorProfile.slice(0, 2).join(' · ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing(2),
    marginBottom: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(2),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    padding: spacing(2),
    paddingTop: 0,
    gap: spacing(2),
  },
  overviewText: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 20,
  },
  section: {
    gap: spacing(0.75),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionBody: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 20,
  },
  serveList: {
    gap: spacing(0.75),
  },
  serveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1),
    paddingTop: 3,
  },
  serveItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 18,
  },
  serveItemMode: {
    fontWeight: '600',
    color: colors.text,
  },
  subsList: {
    gap: spacing(1),
  },
  subItem: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing(1.5),
  },
  subName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  subMeta: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2,
  },
});
