// @ts-nocheck
/**
 * Question Icon Configuration
 * Maps question topics and keywords to visual icons for MCQ and Match exercises
 */

import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

// Icon mapping by topic/keyword
export const topicIcons: Record<string, IconName> = {
  // Spirits
  'gin': 'flask',
  'rum': 'water',
  'tequila': 'leaf',
  'vodka': 'snow',
  'whiskey': 'bonfire',
  'brandy': 'wine',
  'spirit': 'flask-outline',
  'alcohol': 'flask',
  'liqueur': 'water-outline',

  // Glassware
  'glass': 'wine',
  'glassware': 'wine',
  'coupe': 'wine',
  'rocks': 'cube',
  'collins': 'flask-outline',
  'martini': 'wine',
  'highball': 'flask-outline',
  'shot': 'fitness',

  // Ingredients
  'lemon': 'leaf',
  'lime': 'leaf-outline',
  'mint': 'leaf',
  'fruit': 'nutrition',
  'citrus': 'nutrition-outline',
  'herb': 'leaf',
  'syrup': 'water',
  'sugar': 'nutrition',
  'bitters': 'water-outline',
  'juice': 'water',

  // Tools & Equipment
  'shaker': 'fitness',
  'jigger': 'calculator',
  'strainer': 'funnel',
  'muddler': 'hammer',
  'barspoon': 'git-branch',
  'tool': 'build',
  'equipment': 'construct',
  'bartools': 'construct-outline',

  // Techniques
  'shake': 'sync',
  'stir': 'refresh',
  'muddle': 'hammer-outline',
  'strain': 'funnel-outline',
  'build': 'layers',
  'layer': 'layers-outline',
  'technique': 'finger-print',
  'method': 'git-branch-outline',

  // Bartender Traits & Service
  'hospitality': 'heart',
  'service': 'people',
  'communication': 'chatbubbles',
  'patience': 'hourglass',
  'confidence': 'shield-checkmark',
  'cleanliness': 'sparkles',
  'hygiene': 'medical',
  'trust': 'shield',
  'awareness': 'eye',
  'attention': 'eye-outline',
  'greeting': 'hand-left',
  'smile': 'happy',
  'guest': 'person',
  'customer': 'people-outline',
  'host': 'home',

  // Knowledge & Learning
  'recipe': 'book',
  'classic': 'star',
  'history': 'time',
  'origin': 'location',
  'fact': 'information-circle',
  'tip': 'bulb',
  'curiosity': 'search',
  'learn': 'school',

  // Flavor & Tasting
  'flavor': 'flower',
  'taste': 'rose',
  'aroma': 'nose',
  'sweet': 'ice-cream',
  'sour': 'leaf',
  'bitter': 'water-outline',
  'balance': 'scale',
  'profile': 'speedometer',

  // Mixing & Preparation
  'mix': 'shuffle',
  'blend': 'sync-circle',
  'combine': 'git-merge',
  'pour': 'water',
  'measure': 'calculator-outline',
  'ratio': 'stats-chart',
  'proportion': 'pie-chart',

  // Safety & Responsibility
  'safety': 'shield-checkmark',
  'responsible': 'checkmark-circle',
  'alcohol-awareness': 'alert-circle',
  'moderation': 'hand-right',

  // Presentation & Garnish
  'garnish': 'flower-outline',
  'presentation': 'images',
  'appearance': 'eye',
  'aesthetic': 'color-palette',
  'style': 'brush',

  // Party & Events
  'party': 'people',
  'batch': 'beaker',
  'punch': 'beer',
  'hosting': 'home-outline',
  'event': 'calendar',
  'celebration': 'gift',

  // Temperature & Ice
  'ice': 'snow',
  'cold': 'snow-outline',
  'chill': 'thermometer',
  'temperature': 'thermometer-outline',
  'frozen': 'snow',

  // Bar Setup & Organization
  'setup': 'options',
  'organization': 'list',
  'station': 'grid',
  'workspace': 'desktop',
  'inventory': 'file-tray-stacked',

  // Time & Speed
  'speed': 'speedometer',
  'efficiency': 'flash',
  'quick': 'rocket',
  'time': 'time-outline',

  // Music & Atmosphere
  'music': 'musical-notes',
  'atmosphere': 'sunny',
  'ambiance': 'moon',
  'vibe': 'radio',
  'mood': 'color-palette-outline',
};

// Default fallback icons by question type
export const defaultIcons: Record<string, IconName> = {
  'mcq': 'help-circle',
  'match': 'link',
  'checkbox': 'checkbox',
  'order': 'list',
  'short': 'create',
};

// Color scheme for different topic categories
export const topicColors: Record<string, string> = {
  // Spirits - warm amber/gold tones
  'spirit': '#D7A15E',
  'gin': '#8BC6DB',
  'rum': '#C17B3A',
  'tequila': '#98D8C8',
  'vodka': '#E8F4F8',
  'whiskey': '#B8860B',
  'brandy': '#CD853F',

  // Tools - metallic/gray
  'tool': '#9E9E9E',
  'equipment': '#757575',

  // Ingredients - green/natural
  'ingredient': '#81C784',
  'fruit': '#FFB74D',
  'herb': '#66BB6A',

  // Service - warm/friendly
  'service': '#F48FB1',
  'hospitality': '#FF8A80',

  // Knowledge - blue
  'knowledge': '#64B5F6',
  'fact': '#42A5F5',

  // Default
  'default': '#D7A15E',
};

/**
 * Get icon for a question based on its prompt, tags, and type
 */
export function getQuestionIcon(
  prompt: string,
  tags?: string[],
  type?: string
): IconName {
  const searchText = `${prompt} ${tags?.join(' ') || ''}`.toLowerCase();

  // Search through topic icons for keyword matches
  for (const [keyword, icon] of Object.entries(topicIcons)) {
    if (searchText.includes(keyword)) {
      return icon;
    }
  }

  // Fall back to default icon for question type
  if (type && defaultIcons[type]) {
    return defaultIcons[type];
  }

  // Ultimate fallback
  return 'help-circle';
}

/**
 * Get color for a question based on its content
 */
export function getQuestionColor(
  prompt: string,
  tags?: string[]
): string {
  const searchText = `${prompt} ${tags?.join(' ') || ''}`.toLowerCase();

  // Check for spirit mentions first (most specific)
  for (const spirit of ['gin', 'rum', 'tequila', 'vodka', 'whiskey', 'brandy']) {
    if (searchText.includes(spirit)) {
      return topicColors[spirit];
    }
  }

  // Check other categories
  for (const [keyword, color] of Object.entries(topicColors)) {
    if (searchText.includes(keyword)) {
      return color;
    }
  }

  return topicColors.default;
}

/**
 * Get icon for match pair items based on content
 */
export function getMatchPairIcon(text: string): IconName {
  const searchText = text.toLowerCase();

  // Search through topic icons
  for (const [keyword, icon] of Object.entries(topicIcons)) {
    if (searchText.includes(keyword)) {
      return icon;
    }
  }

  // Check for common words that might indicate a category
  if (searchText.includes('keep') || searchText.includes('ensure')) return 'shield-checkmark';
  if (searchText.includes('build') || searchText.includes('create')) return 'construct';
  if (searchText.includes('learn') || searchText.includes('know')) return 'school';
  if (searchText.includes('guest') || searchText.includes('customer')) return 'person';

  // Default
  return 'ellipse';
}

// Preset icon combinations for common lesson types
export const lessonIconPresets = {
  'great-bartender-traits': {
    icon: 'people' as IconName,
    color: '#F48FB1',
  },
  'core-spirits-setup': {
    icon: 'flask' as IconName,
    color: '#D7A15E',
  },
  'glassware-essentials': {
    icon: 'wine' as IconName,
    color: '#64B5F6',
  },
  'basic-tools': {
    icon: 'construct' as IconName,
    color: '#9E9E9E',
  },
  'techniques': {
    icon: 'finger-print' as IconName,
    color: '#81C784',
  },
};
