// @ts-nocheck
/**
 * Question Image Mapper
 * Maps question content to appropriate images from our assets
 */

import { spirits } from '../assets/images/spirits';
import { glassware } from '../assets/images/glassware';
import { techniques } from '../assets/images/techniques';
import { ingredients } from '../assets/images/ingredients';
import { syrups } from '../assets/images/syrups';
import { branding } from '../assets/images/branding';
import { ImageSourcePropType } from 'react-native';

type ImageSource = ImageSourcePropType;

// Keyword to image mappings
const imageMap: Record<string, ImageSource> = {
  // Spirits
  'gin': spirits.gin,
  'rum': spirits.rum,
  'tequila': spirits.tequila,
  'vodka': branding.vodka,
  'whiskey': branding.whiskey,
  'brandy': spirits.brandy,
  'scotch': branding.scotch,

  // Glassware
  'collins glass': glassware.collins,
  'collins': glassware.collins,
  'coupe': glassware.coupe,
  'martini glass': glassware.martini,
  'martini': glassware.martini,
  'rocks glass': glassware.rocks,
  'rocks': glassware.rocks,
  'old fashioned glass': glassware.rocks,
  'brandy snifter': glassware.brandySnifter,
  'snifter': glassware.brandySnifter,
  'shot glass': glassware.shot,
  'shot': glassware.shot,

  // Ingredients
  'lemon': ingredients.lemon,
  'lime': ingredients.lime,
  'mint': ingredients.mint,
  'basil': ingredients.basil,
  'orange': ingredients.orange,
  'grapefruit': ingredients.grapefruit,
  'strawberry': ingredients.strawberry,
  'blueberry': ingredients.blueberry,
  'raspberry': ingredients.raspberry,
  'cherry': ingredients.cherry,
  'pineapple': ingredients.pineapple,
  'watermelon': ingredients.watermelon,
  'lavender': ingredients.lavender,
  'rose': ingredients.rose,

  // Liqueurs
  'amaro': ingredients.amaro,
  'elderflower': ingredients.elderflowerLiquor,
  'creme de cacao': ingredients.cremeDeCacao,
  'orange liqueur': ingredients.orangeLiquor,
  'triple sec': ingredients.orangeLiquor,
  'cointreau': ingredients.orangeLiquor,

  // Syrups
  'simple syrup': syrups.simple,
  'blueberry syrup': syrups.blueberry,
  'raspberry syrup': syrups.raspberry,
  'mango syrup': syrups.mango,
  'herbal syrup': syrups.herbal,

  // Techniques
  'shaker': techniques.bartools,
  'bartools': techniques.bartools,
  'bar tools': techniques.bartools,
  'muddling': techniques.muddling,
  'stirring': techniques.stirring,
  'stir': techniques.stirring,
  'layered': techniques.layered,
  'layer': techniques.layered,
  'sour': techniques.sour,
  'infusion': techniques.infusion,
  'negroni': techniques.negroni,
  'citrus juice': techniques.citrusJuice,
  'juicing': techniques.citrusJuice,
};

/**
 * Get image for a question or option based on text content
 */
export function getImageForText(text: string): ImageSource | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // Check for exact matches first
  for (const [keyword, image] of Object.entries(imageMap)) {
    if (lowerText.includes(keyword)) {
      return image;
    }
  }

  return null;
}

/**
 * Get image for an MCQ option
 */
export function getImageForOption(
  optionText: string,
  prompt: string,
  tags?: string[]
): ImageSource | null {
  // Try to find image from option text
  let image = getImageForText(optionText);

  // If no match, try prompt
  if (!image) {
    image = getImageForText(prompt);
  }

  // If still no match, try tags
  if (!image && tags) {
    for (const tag of tags) {
      image = getImageForText(tag);
      if (image) break;
    }
  }

  return image;
}

/**
 * Check if a question should display images based on its content
 */
export function shouldShowImages(prompt: string, options?: string[], tags?: string[]): boolean {
  const allText = [
    prompt,
    ...(options || []),
    ...(tags || []),
  ].join(' ').toLowerCase();

  // Check if question is about visual items
  const visualKeywords = [
    'glass', 'spirit', 'ingredient', 'tool', 'garnish', 'syrup',
    'gin', 'rum', 'vodka', 'whiskey', 'tequila', 'brandy',
    'collins', 'martini', 'coupe', 'rocks', 'shot',
    'lemon', 'lime', 'mint', 'orange', 'fruit',
  ];

  return visualKeywords.some(keyword => allText.includes(keyword));
}

/**
 * Get header image for a question (shown above prompt)
 */
export function getQuestionHeaderImage(prompt: string, tags?: string[]): ImageSource | null {
  // For questions specifically asking about identification
  if (prompt.toLowerCase().includes('which') ||
      prompt.toLowerCase().includes('what') ||
      prompt.toLowerCase().includes('identify')) {

    // Check tags first for more context
    if (tags) {
      for (const tag of tags) {
        const image = getImageForText(tag);
        if (image) return image;
      }
    }

    // Then check prompt
    return getImageForText(prompt);
  }

  return null;
}