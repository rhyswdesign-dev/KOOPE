/**
 * Taste Signal Line Generator
 *
 * Produces a single passive sentence shown below the flavour strip on
 * BottleDetailScreen once totalScans >= 3. No icon, no label — just copy.
 *
 * Logic:
 *   - Overlap: bottle shares tags with dominantCluster → affinity line
 *   - Outlier: bottle shares 0 tags with dominantCluster → stretch line
 *   - No cluster yet: returns null
 */

import type { FlavourTag, TasteModel } from '../store/useTasteModel';
import { normaliseFlavours } from '../store/useTasteModel';

// ── Phrasing templates ────────────────────────────────────────────────────────

const AFFINITY_TEMPLATES = [
  (tag: string) => `Leans ${tag} — matches what you've been scanning.`,
  (tag: string) => `Your scans show a lean toward ${tag} profiles. This fits.`,
  (tag: string) => `Strong ${tag} character. Sits right in your wheelhouse.`,
  (tag: string) => `${tag[0].toUpperCase() + tag.slice(1)}-forward — consistent with your recent picks.`,
  (tag: string) => `Runs ${tag}. Right in line with what you've been choosing.`,
];

const OUTLIER_TEMPLATES = [
  () => 'Different from your usual picks. Worth exploring.',
  () => 'Outside your usual lane — could be something new.',
  () => 'Doesn\'t match your recent scans. Might surprise you.',
  () => 'A stretch from your typical profile. Good for variety.',
];

function pick<T>(arr: T[], seed: string): T {
  // Deterministic pick from array based on string seed (bottle name hash).
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return arr[hash % arr.length];
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getTasteSignalLine(
  bottleFlavorProfile: string[],
  bottleName: string,
  tasteModel: TasteModel
): string | null {
  if (tasteModel.totalScans < 3) return null;
  if (tasteModel.dominantCluster.length === 0) return null;

  const bottleTags = normaliseFlavours(bottleFlavorProfile);
  const overlap = bottleTags.filter((tag) => tasteModel.dominantCluster.includes(tag));

  if (overlap.length > 0) {
    const tag = overlap[0];
    const template = pick(AFFINITY_TEMPLATES, bottleName);
    return template(tag);
  }

  const template = pick(OUTLIER_TEMPLATES, bottleName);
  return template();
}

// ── Display label for a FlavourTag ───────────────────────────────────────────

export function flavourTagLabel(tag: FlavourTag): string {
  return tag[0].toUpperCase() + tag.slice(1);
}
