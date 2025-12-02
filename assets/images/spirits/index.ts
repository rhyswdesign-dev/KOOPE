/**
 * Spirit Images Index
 * Centralized exports for all spirit bottle images
 */

export const spiritImages = {
  tequila: require('./Tequila.png'),
  whiskey: require('./Whiskey.png'),
  rum: require('./Rum.png'),
  gin: require('./Gin.png'),
  vodka: require('./MMS Vodka.png'),
  brandy: require('./Brandy.png'),
  scotch: require('./Scotch.png'),
  mezcal: require('./Mezcal.png'),
};

export type SpiritType = keyof typeof spiritImages;

export function getSpiritImage(spirit: string): any {
  const normalizedSpirit = spirit.toLowerCase() as SpiritType;
  return spiritImages[normalizedSpirit] || spiritImages.whiskey; // Default fallback
}
