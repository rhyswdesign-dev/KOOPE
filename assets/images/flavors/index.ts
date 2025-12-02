/**
 * Flavor Profile Images Index
 * Images for taste profile flavor options
 */

export const flavorImages = {
  sweet: require('./Sweet.png'),
  sour: require('./Sour.png'),
  bitter: require('./Bitter.png'),
  spicy: require('./Spicy.png'),
  salty: require('./Salty.png'),
  herbal: require('./Herbal.png'),
  fruity: require('./Fruity.png'),
  boozy: require('./Boozy.png'),
  umami: require('./Umami.png'),
  floral: require('./Floral.png'),
};

export type FlavorType = keyof typeof flavorImages;

export function getFlavorImage(flavor: string): any {
  const normalizedFlavor = flavor.toLowerCase() as FlavorType;
  return flavorImages[normalizedFlavor] || null;
}
