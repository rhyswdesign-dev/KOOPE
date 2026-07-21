/**
 * Shared spirit/flavor chip taxonomy for lightweight 2-tap preference
 * questionnaires — used by GiftModePanel (per-scan, ephemeral "who's this
 * for") and TastePromptPanel (one-time, persisted "what do YOU like").
 * Same taxonomy, different purpose per caller — kept in one place so the
 * option lists never drift apart.
 */
import type { FlavorProfile } from '../types/userProfile';

export const SPIRIT_CHIP_OPTIONS: { label: string; value: string }[] = [
  { label: 'Whiskey', value: 'whiskey' },
  { label: 'Gin', value: 'gin' },
  { label: 'Rum', value: 'rum' },
  { label: 'Tequila', value: 'tequila' },
  { label: 'Vodka', value: 'vodka' },
  { label: 'Not sure', value: '' },
];

export const FLAVOR_CHIP_OPTIONS: { label: string; value: FlavorProfile }[] = [
  { label: 'Citrus & Fresh', value: 'citrus' },
  { label: 'Herbal & Green', value: 'herbal' },
  { label: 'Bitter & Complex', value: 'bitter' },
  { label: 'Sweet & Fruity', value: 'sweet' },
  { label: 'Smoky & Bold', value: 'smoky' },
  { label: 'Floral & Light', value: 'floral' },
  { label: 'Spiced & Warm', value: 'spiced' },
];
