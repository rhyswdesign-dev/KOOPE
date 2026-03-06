/**
 * Spirit Images Index
 * Centralized exports for all spirit bottle images
 */

export const spiritImages = {
  tequila: require('./koope-tequila.png'),
  whiskey: require('./koope-whiskey.png'),
  rum: require('./koope-rum.png'),
  gin: require('./koope-gin.png'),
  vodka: require('./koope-vodka.png'),
  brandy: require('./koope-brandy.png'),
  scotch: require('./koope-scotch.png'),
  mezcal: require('./koope-mezcal.png'),
};

export type SpiritType = keyof typeof spiritImages;

export function getSpiritImage(spirit: string): any {
  const normalizedSpirit = spirit.toLowerCase() as SpiritType;
  return spiritImages[normalizedSpirit] || spiritImages.whiskey; // Default fallback
}
