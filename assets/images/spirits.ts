/**
 * Spirit Images
 * Use these imports for spirit-related imagery
 */

export const spirits = {
  gin: require('./spirits/koope-gin.png'),
  gin1: require('./spirits/koope-gin01.png'),
  rum: require('./spirits/koope-rum.png'),
  rum1: require('./spirits/koope-rum01.png'),
  tequila: require('./spirits/koope-tequila.png'),
  brandy: require('./spirits/koope-brandy.png'),
  whiskey: require('./spirits/koope-whiskey.png'),
  vodka: require('./spirits/koope-vodka.png'),
  scotch: require('./spirits/koope-scotch.png'),
  mezcal: require('./spirits/koope-mezcal.png'),
} as const;

export type SpiritKey = keyof typeof spirits;
