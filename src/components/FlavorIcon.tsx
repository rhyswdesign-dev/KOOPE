/**
 * FlavorIcon — hand-illustrated SVG icons for spirit flavor profiles.
 *
 * Each icon is purpose-drawn for its flavor category rather than using
 * generic icon library glyphs. Add new entries to FLAVOR_ICON_MAP and
 * FLAVOR_SVGS to extend coverage.
 *
 * Usage:
 *   <FlavorIcon flavor="Dark chocolate" size={28} color="#C9A84C" />
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, Line, Polyline, G } from 'react-native-svg';

interface FlavorIconProps {
  flavor: string;
  size?: number;
  color?: string;
}

// ─── Keyword → icon key ──────────────────────────────────────────────────────
// Listed most-specific → least-specific so earlier matches win.

const FLAVOR_ICON_MAP: Array<{ keywords: string[]; key: string }> = [
  // ── Smoke & peat ──────────────────────────────────────────────────────────
  { keywords: ['campfire', 'bonfire', 'charred'], key: 'campfire' },
  { keywords: ['charcoal'], key: 'campfire' },
  { keywords: ['peat', 'peaty'], key: 'peat' },
  { keywords: ['smoke', 'smoky', 'smoked', 'ashy', 'ash'], key: 'smoke' },
  // ── Chocolate & coffee ────────────────────────────────────────────────────
  { keywords: ['dark chocolate', 'bitter chocolate', 'cocoa nibs', 'bittersweet', 'cacao'], key: 'chocolate' },
  { keywords: ['chocolate', 'cocoa'], key: 'chocolate' },
  { keywords: ['coffee', 'espresso', 'mocha'], key: 'coffee' },
  // ── Dairy & cream ─────────────────────────────────────────────────────────
  { keywords: ['vanilla', 'custard', 'cream', 'butter', 'creamy', 'butterscotch', 'silky', 'velvety'], key: 'vanilla' },
  // ── Citrus ────────────────────────────────────────────────────────────────
  { keywords: ['orange peel', 'orange zest', 'orange'], key: 'orange' },
  { keywords: ['lemon', 'lemon myrtle', 'lime', 'grapefruit', 'citrus', 'zest', 'bitter'], key: 'citrus' },
  // ── Coastal & marine ──────────────────────────────────────────────────────
  { keywords: ['coastal', 'sea brine', 'sea salt', 'saline', 'briny', 'marine', 'seaweed', 'brine', 'ocean'], key: 'coastal' },
  // ── Tropical ──────────────────────────────────────────────────────────────
  { keywords: ['pineapple'], key: 'pineapple' },
  { keywords: ['coconut'], key: 'coconut' },
  { keywords: ['mango', 'papaya', 'passionfruit', 'guava', 'banana', 'tropical'], key: 'tropical' },
  // ── Melon ─────────────────────────────────────────────────────────────────
  { keywords: ['melon', 'cantaloupe', 'honeydew', 'watermelon'], key: 'melon' },
  // ── Stone & dried fruit ───────────────────────────────────────────────────
  { keywords: ['cherry', 'morello', 'maraschino'], key: 'cherry' },
  { keywords: ['raisin', 'sultana', 'dried fruit', 'prune', 'fig', 'date', 'currant', 'dried rose', 'dried herbs'], key: 'driedfruit' },
  { keywords: ['apricot', 'dried apricot', 'peach', 'nectarine', 'plum', 'stone fruit'], key: 'stone' },
  { keywords: ['apple', 'green apple', 'pear', 'orchard', 'fruit', 'fruity', 'dark fruit', 'light fruit'], key: 'apple' },
  { keywords: ['berry', 'blackberry', 'raspberry', 'strawberry', 'blueberry', 'cranberry', 'black raspberry'], key: 'berry' },
  { keywords: ['grape'], key: 'grape' },
  // ── Floral ────────────────────────────────────────────────────────────────
  { keywords: ['rose', 'dried rose'], key: 'rose' },
  { keywords: ['elderflower', 'lavender', 'lilac', 'violet', 'saffron', 'marigold', 'jasmine', 'honeysuckle', 'blossom', 'floral', 'flower', 'desert floral'], key: 'floral' },
  // ── Tea ───────────────────────────────────────────────────────────────────
  { keywords: ['gunpowder tea', 'tea', 'earl grey', 'green tea', 'white tea', 'chai'], key: 'tea' },
  // ── Grain & cereal ────────────────────────────────────────────────────────
  { keywords: ['malt', 'malted', 'grain', 'corn', 'wheat', 'rye', 'rice', 'bison grass', 'cereal', 'bready', 'bread'], key: 'grain' },
  // ── Sweet & confection ────────────────────────────────────────────────────
  { keywords: ['honey', 'honeycomb', 'heather honey'], key: 'honey' },
  { keywords: ['caramel', 'toffee', 'fudge', 'treacle', 'molasses', 'brown sugar'], key: 'caramel' },
  { keywords: ['marzipan', 'almond paste'], key: 'almond' },
  { keywords: ['sweet', 'sugar', 'syrup', 'confection', 'raw cane', 'sugar cane', 'cane'], key: 'sweet' },
  // ── Spice ─────────────────────────────────────────────────────────────────
  { keywords: ['black pepper', 'white pepper', 'pepper'], key: 'pepper' },
  { keywords: ['coriander', 'angelica', 'cinnamon', 'nutmeg', 'allspice', 'clove', 'cardamom', 'anise', 'spice', 'spiced', 'baking spice', 'ginger', 'oriental spice'], key: 'spice' },
  // ── Tobacco ───────────────────────────────────────────────────────────────
  { keywords: ['tobacco', 'cigar', 'pipe'], key: 'tobacco' },
  // ── Wood & oak ────────────────────────────────────────────────────────────
  { keywords: ['barrel', 'cask'], key: 'barrel' },
  { keywords: ['oak', 'wood', 'cedar', 'timber', 'tannin', 'toasted wood', 'toasted oak', 'french wood', 'white oak'], key: 'oak' },
  // ── Herbal & green ────────────────────────────────────────────────────────
  { keywords: ['mint', 'menthol'], key: 'mint' },
  { keywords: ['eucalyptus', 'pine', 'resin', 'forest', 'myrrh', 'resinous'], key: 'pine' },
  { keywords: ['juniper', 'botanical'], key: 'juniper' },
  { keywords: ['agave', 'cactus', 'cenizo agave', 'salmiana agave'], key: 'agave' },
  { keywords: ['cucumber', 'artichoke', 'herbal', 'herb', 'grass', 'grassy', 'green', 'herbs', 'dried herbs'], key: 'herb' },
  // ── Earthy & mineral ──────────────────────────────────────────────────────
  { keywords: ['mineral', 'slate', 'flint', 'chalk', 'medicinal', 'iodine', 'tcp'], key: 'mineral' },
  { keywords: ['earthy', 'earthiness', 'earth', 'soil', 'damp', 'mossy', 'musty', 'leather', 'ester', 'funky', 'funk', 'pot still'], key: 'earth' },
  // ── Heat ──────────────────────────────────────────────────────────────────
  { keywords: ['overproof heat', 'heat', 'warming heat', 'fire', 'char'], key: 'campfire' },
  // ── Nuts ──────────────────────────────────────────────────────────────────
  { keywords: ['almond', 'walnut', 'hazelnut', 'pecan', 'nut'], key: 'nut' },
  // ── Wine & spirit cask finishes ───────────────────────────────────────────
  { keywords: ['pedro ximénez', 'ximénez', 'ximen', 'px', 'sherry', 'oloroso', 'amontillado'], key: 'sherry' },
  { keywords: ['port', 'port wine', 'madeira', 'sauternes', 'wine', 'cognac', 'rum finish', 'bordeaux', 'white wine'], key: 'wine' },
  // ── Fresh & water ─────────────────────────────────────────────────────────
  { keywords: ['clean', 'crisp', 'fresh', 'bright', 'water', 'light', 'neutral', 'smooth', 'soft', 'subtle sweetness', 'subtle vanilla', 'soft grain'], key: 'water' },
  // ── Complexity descriptors ────────────────────────────────────────────────
  { keywords: ['balanced'], key: 'balanced' },
  { keywords: ['rich', 'deep', 'bold', 'intense', 'full', 'robust', 'powerful', 'complex', 'layered', 'aromatic', 'distinct', 'elegant', 'refined'], key: 'rich' },
];

export function getFlavorIconKey(flavor: string): string {
  const lower = flavor.toLowerCase();
  for (const { keywords, key } of FLAVOR_ICON_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return key;
  }
  return 'rich';
}

// ─── SVG Illustrations ───────────────────────────────────────────────────────
// All drawn on a 32×32 viewBox. strokeWidth is relative to that grid.

type IconRenderer = (color: string) => React.ReactNode;

const FLAVOR_SVGS: Record<string, IconRenderer> = {

  // 🍫 Chocolate bar — segmented grid
  chocolate: (c) => (
    <>
      <Rect x="4" y="8" width="24" height="16" rx="2.5" fill="none" stroke={c} strokeWidth="1.8" />
      <Line x1="4" y1="14" x2="28" y2="14" stroke={c} strokeWidth="1.4" />
      <Line x1="4" y1="20" x2="28" y2="20" stroke={c} strokeWidth="1.4" />
      <Line x1="12" y1="8" x2="12" y2="24" stroke={c} strokeWidth="1.4" />
      <Line x1="20" y1="8" x2="20" y2="24" stroke={c} strokeWidth="1.4" />
    </>
  ),

  // ☕ Coffee — cup with steam
  coffee: (c) => (
    <>
      <Path d="M7 13h14l-2 9H9L7 13z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M21 15h2a3 3 0 0 1 0 6h-2" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M11 10 Q11.5 8 11 6" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M15 10 Q15.5 8 15 6" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),

  // 🍦 Vanilla pod / cream swirl
  vanilla: (c) => (
    <>
      <Path d="M16 5 Q22 10 20 18 Q18 24 16 27 Q14 24 12 18 Q10 10 16 5z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M13 14 Q16 12 19 14" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M13 18 Q16 16 19 18" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🍊 Orange slice (cross-section)
  orange: (c) => (
    <>
      <Circle cx="16" cy="16" r="11" fill="none" stroke={c} strokeWidth="1.8" />
      <Circle cx="16" cy="16" r="7" fill="none" stroke={c} strokeWidth="1.2" />
      <Line x1="16" y1="9" x2="16" y2="23" stroke={c} strokeWidth="1.2" />
      <Line x1="9" y1="16" x2="23" y2="16" stroke={c} strokeWidth="1.2" />
      <Line x1="11" y1="11" x2="21" y2="21" stroke={c} strokeWidth="1.2" />
      <Line x1="21" y1="11" x2="11" y2="21" stroke={c} strokeWidth="1.2" />
    </>
  ),

  // 🍋 Citrus wedge
  citrus: (c) => (
    <>
      <Path d="M16 5 A11 11 0 0 1 27 16 L16 16 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Circle cx="16" cy="16" r="11" fill="none" stroke={c} strokeWidth="1.8" />
      <Line x1="16" y1="5" x2="16" y2="16" stroke={c} strokeWidth="1.4" />
      <Line x1="27" y1="16" x2="16" y2="16" stroke={c} strokeWidth="1.4" />
      <Path d="M19 10 Q22 13 22 16" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M22 10 Q25 13 25 16" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🍍 Pineapple
  pineapple: (c) => (
    <>
      <Path d="M16 8 Q21 10 21 18 Q21 24 16 26 Q11 24 11 18 Q11 10 16 8z" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M13 11 Q16 10 19 11" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M12 15 Q16 13.5 20 15" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M12 19 Q16 17.5 20 19" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M14 4 Q16 8 18 4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11 6 Q14 9 13 5" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M21 6 Q18 9 19 5" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🥥 Coconut (half)
  coconut: (c) => (
    <>
      <Path d="M8 16 A8 8 0 0 1 24 16 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M8 16 Q16 20 24 16" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="16" cy="16" r="4" fill="none" stroke={c} strokeWidth="1.4" />
      <Path d="M16 5 Q18 10 16 12" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🌴 Tropical (palm leaf)
  tropical: (c) => (
    <>
      <Path d="M16 28 L16 14" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M16 18 Q10 12 6 8 Q10 7 14 12" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 18 Q22 12 26 8 Q22 7 18 12" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 15 Q11 9 9 5 Q13 6 16 12" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // 🍒 Cherry — two cherries on a stem
  cherry: (c) => (
    <>
      <Circle cx="11" cy="22" r="5" fill="none" stroke={c} strokeWidth="1.8" />
      <Circle cx="21" cy="22" r="5" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M11 17 Q11 10 16 6 Q21 10 21 17" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // 🫐 Dried/Dark fruit — cluster of small circles
  driedfruit: (c) => (
    <>
      <Circle cx="12" cy="20" r="4" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="20" cy="20" r="4" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="16" cy="13" r="4" fill="none" stroke={c} strokeWidth="1.6" />
      <Path d="M16 9 Q17 6 19 5" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🍑 Stone fruit (peach/apricot side view)
  stone: (c) => (
    <>
      <Path d="M16 6 Q25 8 25 17 Q25 25 16 27 Q7 25 7 17 Q7 8 16 6z" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M16 6 Q16 16 14 27" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M13 4 Q16 6 15 3" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🍎 Apple
  apple: (c) => (
    <>
      <Path d="M16 10 Q22 8 24 15 Q26 22 20 26 Q18 27 16 26 Q14 27 12 26 Q6 22 8 15 Q10 8 16 10z" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M16 10 Q16 7 18 5" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M16 10 Q13 7 11 8" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🍇 Berry — cluster
  berry: (c) => (
    <>
      <Circle cx="16" cy="10" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="10" cy="17" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="22" cy="17" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="13" cy="24" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="19" cy="24" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Path d="M16 6.5 Q17 4 19 3" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🍇 Grape cluster
  grape: (c) => (
    <>
      <Circle cx="13" cy="14" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="19" cy="14" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="10" cy="20" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="16" cy="21" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="22" cy="20" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Circle cx="16" cy="27" r="3.5" fill="none" stroke={c} strokeWidth="1.6" />
      <Path d="M16 10.5 Q16 7 18 5" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M16 7 Q12 4 10 5" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🌹 Rose
  rose: (c) => (
    <>
      <Path d="M16 24 L16 14" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M16 20 Q12 19 10 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M16 18 Q20 17 22 14" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M16 14 Q13 10 14 7 Q16 9 17 7 Q18 9 20 8 Q20 12 16 14z" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <Path d="M14 7 Q15 4 16 5 Q17 4 18 7" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // 🌸 Floral — five-petal flower
  floral: (c) => (
    <>
      <Circle cx="16" cy="16" r="3" fill="none" stroke={c} strokeWidth="1.6" />
      <Ellipse cx="16" cy="8" rx="3" ry="4.5" fill="none" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="16" cy="24" rx="3" ry="4.5" fill="none" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="8" cy="16" rx="4.5" ry="3" fill="none" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="24" cy="16" rx="4.5" ry="3" fill="none" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="10.5" cy="10.5" rx="3.5" ry="2" transform="rotate(-45 10.5 10.5)" fill="none" stroke={c} strokeWidth="1.4" />
      <Ellipse cx="21.5" cy="21.5" rx="3.5" ry="2" transform="rotate(-45 21.5 21.5)" fill="none" stroke={c} strokeWidth="1.4" />
    </>
  ),

  // 🍯 Honey drip
  honey: (c) => (
    <>
      <Path d="M10 8 Q10 5 16 5 Q22 5 22 8 L21 20 Q21 26 16 26 Q11 26 11 20 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M16 23 Q16 27 14 29" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="13" y1="12" x2="19" y2="12" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="12" y1="16" x2="20" y2="16" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🍬 Caramel/toffee — wrapped sweet
  caramel: (c) => (
    <>
      <Rect x="9" y="12" width="14" height="10" rx="3" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M9 15 Q6 16 5 19 Q6 20 9 19" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M23 15 Q26 16 27 19 Q26 20 23 19" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="16" y1="12" x2="16" y2="22" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🌸 Sweet (generic sugar crystal)
  sweet: (c) => (
    <>
      <Path d="M16 5 L17.8 11.2 L24 11.2 L19 15 L20.9 21.2 L16 17.5 L11.1 21.2 L13 15 L8 11.2 L14.2 11.2 Z" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),

  // 🫚 Almond / marzipan
  almond: (c) => (
    <>
      <Ellipse cx="16" cy="16" rx="7" ry="11" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M16 5 Q17 9 16 16" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M16 16 Q15.5 22 16 27" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M9.5 13 Q13 11 16 13" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🌶️ Pepper corn
  pepper: (c) => (
    <>
      <Circle cx="16" cy="18" r="8" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M16 10 Q16 7 18 5 Q15 5 14 8" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 15 Q14 13 18 15" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M11 19 Q14 17 21 19" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🫙 Spice jar
  spice: (c) => (
    <>
      <Rect x="10" y="12" width="12" height="14" rx="2" fill="none" stroke={c} strokeWidth="1.8" />
      <Rect x="11" y="9" width="10" height="3" rx="1.5" fill="none" stroke={c} strokeWidth="1.5" />
      <Line x1="14" y1="17" x2="18" y2="17" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="14" y1="20" x2="18" y2="20" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Circle cx="16" cy="14" r="1" fill={c} />
    </>
  ),

  // 🛢️ Barrel
  barrel: (c) => (
    <>
      <Ellipse cx="16" cy="9" rx="9" ry="3.5" fill="none" stroke={c} strokeWidth="1.7" />
      <Ellipse cx="16" cy="23" rx="9" ry="3.5" fill="none" stroke={c} strokeWidth="1.7" />
      <Line x1="7" y1="9" x2="7" y2="23" stroke={c} strokeWidth="1.7" />
      <Line x1="25" y1="9" x2="25" y2="23" stroke={c} strokeWidth="1.7" />
      <Path d="M7 16 Q16 19 25 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M7 13 Q16 10 25 13" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🌳 Oak / wood grain
  oak: (c) => (
    <>
      <Path d="M16 28 L16 16 Q12 10 8 8 Q12 6 16 10 Q20 6 24 8 Q20 10 16 16" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M16 20 Q11 17 9 14" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M16 22 Q20 19 22 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🌿 Mint leaf
  mint: (c) => (
    <>
      <Path d="M16 26 Q10 20 10 14 Q10 8 16 7 Q22 8 22 14 Q22 20 16 26z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Line x1="16" y1="7" x2="16" y2="26" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M16 13 Q12 11 10 13" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M16 13 Q20 11 22 13" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M16 18 Q12 16 10.5 18" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M16 18 Q20 16 21.5 18" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🌲 Pine / eucalyptus tree
  pine: (c) => (
    <>
      <Path d="M16 4 L22 14 H19 L24 22 H18 L18 28 H14 L14 22 H8 L13 14 H10 Z" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),

  // 🫐 Juniper berry cluster
  juniper: (c) => (
    <>
      <Circle cx="16" cy="17" r="4" fill="none" stroke={c} strokeWidth="1.7" />
      <Circle cx="10" cy="13" r="3" fill="none" stroke={c} strokeWidth="1.5" />
      <Circle cx="22" cy="13" r="3" fill="none" stroke={c} strokeWidth="1.5" />
      <Path d="M16 13 Q16 9 14 7" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M14 7 Q12 5 10 6" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M16 13 Q18 9 20 8" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🌵 Agave plant
  agave: (c) => (
    <>
      <Path d="M16 28 L16 16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M16 20 Q9 18 6 12 Q10 11 14 17" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 20 Q23 18 26 12 Q22 11 18 17" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 16 Q10 13 8 7 Q12 7 15 13" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 16 Q22 13 24 7 Q20 7 17 13" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // 🌱 Herb / sprout
  herb: (c) => (
    <>
      <Path d="M16 28 L16 18" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M16 22 Q10 20 8 14 Q14 12 16 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 18 Q22 16 24 10 Q18 8 16 16" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 16 Q16 10 13 6 Q15 9 18 10 Q17 7 19 5 Q20 9 16 14" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // 💎 Mineral / crystal
  mineral: (c) => (
    <>
      <Path d="M16 4 L24 10 L21 26 H11 L8 10 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M8 10 L16 15 L24 10" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="16" y1="15" x2="16" y2="26" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="11" y1="26" x2="16" y2="15" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="21" y1="26" x2="16" y2="15" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🌍 Earth / soil
  earth: (c) => (
    <>
      <Circle cx="16" cy="16" r="11" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M5 16 Q10 12 16 16 Q22 20 27 16" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M8 10 Q12 14 11 20" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M20 8 Q22 13 21 19" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🥜 Nut
  nut: (c) => (
    <>
      <Path d="M16 6 Q23 8 23 16 Q23 24 16 26 Q9 24 9 16 Q9 8 16 6z" fill="none" stroke={c} strokeWidth="1.8" />
      <Path d="M16 6 Q16 14 14.5 26" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M16 6 Q18 14 19 26" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M10 13 Q16 11 22 13" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🍷 Sherry / wine glass
  sherry: (c) => (
    <>
      <Path d="M10 6 Q10 16 16 20 Q22 16 22 6 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Line x1="16" y1="20" x2="16" y2="26" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="12" y1="26" x2="20" y2="26" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M10 12 Q16 14 22 12" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🍷 Wine glass (taller, narrower — for port/wine)
  wine: (c) => (
    <>
      <Path d="M11 5 Q11 17 16 20 Q21 17 21 5 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Line x1="16" y1="20" x2="16" y2="26" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="12" y1="26" x2="20" y2="26" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M11 13 Q16 16 21 13" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 💧 Water / fresh
  water: (c) => (
    <>
      <Path d="M16 5 Q22 13 22 19 A6 6 0 0 1 10 19 Q10 13 16 5z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M13 20 Q15 17 17 20" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // 🔥 Campfire / char
  campfire: (c) => (
    <>
      <Path d="M16 24 Q8 20 10 12 Q13 16 14 12 Q15 8 13 5 Q18 7 19 12 Q20 16 23 12 Q25 18 16 24z" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />
      <Line x1="10" y1="26" x2="22" y2="26" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="8" y1="28" x2="24" y2="28" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),

  // 🌫️ Peat / earthy smoke
  peat: (c) => (
    <>
      <Path d="M6 20 Q10 16 16 18 Q22 20 26 16" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M8 14 Q12 10 18 13 Q22 15 26 11" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M10 8 Q14 5 20 8" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M6 24 Q16 26 26 24" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 2" />
    </>
  ),

  // 💨 Smoke wisps
  smoke: (c) => (
    <>
      <Path d="M12 26 Q10 22 12 18 Q14 14 12 10 Q14 12 14 16 Q14 20 16 22" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M19 26 Q17 22 19 17 Q21 12 18 8 Q21 10 21 15 Q21 19 23 22" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M9 26 Q9 22 10 19" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  // ⚖️ Balanced — scales
  balanced: (c) => (
    <>
      <Line x1="16" y1="6" x2="16" y2="26" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
      <Line x1="10" y1="8" x2="22" y2="8" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M10 8 L7 16 Q10 18 13 16 L10 8" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M22 8 L19 16 Q22 18 25 16 L22 8" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <Line x1="13" y1="26" x2="19" y2="26" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),

  // 🌊 Coastal / sea brine — wave with salt spray
  coastal: (c) => (
    <>
      <Path d="M4 20 Q8 15 12 20 Q16 25 20 20 Q24 15 28 20" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M4 14 Q8 9 12 14 Q16 19 20 14 Q24 9 28 14" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M10 8 Q12 6 14 8" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M18 6 Q20 4 22 6" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M14 10 Q15 8 16 10" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🍈 Melon — cross-section with rind and segments
  melon: (c) => (
    <>
      <Path d="M6 16 A10 10 0 0 1 26 16 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M6 16 Q16 20 26 16" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M11 16 Q13 11 16 10 Q19 11 21 16" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="16" y1="10" x2="16" y2="16" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="10" y1="16" x2="12" y2="12" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="22" y1="16" x2="20" y2="12" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // 🍵 Tea — teacup with steam
  tea: (c) => (
    <>
      <Path d="M8 14 Q8 24 16 24 Q24 24 24 14 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M24 16 Q28 16 28 20 Q28 24 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="6" y1="26" x2="26" y2="26" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M12 10 Q12.5 7 12 5" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M16 11 Q16.5 8 16 6" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M20 10 Q20.5 7 20 5" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // 🌾 Grain / malt — wheat stalk with ears
  grain: (c) => (
    <>
      <Line x1="16" y1="28" x2="16" y2="8" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M16 8 Q13 5 10 7 Q12 10 16 10" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 8 Q19 5 22 7 Q20 10 16 10" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 13 Q13 10 10 12 Q12 15 16 15" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 13 Q19 10 22 12 Q20 15 16 15" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 18 Q13 15 10 17 Q12 20 16 20" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 18 Q19 15 22 17 Q20 20 16 20" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // 🚬 Tobacco — rolled cigar with band ring
  tobacco: (c) => (
    <>
      <Path d="M6 16 Q6 12 10 12 L24 12 Q26 12 26 16 Q26 20 24 20 L10 20 Q6 20 6 16 Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <Line x1="21" y1="12" x2="21" y2="20" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="23" y1="12" x2="23" y2="20" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M26 14 Q29 14 29 16 Q29 18 26 18" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M27 12 Q30 11 30 9" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M28 13 Q31 13 31 11" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),

  // ✨ Rich / complex — layered wave lines
  rich: (c) => (
    <>
      <Path d="M6 10 Q10 7 14 10 Q18 13 22 10 Q24 8 26 10" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M6 16 Q10 13 14 16 Q18 19 22 16 Q24 14 26 16" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M6 22 Q10 19 14 22 Q18 25 22 22 Q24 20 26 22" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FlavorIcon: React.FC<FlavorIconProps> = ({ flavor, size = 28, color = '#C9A84C' }) => {
  const key = getFlavorIconKey(flavor);
  const renderer = FLAVOR_SVGS[key] ?? FLAVOR_SVGS.rich;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {renderer(color)}
    </Svg>
  );
};
