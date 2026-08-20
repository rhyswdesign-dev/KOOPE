/**
 * Styles for CocktailDetailScreen — extracted verbatim (Phase 5, god-file
 * breakup). Pure StyleSheet definitions, no component state; the only
 * runtime dependency is the device-width reference scale used for a few
 * fixed pixel values.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '../theme/tokens';

const REFERENCE_DEVICE_WIDTH = 390;
const REFERENCE_SCALE = Math.min(Dimensions.get('window').width / REFERENCE_DEVICE_WIDTH, 1.02);
const rs = (value: number) => Math.round(value * REFERENCE_SCALE);

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero
  heroContainer: {
    width: '100%',
    height: 480,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(4),
  },
  referenceHeroContainer: {
    height: rs(450),
    backgroundColor: '#120D0A',
  },
  referenceHeroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  referenceHeroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 10, 7, 0.12)',
  },
  referenceHeroGradient: {
    height: rs(238),
    justifyContent: 'flex-end',
    paddingBottom: rs(28),
    paddingHorizontal: rs(20),
  },
  referenceEditionRow: {
    marginBottom: rs(8),
  },
  referenceEditionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderRadius: rs(999),
    backgroundColor: 'rgba(18, 12, 9, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(214, 165, 102, 0.14)',
  },
  referenceEditionChipText: {
    color: '#CFA66E',
    fontSize: rs(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
  },
  referenceHeroLabelRow: {
    marginBottom: rs(10),
    alignItems: 'center',
  },
  heroTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
    backgroundColor: 'rgba(20,15,12,0.76)',
    alignSelf: 'flex-start',
  },
  referenceHeroTypePill: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(7),
    borderRadius: 999,
    borderColor: 'rgba(214,165,102,0.3)',
    backgroundColor: 'rgba(22, 16, 13, 0.82)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  referenceHeroTypePillText: {
    fontSize: rs(11),
    letterSpacing: 0.9,
    color: '#D8A45D',
  },
  heroWatermark: {
    fontSize: 10,
    color: colors.text,
    opacity: 0.78,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  referenceHeroWatermark: {
    fontSize: rs(11),
    letterSpacing: rs(1.6),
    opacity: 0.62,
  },
  heroKicker: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(1),
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  referenceHeroKicker: {
    fontSize: rs(13),
    lineHeight: rs(18),
    color: 'rgba(246, 235, 221, 0.82)',
    letterSpacing: 1.2,
    marginBottom: rs(6),
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 46,
    color: colors.text,
    textAlign: 'left',
    marginBottom: spacing(2.5),
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  referenceHeroTitle: {
    fontSize: rs(37),
    lineHeight: rs(41),
    letterSpacing: -0.5,
    marginBottom: rs(10),
    color: '#F2E6D8',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(1),
  },
  referenceMetaRow: {
    marginBottom: rs(12),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  referenceMetaText: {
    fontSize: rs(14),
    color: '#E0D2C1',
  },
  metaDot: {
    color: colors.subtext,
    fontSize: 14,
    marginHorizontal: 4,
  },
  referenceMetaDot: {
    fontSize: rs(13),
    color: '#C2B09C',
  },
  referenceBackButtonAbsolute: {
    top: rs(58),
    left: rs(14),
  },
  backButtonAbsolute: {
    position: 'absolute',
    top: 60,
    left: spacing(3),
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  referenceTopIconButton: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: 'rgba(7, 7, 8, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  topActionsAbsolute: {
    position: 'absolute',
    top: 60,
    right: spacing(3),
    flexDirection: 'row',
    gap: spacing(2),
  },
  referenceTopActionsAbsolute: {
    top: rs(58),
    right: rs(14),
    gap: rs(8),
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },

  // Actions
  actionButtonsContainer: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(2.5),
    gap: spacing(2),
  },
  referenceContentShell: {
    marginTop: rs(-2),
    paddingTop: rs(4),
    borderTopLeftRadius: rs(28),
    borderTopRightRadius: rs(28),
    backgroundColor: '#17100D',
  },
  referenceActionButtonsContainer: {
    marginTop: 0,
    paddingHorizontal: rs(16),
    gap: rs(6),
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  referencePrimaryButton: {
    height: rs(58),
    borderRadius: rs(18),
    backgroundColor: '#D89A46',
    borderWidth: 0,
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: colors.goldText,
    fontSize: 16,
    fontWeight: '700',
  },
  referencePrimaryButtonText: {
    fontSize: rs(15),
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#19110C',
  },
  secondaryButton: {
    backgroundColor: 'rgba(242,229,213,0.03)',
    borderRadius: radii.pill,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  referenceSecondaryButton: {
    height: rs(54),
    borderRadius: rs(18),
    backgroundColor: 'rgba(31, 21, 16, 0.88)',
    borderColor: 'rgba(177,123,64,0.28)',
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButtonXP: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: 'center',
  },
  referenceSecondaryButtonXP: {
    fontSize: rs(11),
    color: '#D89A46',
  },
  referenceSecondaryButtonText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: '#EADCCB',
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: `${colors.gold}15`,
    borderWidth: 1,
    borderColor: `${colors.gold}40`,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    marginTop: spacing(3),
    marginHorizontal: spacing(3),
  },
  customizeButtonText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
  },

  recipeEditorialShell: {
    paddingHorizontal: spacing(2.5),
    marginTop: spacing(3.25),
    marginBottom: spacing(1),
  },
  referenceRecipeEditorialShell: {
    paddingHorizontal: rs(14),
    marginTop: rs(10),
  },
  recipeEditorialInner: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(0.75),
    paddingBottom: spacing(0.5),
  },
  referenceRecipeEditorialInner: {
    // Ingredients gets its own visible card (referenceSpecTable) below, so
    // this wrapper is layout-only now — no background/border of its own,
    // otherwise it reads as a second, barely-visible card behind the real one.
    paddingHorizontal: rs(14),
    paddingTop: rs(8),
    paddingBottom: rs(16),
  },
  // Shared "sibling block" spacing/card treatment applied to Method and
  // Taste & Fit so every top-level block (Ingredients, Method, Taste & Fit,
  // Notes) reads as the same kind of container with the same rhythm.
  referenceSectionGap: {
    marginTop: rs(16),
  },
  referenceSectionCard: {
    borderRadius: rs(22),
    backgroundColor: '#261A15',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.08)',
    paddingHorizontal: rs(14),
    paddingTop: rs(12),
    paddingBottom: rs(16),
  },
  referenceSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rs(8),
    paddingTop: rs(2),
  },
  referenceSectionEyebrow: {
    color: '#AF8150',
    fontSize: rs(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  referenceSectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,165,102,0.08)',
  },
  recipeEditorialSection: {
    paddingTop: spacing(2.9),
  },
  referenceRecipeEditorialSection: {
    paddingTop: rs(14),
  },
  recipeEditorialSectionLast: {
    paddingBottom: 0,
  },
  recipeEditorialTitle: {
    fontSize: 31,
    lineHeight: 36,
    color: '#F6EBDD',
    marginBottom: spacing(1.5),
    fontWeight: '500',
  },
  referenceRecipeEditorialTitle: {
    fontSize: rs(22),
    lineHeight: rs(26),
    marginBottom: rs(8),
    color: '#EEDFCF',
  },
  specTable: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(229, 209, 189, 0.09)',
    overflow: 'hidden',
    backgroundColor: '#34241C',
  },
  referenceSpecTable: {
    borderRadius: rs(22),
    backgroundColor: '#261A15',
    borderColor: 'rgba(214,165,102,0.08)',
  },
  // Ingredient row: category icon, name, dotted leader line, amount, and
  // (if owned) a trailing check-circle. Rows are not individually boxed —
  // they sit inside the outer specTable/referenceSpecTable card, separated
  // by a hairline divider (specRowLast removes it on the final row).
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.95),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 209, 189, 0.06)',
  },
  referenceSpecRow: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(11),
    borderBottomColor: 'rgba(214,165,102,0.06)',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLeaderIcon: {
    marginRight: spacing(1.25),
  },
  referenceSpecLeaderIcon: {
    marginRight: rs(8),
  },
  specName: {
    flexShrink: 1,
    color: '#F5EBDC',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '600',
  },
  referenceSpecName: {
    fontSize: rs(16),
    lineHeight: rs(20),
    color: '#EADDCF',
    fontWeight: '600',
  },
  // The dot-leader fills the gap between name and amount. flex:1 lets it
  // grow into the remaining space; numberOfLines/ellipsizeMode="clip" (set
  // in the JSX) clips the long repeated-dot string to exactly that width,
  // producing a table-of-contents-style leader line.
  specLeaderDots: {
    flex: 1,
    flexShrink: 1,
    marginHorizontal: spacing(1),
    color: 'rgba(229, 209, 189, 0.22)',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 2,
  },
  referenceSpecLeaderDots: {
    fontSize: rs(16),
    lineHeight: rs(20),
    marginHorizontal: rs(6),
    letterSpacing: 1.5,
    color: 'rgba(214,165,102,0.18)',
  },
  // Amount is secondary information — kept lighter weight and smaller than
  // the ingredient name so the name reads first.
  specAmount: {
    flexShrink: 0,
    color: '#D8C7B3',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'right',
  },
  referenceSpecAmount: {
    fontSize: rs(14),
    lineHeight: rs(18),
    color: '#C9B8A6',
    fontWeight: '500',
  },
  specRowCheckIcon: {
    marginLeft: spacing(1),
  },
  referenceSpecRowCheckIcon: {
    marginLeft: rs(6),
  },
  // --- Unused, kept intentionally (not deleted) ---
  // These belonged to the previous two-column ingredient-row layout
  // (name+amount with an owned-row tint/left-accent-bar) that this file's
  // row rendering no longer uses now that rows follow the icon + dotted
  // leader + amount + trailing check-circle pattern. Left in place pending
  // an explicit go-ahead to remove them.
  specRowOwned: {
    backgroundColor: 'rgba(74, 122, 89, 0.14)',
    borderLeftWidth: 3,
    borderLeftColor: '#4A9E63',
    paddingLeft: spacing(1.95) - 3,
  },
  referenceSpecRowOwned: {
    backgroundColor: 'rgba(74, 122, 89, 0.16)',
    borderLeftWidth: 3,
    borderLeftColor: '#4A9E63',
    paddingLeft: rs(14) - 3,
  },
  specNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  specAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing(0.75),
    marginLeft: spacing(1),
  },
  specOwnedIcon: {
    marginTop: 1,
  },
  specNameOwned: {
    color: '#DDF3E1',
  },
  referenceSpecNameOwned: {
    color: '#E2F4E6',
  },
  specAmountOwned: {
    color: '#B9DFC0',
  },
  referenceSpecAmountOwned: {
    color: '#B9DFC0',
  },
  emptyRecipeCardText: {
    color: '#D6C3AE',
    fontSize: 16,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
  },
  methodList: {
    gap: spacing(2.5),
  },
  // Reference layout renders steps as a connected vertical timeline, so
  // the list has no inter-row gap of its own — spacing between steps
  // comes from referenceMethodRow's paddingBottom instead, keeping each
  // step's connector line touching the next step's marker with no break.
  referenceMethodList: {
    gap: 0,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.7),
  },
  // alignItems: 'stretch' (overriding methodRow's flex-start) lets the
  // marker column stretch to the row's full height so its connector
  // (flex: 1 below the fixed-size badge) reaches down to the next row.
  referenceMethodRow: {
    alignItems: 'stretch',
    gap: rs(12),
    paddingBottom: rs(14),
  },
  methodIndex: {
    width: 44,
    color: '#D59C58',
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
  },
  referenceMethodIndex: {
    width: rs(36),
    fontSize: rs(16),
    lineHeight: rs(22),
    color: '#C98E4B',
  },
  methodText: {
    flex: 1,
    color: '#EDE0D0',
    fontSize: 20,
    lineHeight: 31,
    fontWeight: '400',
  },
  referenceMethodText: {
    flex: 1,
    fontSize: rs(16),
    lineHeight: rs(22),
    color: '#DDD0C1',
  },
  // Circular step-number badge for the reference-layout timeline. Filled
  // with a low-opacity wash of the same gold used elsewhere (specLeaderDots,
  // referenceSectionEyebrow) plus a slightly stronger border so it reads
  // as a marker, not just numbered text.
  referenceMethodMarker: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,165,102,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.4)',
  },
  referenceMethodMarkerText: {
    fontSize: rs(11),
    lineHeight: rs(14),
    fontWeight: '700',
    color: '#C98E4B',
  },
  // Hairline connector between markers — same low-opacity gold used for
  // referenceSectionRule/specRow's hairline dividers, not a bold line.
  referenceMethodConnector: {
    width: 1,
    marginTop: rs(2),
    backgroundColor: 'rgba(214,165,102,0.1)',
  },
  tastingNoteText: {
    color: '#E7D7C7',
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '400',
  },
  tastingSubhead: {
    marginTop: spacing(1.25),
    marginBottom: spacing(0.5),
    color: '#C98E4B',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  referenceTastingNoteText: {
    fontSize: rs(16),
    lineHeight: rs(22),
    color: '#DDD0C1',
  },
  referenceTastingSubhead: {
    marginTop: rs(8),
    marginBottom: rs(4),
    fontSize: rs(10),
    lineHeight: rs(14),
    letterSpacing: 0.8,
  },

  // Taste Profile card — four icon + horizontal-track slider rows (Spirit
  // Forward, Sweetness, Acidity, Finish) estimated from ingredient
  // composition (see utils/tasteProfileAxes.ts), followed by a single
  // LOW/BALANCED/HIGH scale caption shared across all four rows.
  tasteAxisGroup: {
    gap: rs(14),
  },
  tasteAxisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  tasteAxisIconWrap: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,165,102,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,165,102,0.3)',
  },
  tasteAxisLabel: {
    width: rs(92),
    fontSize: rs(13),
    lineHeight: rs(17),
    fontWeight: '600',
    color: '#EADDCF',
  },
  tasteAxisTrackWrap: {
    flex: 1,
    height: rs(16),
    justifyContent: 'center',
  },
  tasteAxisTrack: {
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: 'rgba(214,165,102,0.14)',
    overflow: 'hidden',
  },
  tasteAxisTrackFill: {
    height: '100%',
    borderRadius: rs(2),
    backgroundColor: 'rgba(214,165,102,0.4)',
  },
  tasteAxisDot: {
    position: 'absolute',
    top: '50%',
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    marginTop: -rs(6),
    marginLeft: -rs(6),
    backgroundColor: '#D59C58',
    borderWidth: 2,
    borderColor: '#1A120D',
  },
  // Left offset mirrors the icon (26) + row gap (10) + label (92) + row gap
  // (10) that precede the track in tasteAxisRow, so the scale caption lines
  // up under the tracks rather than the full row.
  tasteAxisScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: rs(4),
    paddingLeft: rs(26 + 10 + 92 + 10),
  },
  tasteAxisScaleText: {
    fontSize: rs(9),
    lineHeight: rs(12),
    letterSpacing: 0.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'rgba(214,165,102,0.45)',
  },

  // Section
  section: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(4),
  },
  // Reference-layout override: matches the uniform gap used between
  // Ingredients/Method/Taste & Fit (referenceSectionGap) so Notes reads as
  // the same rhythm rather than a separate spacing system.
  referenceSection: {
    marginTop: rs(16),
  },
  sectionEyebrow: {
    fontSize: 11,
    color: colors.subtext,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing(0.75),
  },
  sectionHeader: {
    fontSize: 32,
    color: colors.text,
    marginBottom: spacing(2),
    fontWeight: '600',
  },

  // Ingredients
  ingredientsList: {
    gap: spacing(1.5),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38,28,22,0.88)',
    padding: spacing(2),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
  },
  ingredientIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  ingredientDetail: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 2,
  },

  // Instructions
  instructionsList: {
    gap: spacing(2),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(38,28,22,0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.1)',
    padding: spacing(2),
  },
  stepNumber: {
    fontSize: 32,
    color: colors.accent,
    width: 50,
    lineHeight: 40,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: colors.subtext,
    lineHeight: 24,
    paddingTop: 8,
  },

  // Pro Tips
  proTipsContainer: {
    backgroundColor: 'rgba(38,28,22,0.84)',
    padding: spacing(3),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  proTipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  proTipsText: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
    marginBottom: 8,
  },
  proTipsGate: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  proTipsGateContent: {
    width: '100%',
    borderRadius: 20,
    padding: spacing(2.5),
    alignItems: 'center',
    backgroundColor: 'rgba(20,15,12,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.16)',
  },
  proTipsGateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.75),
    textAlign: 'center',
  },
  proTipsGateBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  proTipsGateButton: {
    minHeight: 42,
    paddingHorizontal: spacing(2.5),
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTipsGateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldText,
  },

  // Make flow modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing(2),
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: colors.bg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalScroll: {
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1),
  },
  modalSection: {
    marginBottom: spacing(2),
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  modalInput: {
    backgroundColor: '#261C16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
    marginTop: spacing(1),
  },
  suggestionChip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  suggestionChipText: {
    fontSize: 12,
    color: colors.text,
  },
  modalActions: {
    padding: spacing(2.5),
    gap: spacing(1),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalPrimaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.pill,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(2),
  },
  modalSecondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  substituteCard: {
    backgroundColor: 'rgba(38,28,22,0.84)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
    padding: spacing(1.75),
    marginBottom: spacing(1.25),
  },
  substituteGroup: {
    marginBottom: spacing(1),
  },
  substituteLegendCard: {
    backgroundColor: 'rgba(38,28,22,0.62)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.1)',
    padding: spacing(1.25),
    marginBottom: spacing(1.25),
  },
  substituteLegendTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  substituteLegendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(0.5),
  },
  substituteLegendInfoButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,138,56,0.12)',
  },
  substituteLegendInfoButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
  substituteLegendText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  substituteGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.subtext,
    textTransform: 'uppercase',
    marginBottom: spacing(1),
  },
  substituteRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.75),
  },
  substituteIngredient: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    paddingRight: spacing(1),
  },
  substituteConfidence: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  substituteSuggestion: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing(0.5),
  },
  substituteNote: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 19,
  },
  substituteAltText: {
    marginTop: spacing(0.5),
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  substituteInventoryTag: {
    marginTop: spacing(1),
    alignSelf: 'flex-start',
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  ratingCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.xl,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingSubtitle: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: spacing(0.5),
    marginBottom: spacing(2),
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(2),
    paddingHorizontal: spacing(1),
  },
  ratingActions: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1),
  },

  // Ingredient Stats
  ingredientStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginTop: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: 'rgba(214, 138, 56, 0.15)',
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  referenceIngredientStatsRow: {
    minHeight: rs(44),
    borderRadius: rs(18),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    backgroundColor: 'rgba(116, 71, 27, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.12)',
  },
  ingredientStatsText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  referenceIngredientStatsText: {
    fontSize: rs(14),
    lineHeight: rs(18),
  },
});
