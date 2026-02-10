import { Platform } from 'react-native';

/**
 * Typography Helpers
 */
export const getSerifFont = () => Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif'
});

export const serif = getSerifFont();

/**
 * Global Design System - All colors centralized here
 * Change these values to instantly update your entire app
 */
export const colors = {
  // App Structure
  bg: '#1A120D', // espresso brown - primary background
  card: '#2B1F17', // darker brown - section / card background
  modalOverlay: 'rgba(0,0,0,0.8)', // modal backgrounds
  modalBg: '#3B291F', // modal content background

  // Navigation
  headerBg: '#1A120D', // same as primary background
  headerText: '#F2E5D5', // soft cream - header title/back button

  // Chips & Pills
  chipBg: '#3A2A1F',
  chipActive: '#5A3F2A',
  chipBorder: 'rgba(255,255,255,0.08)',

  // Text Hierarchy
  text: '#F2E5D5', // soft cream - primary text
  textLight: '#F2E5D5', // soft cream
  textMuted: '#C7B8A5', // muted cream - secondary text
  subtext: '#C7B8A5', // muted cream - tertiary text
  subtle: '#C7B8A5', // muted cream
  muted: 'rgba(242,229,213,0.35)', // disabled text

  // Accents & Highlights (Amber/Gold)
  gold: '#D68A38', // amber gold - primary accent
  goldText: '#1A120D', // dark text on gold
  accent: '#D68A38', // amber gold - unified accent
  accentDark: '#E89C40', // glowing gold for gradients
  accentText: '#D68A38', // accent text color
  accentLight: '#E89C40', // highlighted icons

  // System Colors
  white: '#FFFFFF',
  line: 'rgba(255,255,255,0.08)', // borders/dividers
  border: 'rgba(255,255,255,0.08)', // border color alias
  shadow: 'rgba(0,0,0,0.35)',
  error: '#F44336', // error/danger color
  success: '#4CAF50', // success color
  successDark: '#388E3C', // darker success for gradients
  warning: '#FF9800', // warning color
  destructive: '#F44336', // destructive action color
  cardBg: '#2B1B12', // card background (alias to card)
  
  // Curriculum specific
  curriculumLocked: 'rgba(242, 229, 213, 0.4)',
  curriculumLockedText: '#8B6743', 
  curriculumInProgress: '#D68A38',

  // Avatar/Profile
  avatar: '#2A241F', // avatar background

  // Tier Colors
  tierGold: '#FFD700',
  tierSilver: '#C0C0C0',
  tierBronze: '#CD7F32',
  tierTextOnGold: '#000000',
  tierTextOnSilver: '#000000',
  tierTextOnBronze: '#FFFFFF',

  // Component-specific (legacy names - use accent instead)
  // pillButtonColor removed - use colors.accent
  pillTextOnLight: '#000000',
  pillTextOnDark: '#FFFFFF',

  // Secondary colors for PillButton variants
  secondary: '#3A2A1F',
  secondaryText: '#F5ECDF',

  // Nested background colors for components
  background: {
    elevated: '#2B1F17', // same as card background
    primary: '#1A120D',  // same as bg
    secondary: '#2B1F17', // same as card
  },
};

export const spacing = (n: number) => 8 * n;

export const radii = {
  sm: 10,    // small elements
  md: 14,    // medium cards/inputs
  lg: 18,    // large cards
  xl: 22,    // pill buttons (22-24px)
  pill: 9999, // full pill shape
  full: 9999, // alias for pill (full rounded)
};

export const fonts = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 13,
  caption: 12,
  micro: 10,
};

// Global Text Styles
export const textStyles = {
  h1: {
    fontSize: fonts.h1,
    fontWeight: '900' as const,
    color: colors.text,
    lineHeight: fonts.h1 * 1.2,
  },
  h2: {
    fontSize: fonts.h2,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: fonts.h2 * 1.2,
  },
  h3: {
    fontSize: fonts.h3,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: fonts.h3 * 1.3,
  },
  body: {
    fontSize: fonts.body,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: fonts.body * 1.5,
  },
  bodyMedium: {
    fontSize: fonts.body,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: fonts.body * 1.5,
  },
  small: {
    fontSize: fonts.small,
    fontWeight: '400' as const,
    color: colors.subtext,
    lineHeight: fonts.small * 1.4,
  },
  caption: {
    fontSize: fonts.small,
    fontWeight: '400' as const,
    color: colors.subtle,
    lineHeight: fonts.small * 1.3,
  },
};

// Standardized Text Styles for Cards/CTAs
export const standardText = {
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.textLight,
    marginBottom: 0, // No margin, controlled by body text
  },
  body: {
    fontSize: 15,
    color: colors.subtle,
    lineHeight: 20,
    marginTop: 6, // Consistent gap under title
  },
};

// Global Button Styles
export const buttons = {
  primary: {
    backgroundColor: colors.accent, // amber/gold fill
    color: colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.75),
    borderRadius: radii.pill, // full pill shape
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
  },
  secondary: {
    backgroundColor: 'transparent',
    color: colors.accent, // amber text
    fontSize: 16,
    fontWeight: '600' as const,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.75),
    borderRadius: radii.pill, // full pill shape
    borderWidth: 1.5,
    borderColor: colors.accent, // amber border
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
  },
  tertiary: {
    backgroundColor: 'transparent',
    color: colors.text, // cream text
    fontSize: 16,
    fontWeight: '600' as const,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
  },
  pill: {
    backgroundColor: colors.accent,
    color: colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.75),
    borderRadius: radii.pill,
    height: 48,
    minWidth: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
  },
  // Standardized CTA button for cards
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
    marginTop: spacing(2),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.white,
  },
};

// Global Layout Styles
export const layouts = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(2),
  },
  section: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(3),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

// Global Component Styles
export const components = {
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.avatar,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end' as const,
  },
  header: {
    backgroundColor: colors.headerBg,
  },
  headerText: {
    color: colors.headerText,
    fontWeight: '800' as const,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  icon: {
    color: colors.accentLight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
};
