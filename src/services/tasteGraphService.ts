/**
 * Taste Graph Service — KOOPE PRO
 * Advanced taste intelligence with:
 *   - Read-time decay (preferences fade over time)
 *   - Weight normalization (prevents clustering at 1.0)
 *   - Radar chart data generation
 *   - Manual flavor overrides (PRO slider controls)
 *
 * This is the intelligence moat that justifies $119/yr.
 */

import { TasteProfile, FlavorProfile, Spirit } from '../types/userProfile';

// ============================================================================
// TYPES
// ============================================================================

/** Timestamps for when each weight category was last updated by an interaction */
export interface WeightTimestamps {
  flavors: Partial<Record<FlavorProfile, string>>; // ISO date strings
  spirits: Partial<Record<Spirit, string>>;
  complexity?: string;
}

/** PRO user's manual overrides — pins on the radar chart */
export interface ManualFlavorOverrides {
  /** Flavor weights manually set by the user (0-1). Null = use learned value. */
  flavors: Partial<Record<FlavorProfile, number | null>>;
  /** Spirit weights manually set by the user. */
  spirits: Partial<Record<Spirit, number | null>>;
  /** Last time user adjusted overrides */
  lastModified: string;
}

/** Full Taste Graph state stored on the user profile */
export interface TasteGraphData {
  /** Raw learned weights (from behavioral learning) */
  rawProfile: TasteProfile;
  /** When each weight was last interacted with */
  timestamps: WeightTimestamps;
  /** PRO manual overrides */
  overrides?: ManualFlavorOverrides;
  /** Interaction count per category (for confidence scoring) */
  interactionCounts: {
    flavors: Partial<Record<FlavorProfile, number>>;
    spirits: Partial<Record<Spirit, number>>;
    total: number;
  };
}

/** Radar chart data point */
export interface RadarChartPoint {
  label: string;
  value: number; // 0-1, effective (decayed + normalized)
  rawValue: number; // 0-1, raw (no decay)
  isOverridden: boolean;
  confidence: number; // 0-1 based on interaction count
}

/** Complete radar chart output for the flavor profile dashboard */
export interface FlavorRadarChart {
  flavorPoints: RadarChartPoint[];
  spiritPoints: RadarChartPoint[];
  complexity: { value: number; label: string };
  abvRange: { min: number; max: number; label: string };
  engagementScore: number; // 0-100
  dataConfidence: number; // 0-1
}

// ============================================================================
// DECAY CONFIG
// ============================================================================

/**
 * Decay function: effectiveWeight = rawWeight * max(FLOOR, exp(-RATE * daysSince))
 * - Weight halves after ~140 days
 * - Floors at 30% of original (never fully disappears)
 * - No data loss — raw weights preserved, decay computed on read
 */
const DECAY_RATE = 0.005;
const DECAY_FLOOR = 0.3;

// ============================================================================
// STEERING
// ============================================================================
//
// The PRO sliders used to REPLACE the learned weight outright. That quietly
// destroyed the thing they were built on top of: once a value was pinned, the
// profile could no longer distinguish what the user actually likes from what
// they once said they liked, and no amount of subsequent behaviour could move
// it. Same failure as an onboarding answer that never yields to evidence,
// one level up.
//
// So the model is now two layers:
//   - the MIRROR   (rawProfile) — observed from behaviour, never user-edited.
//   - the STEERING (below)      — an explicit "I want more of this" bias that
//                                 tilts recommendations WITHOUT overwriting
//                                 the mirror.
//
// Steering also fades. An aspiration is a phase ("I'm getting into agave"),
// not a permanent fact, and one set eight months ago should not still be
// bending the feed. The mirror underneath is untouched throughout, so when
// the steering lapses the user is simply themselves again.

/** How far a fully-active steer can pull a weight from its learned value. */
const STEERING_STRENGTH = 0.6;
/** Days after which a steer has faded to nothing. */
const STEERING_FADE_DAYS = 90;

/**
 * How much influence a steer still has, 0-1, given when it was set.
 * Fresh steers pull at full strength; older ones taper to zero.
 */
export function steeringInfluence(lastModified?: string): number {
  if (!lastModified) return 0;
  const days = getDaysSince(lastModified);
  if (!Number.isFinite(days)) return 0;
  if (days <= 0) return 1;
  return Math.max(0, 1 - days / STEERING_FADE_DAYS);
}

/**
 * Blend a steer toward its target without replacing the learned value.
 * At full influence the result sits 60% of the way to the target — the
 * mirror still shows through, which is the point.
 */
function applySteering(
  learned: number,
  target: number | null | undefined,
  influence: number,
): number {
  if (target === undefined || target === null || influence <= 0) return learned;
  const pull = STEERING_STRENGTH * influence;
  return learned * (1 - pull) + target * pull;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Apply read-time decay to a weight value.
 * Raw weight is preserved; decay is computed on read.
 */
export function applyDecay(rawWeight: number, lastInteractedAt?: string): number {
  if (!lastInteractedAt) return rawWeight; // No timestamp = no decay (legacy data)

  const daysSince = getDaysSince(lastInteractedAt);
  if (daysSince <= 0) return rawWeight;

  const decayFactor = Math.max(DECAY_FLOOR, Math.exp(-DECAY_RATE * daysSince));
  return rawWeight * decayFactor;
}

/**
 * Normalize weights so they sum to 1.0.
 * Preserves relative preferences while preventing uniform clustering.
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights);
  const sum = entries.reduce((acc, [, v]) => acc + v, 0);

  if (sum === 0) {
    // All zeros — return uniform distribution
    const uniform = 1 / entries.length;
    return Object.fromEntries(entries.map(([k]) => [k, uniform]));
  }

  return Object.fromEntries(entries.map(([k, v]) => [k, v / sum]));
}

/**
 * Get effective TasteProfile with decay applied and weights normalized.
 * This is the profile used for all recommendations in PRO mode.
 */
export function getEffectiveTasteProfile(graphData: TasteGraphData): TasteProfile {
  const allFlavors: FlavorProfile[] = [
    'citrus',
    'herbal',
    'bitter',
    'sweet',
    'smoky',
    'floral',
    'spiced',
  ];
  const allSpirits: Spirit[] = [
    'tequila',
    'whiskey',
    'rum',
    'gin',
    'vodka',
    'brandy',
    'liqueurs',
    'gin-alternative',
    'rum-alternative',
    'none',
  ];

  // Steering influence fades with age — see the STEERING block above.
  const influence = steeringInfluence(graphData.overrides?.lastModified);

  // Learned weight, decayed, then tilted by any active steer. The steer biases;
  // it never replaces, so behaviour keeps moving the value underneath it.
  const decayedFlavors: Record<FlavorProfile, number> = {} as any;
  for (const flavor of allFlavors) {
    const raw = graphData.rawProfile.flavorWeights[flavor] ?? 0;
    const ts = graphData.timestamps.flavors[flavor];
    decayedFlavors[flavor] = applySteering(
      applyDecay(raw, ts),
      graphData.overrides?.flavors[flavor],
      influence,
    );
  }

  const decayedSpirits: Record<Spirit, number> = {} as any;
  for (const spirit of allSpirits) {
    const raw = graphData.rawProfile.spiritWeights[spirit] ?? 0;
    const ts = graphData.timestamps.spirits[spirit];
    decayedSpirits[spirit] = applySteering(
      applyDecay(raw, ts),
      graphData.overrides?.spirits[spirit],
      influence,
    );
  }

  // Normalize
  const normalizedFlavors = normalizeWeights(decayedFlavors) as Record<FlavorProfile, number>;
  const normalizedSpirits = normalizeWeights(decayedSpirits) as Record<Spirit, number>;

  return {
    flavorWeights: normalizedFlavors,
    spiritWeights: normalizedSpirits,
    preferredABV: graphData.rawProfile.preferredABV,
    preferredComplexity: graphData.rawProfile.preferredComplexity,
  };
}

/**
 * Generate radar chart data for the flavor profile dashboard.
 * PRO users see this as an interactive visualization.
 */
export function generateRadarChart(graphData: TasteGraphData): FlavorRadarChart {
  const allFlavors: FlavorProfile[] = [
    'citrus',
    'herbal',
    'bitter',
    'sweet',
    'smoky',
    'floral',
    'spiced',
  ];
  const displaySpirits: Spirit[] = ['tequila', 'whiskey', 'rum', 'gin', 'vodka', 'brandy'];

  const effective = getEffectiveTasteProfile(graphData);

  // Flavor points
  const flavorPoints: RadarChartPoint[] = allFlavors.map((flavor) => {
    const raw = graphData.rawProfile.flavorWeights[flavor] ?? 0;
    const eff = effective.flavorWeights[flavor] ?? 0;
    const isOverridden =
      graphData.overrides?.flavors[flavor] !== undefined &&
      graphData.overrides?.flavors[flavor] !== null;
    const count = graphData.interactionCounts.flavors[flavor] ?? 0;

    return {
      label: flavorDisplayName(flavor),
      value: eff,
      rawValue: raw,
      isOverridden,
      confidence: Math.min(1, count / 20), // 20 interactions = full confidence
    };
  });

  // Spirit points (exclude alternatives and 'none' for cleaner chart)
  const spiritPoints: RadarChartPoint[] = displaySpirits.map((spirit) => {
    const raw = graphData.rawProfile.spiritWeights[spirit] ?? 0;
    const eff = effective.spiritWeights[spirit] ?? 0;
    const isOverridden =
      graphData.overrides?.spirits[spirit] !== undefined &&
      graphData.overrides?.spirits[spirit] !== null;
    const count = graphData.interactionCounts.spirits[spirit] ?? 0;

    return {
      label: spiritDisplayName(spirit),
      value: eff,
      rawValue: raw,
      isOverridden,
      confidence: Math.min(1, count / 10), // 10 interactions = full confidence
    };
  });

  // Complexity
  const complexity = {
    value: effective.preferredComplexity,
    label:
      effective.preferredComplexity < 0.33
        ? 'Simple'
        : effective.preferredComplexity < 0.66
          ? 'Moderate'
          : 'Complex',
  };

  // ABV
  const abvRange = {
    ...effective.preferredABV,
    label:
      effective.preferredABV.max <= 0.5
        ? 'Zero-Proof'
        : effective.preferredABV.max <= 15
          ? 'Low ABV'
          : 'Standard',
  };

  // Data confidence: average of all point confidences
  const allConfidences = [...flavorPoints, ...spiritPoints].map((p) => p.confidence);
  const dataConfidence =
    allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : 0;

  // Engagement score
  const engagementScore = Math.min(100, Math.round(graphData.interactionCounts.total * 2));

  return {
    flavorPoints,
    spiritPoints,
    complexity,
    abvRange,
    engagementScore,
    dataConfidence,
  };
}

/**
 * Apply a manual flavor override (PRO slider adjustment).
 */
export function setFlavorOverride(
  graphData: TasteGraphData,
  flavor: FlavorProfile,
  value: number | null,
): TasteGraphData {
  const overrides: ManualFlavorOverrides = graphData.overrides ?? {
    flavors: {},
    spirits: {},
    lastModified: new Date().toISOString(),
  };

  if (value === null) {
    delete overrides.flavors[flavor];
  } else {
    overrides.flavors[flavor] = Math.max(0, Math.min(1, value));
  }
  overrides.lastModified = new Date().toISOString();

  return { ...graphData, overrides };
}

/**
 * Apply a manual spirit override (PRO slider adjustment).
 */
export function setSpiritOverride(
  graphData: TasteGraphData,
  spirit: Spirit,
  value: number | null,
): TasteGraphData {
  const overrides: ManualFlavorOverrides = graphData.overrides ?? {
    flavors: {},
    spirits: {},
    lastModified: new Date().toISOString(),
  };

  if (value === null) {
    delete overrides.spirits[spirit];
  } else {
    overrides.spirits[spirit] = Math.max(0, Math.min(1, value));
  }
  overrides.lastModified = new Date().toISOString();

  return { ...graphData, overrides };
}

/**
 * Reset all manual overrides to learned values.
 */
export function clearOverrides(graphData: TasteGraphData): TasteGraphData {
  return { ...graphData, overrides: undefined };
}

/**
 * Initialize TasteGraphData from an existing TasteProfile.
 * Used for migrating PLUS users upgrading to PRO.
 */
export function initializeTasteGraph(profile: TasteProfile): TasteGraphData {
  const now = new Date().toISOString();

  return {
    rawProfile: profile,
    timestamps: {
      flavors: Object.fromEntries(
        Object.keys(profile.flavorWeights).map((k) => [k, now]),
      ) as Partial<Record<FlavorProfile, string>>,
      spirits: Object.fromEntries(
        Object.keys(profile.spiritWeights).map((k) => [k, now]),
      ) as Partial<Record<Spirit, string>>,
      complexity: now,
    },
    interactionCounts: {
      flavors: {},
      spirits: {},
      total: 0,
    },
  };
}

// ============================================================================
// PERSISTENCE
// ============================================================================
//
// The decay and confidence maths above only mean anything if `timestamps` and
// `interactionCounts` survive between sessions. They did not: every read site
// called initializeTasteGraph() on load, which stamps every timestamp as "now"
// and zeroes every count — so decay never decayed and confidence was always ~0.
//
// The graph is persisted inside the existing `users_profiles.taste_profile`
// JSONB column as sibling keys on the TasteProfile object, so no migration is
// needed and every existing reader of .flavorWeights / .spiritWeights keeps
// working untouched. Rows written before this change simply lack the sibling
// keys and fall back to initializeTasteGraph().

/** A TasteProfile plus the graph metadata stored alongside it. */
export interface PersistedTasteProfile extends TasteProfile {
  graphTimestamps?: WeightTimestamps;
  graphInteractionCounts?: TasteGraphData['interactionCounts'];
  graphOverrides?: ManualFlavorOverrides;
}

/**
 * Rebuild a TasteGraphData from what was persisted.
 *
 * Use this instead of initializeTasteGraph() at every read site. Legacy rows
 * (no graph metadata) degrade to initializeTasteGraph()'s behaviour, which is
 * what those rows would have got anyway — no user loses data by this change.
 */
export function hydrateTasteGraph(
  persisted: PersistedTasteProfile | TasteProfile | null | undefined,
): TasteGraphData | null {
  if (!persisted) return null;

  const stored = persisted as PersistedTasteProfile;
  const rawProfile: TasteProfile = {
    flavorWeights: stored.flavorWeights,
    spiritWeights: stored.spiritWeights,
    preferredABV: stored.preferredABV,
    preferredComplexity: stored.preferredComplexity,
  };

  if (!stored.graphTimestamps && !stored.graphInteractionCounts) {
    // Legacy row — no graph metadata was ever written for this user.
    return initializeTasteGraph(rawProfile);
  }

  return {
    rawProfile,
    timestamps: stored.graphTimestamps ?? { flavors: {}, spirits: {} },
    overrides: stored.graphOverrides,
    interactionCounts: stored.graphInteractionCounts ?? {
      flavors: {},
      spirits: {},
      total: 0,
    },
  };
}

/**
 * Flatten a TasteGraphData back into the shape written to
 * `users_profiles.taste_profile`. The four TasteProfile fields stay at the top
 * level so existing consumers are unaffected.
 */
export function toPersistedTasteProfile(graphData: TasteGraphData): PersistedTasteProfile {
  return {
    ...graphData.rawProfile,
    graphTimestamps: graphData.timestamps,
    graphInteractionCounts: graphData.interactionCounts,
    graphOverrides: graphData.overrides,
  };
}

/**
 * Record an interaction timestamp for a specific weight category.
 * Used when mutating a graph in place; the bulk path is tasteVectorService,
 * which derives timestamps directly from the event streams.
 */
export function recordInteraction(
  graphData: TasteGraphData,
  flavors: FlavorProfile[],
  spirit?: Spirit,
): TasteGraphData {
  const now = new Date().toISOString();
  const updated = { ...graphData };
  updated.timestamps = { ...graphData.timestamps };
  updated.interactionCounts = { ...graphData.interactionCounts };

  // Update flavor timestamps and counts
  updated.timestamps.flavors = { ...graphData.timestamps.flavors };
  updated.interactionCounts.flavors = { ...graphData.interactionCounts.flavors };
  for (const flavor of flavors) {
    updated.timestamps.flavors[flavor] = now;
    updated.interactionCounts.flavors[flavor] =
      (graphData.interactionCounts.flavors[flavor] ?? 0) + 1;
  }

  // Update spirit timestamp and count
  if (spirit) {
    updated.timestamps.spirits = { ...graphData.timestamps.spirits };
    updated.interactionCounts.spirits = { ...graphData.interactionCounts.spirits };
    updated.timestamps.spirits[spirit] = now;
    updated.interactionCounts.spirits[spirit] =
      (graphData.interactionCounts.spirits[spirit] ?? 0) + 1;
  }

  updated.interactionCounts.total = (graphData.interactionCounts.total ?? 0) + 1;

  return updated;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDaysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24);
}

function flavorDisplayName(flavor: FlavorProfile): string {
  const map: Record<FlavorProfile, string> = {
    citrus: 'Citrus',
    herbal: 'Herbal',
    bitter: 'Bitter',
    sweet: 'Sweet',
    smoky: 'Smoky',
    floral: 'Floral',
    spiced: 'Spiced',
  };
  return map[flavor] ?? flavor;
}

function spiritDisplayName(spirit: Spirit): string {
  const map: Record<Spirit, string> = {
    tequila: 'Tequila',
    whiskey: 'Whiskey',
    rum: 'Rum',
    gin: 'Gin',
    vodka: 'Vodka',
    brandy: 'Brandy',
    liqueurs: 'Liqueurs',
    'gin-alternative': 'Gin Alt',
    'rum-alternative': 'Rum Alt',
    none: 'Non-Alcoholic',
  };
  return map[spirit] ?? spirit;
}
