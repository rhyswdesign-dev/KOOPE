/**
 * Styles for RecipesScreen's "almost-makeable" recipe cards and related
 * UI — extracted verbatim (Phase 5, god-file breakup). Pure StyleSheet
 * definitions, no component state.
 */
import { StyleSheet } from 'react-native';
import { colors, spacing, radii, serif } from '../theme/tokens';

export const afStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,138,56,0.3)',
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: spacing(1.5),
    marginBottom: spacing(0.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1),
    paddingBottom: spacing(1.5),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: serif,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(2),
  },
  section: {
    marginTop: spacing(2),
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginBottom: spacing(1.5),
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,138,56,0.18)',
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
    paddingRight: spacing(2),
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.25),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.2)',
  },
  pillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  pillTextSelected: {
    color: colors.goldText,
    fontWeight: '700',
  },
  clearBtn: {
    marginTop: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  footer: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(1.5),
    paddingBottom: spacing(1),
  },
  applyBtn: {
    paddingVertical: spacing(2),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.goldText,
    letterSpacing: 0.3,
  },
});
