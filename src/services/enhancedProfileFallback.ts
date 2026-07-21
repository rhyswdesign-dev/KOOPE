// @ts-nocheck
import { createDefaultUserProfile, getABVRangeForPreference } from '../types/userProfile';

export function buildTasteProfileFromPersonalization(personalizationProfile: any) {
  const flavorWeights = {
    citrus: 0,
    herbal: 0,
    bitter: 0,
    sweet: 0,
    smoky: 0,
    floral: 0,
    spiced: 0,
  };

  const spiritWeights = {
    tequila: 0,
    whiskey: 0,
    rum: 0,
    gin: 0,
    vodka: 0,
    brandy: 0,
    liqueurs: 0,
    'gin-alternative': 0,
    'rum-alternative': 0,
    none: 0,
  };

  (personalizationProfile?.favoriteSpirits || []).forEach((spirit: string, index: number) => {
    if (Object.prototype.hasOwnProperty.call(spiritWeights, spirit)) {
      spiritWeights[spirit as keyof typeof spiritWeights] = Math.max(
        0.15,
        (personalizationProfile?.spiritScores?.[spirit] ?? 90 - index * 10) / 100,
      );
    }
  });

  (personalizationProfile?.flavorPreferences || []).forEach((flavor: string, index: number) => {
    if (Object.prototype.hasOwnProperty.call(flavorWeights, flavor)) {
      flavorWeights[flavor as keyof typeof flavorWeights] = Math.max(
        0.15,
        (personalizationProfile?.flavorScores?.[flavor] ?? 85 - index * 5) / 100,
      );
    }
  });

  return {
    flavorWeights,
    spiritWeights,
    preferredABV: getABVRangeForPreference(personalizationProfile?.preferredABV || 'alcoholic'),
    preferredComplexity: Math.max(
      0,
      Math.min(1, (personalizationProfile?.complexityScore ?? 50) / 100),
    ),
  };
}

export function buildEnhancedProfileFallback(
  userId: string | undefined,
  personalizationProfile: any,
  savedItems: any,
) {
  const profile = createDefaultUserProfile(userId || 'guest');
  const savedRecipeIds = (savedItems?.savedCocktails || [])
    .map((item: any) => item.id)
    .filter(Boolean);
  const preferredSpirits = (personalizationProfile?.favoriteSpirits || []).filter(
    (spirit: string) =>
      [
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
      ].includes(spirit),
  );
  const preferredFlavors = (personalizationProfile?.flavorPreferences || []).filter(
    (flavor: string) =>
      ['citrus', 'herbal', 'bitter', 'sweet', 'smoky', 'floral', 'spiced'].includes(flavor),
  );

  profile.savedRecipes = savedRecipeIds;
  profile.favoriteRecipes = savedRecipeIds;
  profile.favoriteSpirit = preferredSpirits[0];
  profile.spiritPreferences = preferredSpirits as any;
  profile.flavorProfiles = preferredFlavors as any;
  profile.skillLevel = personalizationProfile?.skillLevel || profile.skillLevel;
  profile.preferredABVRange = getABVRangeForPreference(
    personalizationProfile?.preferredABV || 'alcoholic',
  );
  profile.tasteProfile = buildTasteProfileFromPersonalization(personalizationProfile);

  return profile;
}
