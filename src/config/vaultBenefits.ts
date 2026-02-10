/**
 * Vault Item Benefits & Descriptions
 * Detailed descriptions and benefits for preview modal
 */

export interface ItemBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface VaultItemPreview {
  benefits: ItemBenefit[];
  fullDescription: string;
}

// ============================================================================
// COCKTAIL VARIATIONS
// ============================================================================

export const VARIATION_BENEFITS: Record<string, VaultItemPreview> = {
  // Specific variation - Spicy Margarita (custom preview)
  spicy_margarita: {
    fullDescription: "Transform the classic Margarita with controlled heat from fresh jalapeños or habaneros. This variation teaches you the fundamentals of spirit infusion and spice balance—essential skills that translate to dozens of other cocktails. Learn to control heat levels, balance sweetness against spice, and create consistent results every time.",
    benefits: [
      {
        icon: "flame",
        title: "Master Spice Infusion",
        description: "Learn to infuse tequila with jalapeño or habanero for perfect heat levels"
      },
      {
        icon: "flask",
        title: "Balance Sweet & Heat",
        description: "Discover how to balance agave sweetness against spicy kick"
      },
      {
        icon: "restaurant",
        title: "Crowd-Pleaser Recipe",
        description: "Create a modern classic that works for parties and date nights"
      }
    ]
  },

  // Simple Variations (200-300 XP)
  simple: {
    fullDescription: "An approachable twist on a classic cocktail that introduces you to professional techniques while maintaining familiar flavors. Perfect for building confidence and expanding your repertoire.",
    benefits: [
      {
        icon: "flask",
        title: "Easy Technique Introduction",
        description: "Learn one new professional method without overwhelming complexity"
      },
      {
        icon: "heart",
        title: "Crowd-Pleasing Results",
        description: "Impress guests with elevated versions of drinks they already love"
      },
      {
        icon: "book-open",
        title: "Step-by-Step Guidance",
        description: "Detailed instructions designed specifically for home bartenders"
      }
    ]
  },

  // Technique-Forward Variations (350-450 XP)
  technique_forward: {
    fullDescription: "A sophisticated variation that teaches advanced bartending techniques through practical application. These recipes push your skills forward while creating truly memorable cocktails.",
    benefits: [
      {
        icon: "trending-up",
        title: "Skill Development",
        description: "Master professional techniques like fat-washing, clarification, or infusion"
      },
      {
        icon: "star",
        title: "Unique Flavor Profiles",
        description: "Create complex, memorable drinks that stand out from the classics"
      },
      {
        icon: "award",
        title: "Impress Expert Palates",
        description: "Serve cocktails that showcase your growing expertise"
      }
    ]
  },

  // Pro Variations (500+ XP)
  pro: {
    fullDescription: "A cutting-edge recipe that represents the pinnacle of modern mixology. These variations demand precision, advanced techniques, and a deep understanding of flavor composition—designed for serious home bartenders.",
    benefits: [
      {
        icon: "diamond",
        title: "Professional-Grade Recipe",
        description: "Techniques and ingredients used in top cocktail bars worldwide"
      },
      {
        icon: "beaker",
        title: "Advanced Methods",
        description: "Multi-step processes including sous-vide, centrifuge, or molecular techniques"
      },
      {
        icon: "trophy",
        title: "Competition-Ready",
        description: "Recipes refined to the level of cocktail competitions and awards"
      }
    ]
  },
};

// ============================================================================
// TECHNIQUE PLAYBOOKS
// ============================================================================

export const PLAYBOOK_BENEFITS: Record<string, VaultItemPreview> = {
  ICE_STRATEGY: {
    fullDescription: "Master the science and strategy of ice in cocktails. Learn when to use crushed, cubed, or large-format ice, how temperature affects dilution, and the decision frameworks professionals use to choose ice for every drink.",
    benefits: [
      {
        icon: "snow",
        title: "Ice Science Mastery",
        description: "Understand how ice shape, temperature, and clarity affect your cocktails"
      },
      {
        icon: "speedometer",
        title: "Dilution Control",
        description: "Learn to control dilution for perfect texture and flavor balance"
      },
      {
        icon: "construct",
        title: "Professional Systems",
        description: "Decision trees and frameworks used by award-winning bartenders"
      }
    ]
  },

  ACID_CONTROL: {
    fullDescription: "Decode the role of acidity in cocktail balance. This playbook teaches you how to adjust citrus, use acid solutions, and achieve perfect tartness in every drink—from bright and zesty to subtle and nuanced.",
    benefits: [
      {
        icon: "flask",
        title: "Acid Balance Mastery",
        description: "Learn to taste and adjust acidity like a professional"
      },
      {
        icon: "color-palette",
        title: "Flavor Customization",
        description: "Modify classic recipes to match your personal taste preferences"
      },
      {
        icon: "beaker",
        title: "Alternative Acids",
        description: "Work with citric, malic, and tartaric acids for precise control"
      }
    ]
  },

  BATCH_MATH: {
    fullDescription: "Scale cocktails from single servings to party-sized batches without losing quality. Learn the math, proportions, and dilution formulas that ensure consistent results whether you're making one drink or fifty.",
    benefits: [
      {
        icon: "calculator",
        title: "Scaling Made Easy",
        description: "Convert any recipe from single drink to party batch with precision"
      },
      {
        icon: "time",
        title: "Pre-Batch for Events",
        description: "Prep drinks in advance while maintaining professional quality"
      },
      {
        icon: "people",
        title: "Serve with Confidence",
        description: "Host parties knowing every guest gets a perfectly balanced drink"
      }
    ]
  },

  SPEED_SYSTEM: {
    fullDescription: "Learn the efficiency systems and workflows that professional bartenders use to serve drinks quickly without sacrificing quality. From mise en place to muscle memory patterns, master the art of speed.",
    benefits: [
      {
        icon: "flash",
        title: "Efficient Workflows",
        description: "Set up your bar and movements for maximum speed and consistency"
      },
      {
        icon: "hand-left",
        title: "Muscle Memory Patterns",
        description: "Build habits that make complex drinks feel effortless"
      },
      {
        icon: "checkmark-done",
        title: "Multi-Tasking Skills",
        description: "Serve multiple drinks simultaneously with professional technique"
      }
    ]
  },
};

// ============================================================================
// BAR FEATURES
// ============================================================================

export const BAR_BENEFITS: Record<string, VaultItemPreview> = {
  default: {
    fullDescription: "Discover the signature drinks, philosophy, and techniques from one of the world's top cocktail bars. Learn their approach to hospitality, ingredient selection, and the stories behind their most famous creations.",
    benefits: [
      {
        icon: "home",
        title: "Signature Cocktails",
        description: "Access recipes that made this bar famous, adapted for home preparation"
      },
      {
        icon: "book",
        title: "Bar Philosophy",
        description: "Understand their approach to ingredients, balance, and guest experience"
      },
      {
        icon: "bulb",
        title: "Behind-the-Scenes Insights",
        description: "Learn the techniques and secrets that define their style"
      }
    ]
  },

  untitled_champagne_lounge: {
    fullDescription: "Step into Calgary's premier champagne destination. Learn how Untitled Champagne Lounge elevates classic champagne cocktails with modern techniques, local ingredients, and an atmosphere of elegant sophistication.",
    benefits: [
      {
        icon: "wine",
        title: "Champagne Mastery",
        description: "Learn proper champagne handling, temperature, and cocktail techniques"
      },
      {
        icon: "star-outline",
        title: "Luxury Presentation",
        description: "Master elegant glassware, garnishes, and serving rituals"
      },
      {
        icon: "location",
        title: "Calgary's Finest",
        description: "Discover the signature drinks that define Calgary's cocktail scene"
      }
    ]
  },
};

// ============================================================================
// DRINKING GAMES
// ============================================================================

export const GAME_BENEFITS: Record<string, VaultItemPreview> = {
  kings_cup: {
    fullDescription: "Master the official rules, variations, and house strategies for King's Cup. Learn how to pace the game, create memorable rules, and keep the energy high throughout the night.",
    benefits: [
      {
        icon: "trophy",
        title: "Official Rules",
        description: "Learn the definitive ruleset plus popular regional variations"
      },
      {
        icon: "people",
        title: "Perfect for Groups",
        description: "Entertain 4-10 players with one of the most beloved party games"
      },
      {
        icon: "bulb",
        title: "Creative Rule Ideas",
        description: "Access a library of fun, clever rules to make each game unique"
      }
    ]
  },

  beer_pong: {
    fullDescription: "From casual backyard games to competitive tournament play, learn the techniques, strategies, and etiquette of Beer Pong. Includes setup guides, house rules, and tips for hosting tournaments.",
    benefits: [
      {
        icon: "basketball",
        title: "Tournament Rules",
        description: "Master official tournament regulations and scoring systems"
      },
      {
        icon: "school",
        title: "Technique Training",
        description: "Improve your arc, grip, and consistency with pro tips"
      },
      {
        icon: "home",
        title: "Setup & Variations",
        description: "Learn table dimensions, cup arrangements, and creative rule mods"
      }
    ]
  },

  flip_cup: {
    fullDescription: "The ultimate team drinking game that combines speed, coordination, and friendly competition. Learn optimal techniques, team strategies, and how to organize epic flip cup tournaments.",
    benefits: [
      {
        icon: "flash",
        title: "Speed Techniques",
        description: "Master the wrist flick and cup positioning for faster flips"
      },
      {
        icon: "people-circle",
        title: "Team Strategy",
        description: "Learn optimal player order and psychological tactics"
      },
      {
        icon: "medal",
        title: "Tournament Organization",
        description: "Host bracket-style competitions with proper rules and scoring"
      }
    ]
  },

  ring_of_fire: {
    fullDescription: "The British cousin of King's Cup with unique rule variations that make it a distinct experience. Learn the critical 'breaking the ring' rule, Thumb Master strategies, and how stacking Jack rules creates escalating chaos throughout the night.",
    benefits: [
      {
        icon: "flame",
        title: "Unique British Rules",
        description: "Learn rule variations like Thumb Master and the 'breaking the ring' penalty"
      },
      {
        icon: "layers",
        title: "Escalating Gameplay",
        description: "Jack rules stack throughout the game, creating increasingly wild conditions"
      },
      {
        icon: "people",
        title: "Works with Any Group Size",
        description: "Scales from 2 players to large parties with no setup changes"
      }
    ]
  },

  fuzzy_duck: {
    fullDescription: "A deceptively simple tongue-twister game that becomes hilariously difficult as the night progresses. Master the timing of direction reversals to catch opponents off guard, and learn why this game has been a British pub staple for decades.",
    benefits: [
      {
        icon: "chatbubble",
        title: "Tongue-Twister Mastery",
        description: "Learn the rhythm and timing that separates winners from drinkers"
      },
      {
        icon: "refresh",
        title: "Reversal Strategy",
        description: "Use 'Does He?' at the perfect moment to trip up your opponents"
      },
      {
        icon: "happy",
        title: "Guaranteed Laughs",
        description: "One of the funniest games to play — slip-ups are half the entertainment"
      }
    ]
  },

  truth_or_dare: {
    fullDescription: "Elevate the classic Truth or Dare with curated question decks, escalating dare tiers, and a drinking penalty system that keeps everyone engaged. Includes over 100 prompts organized by intensity level, from icebreaker to no-holds-barred.",
    benefits: [
      {
        icon: "help-circle",
        title: "Curated Prompt Decks",
        description: "100+ truths and dares organized by intensity: Mild, Spicy, and Extreme"
      },
      {
        icon: "trending-up",
        title: "Escalation System",
        description: "Built-in progression from icebreaker rounds to peak-night intensity"
      },
      {
        icon: "shield",
        title: "Boundary Guidelines",
        description: "Framework for setting ground rules so everyone stays comfortable"
      }
    ]
  },

  most_likely_to: {
    fullDescription: "The easiest drinking game to learn and one of the most entertaining to play. Simply vote on who in your group is most likely to do something ridiculous, and the winner (or loser) drinks. Includes 150+ curated prompts for every occasion.",
    benefits: [
      {
        icon: "thumbs-up",
        title: "150+ Curated Prompts",
        description: "Prompts for every vibe: funny, embarrassing, wholesome, and wild"
      },
      {
        icon: "people",
        title: "Zero Equipment Needed",
        description: "Just friends and drinks — no cards, cups, or balls required"
      },
      {
        icon: "time",
        title: "Perfect Icebreaker",
        description: "Great for mixed groups and getting the party energy going"
      }
    ]
  },

  rage_cage: {
    fullDescription: "The most intense drinking game on this list. Rage Cage combines speed, pressure, and the dreaded 'death cup' into a chaotic race around the table. Learn the stacking mechanic, first-shot strategy, and how to set up the perfect death cup for maximum drama.",
    benefits: [
      {
        icon: "flash",
        title: "High-Intensity Gameplay",
        description: "Non-stop action where speed and accuracy determine who drinks"
      },
      {
        icon: "layers",
        title: "Stacking Mechanic",
        description: "Master the signature move — stack your cup on slower players"
      },
      {
        icon: "alert-circle",
        title: "Death Cup Strategy",
        description: "Learn placement and pour strategies for the dreaded center cup"
      }
    ]
  },

  power_hour: {
    fullDescription: "The ultimate endurance challenge: 60 shots of beer in 60 minutes. Simple in concept, legendary in execution. Includes timer integration, playlist recommendations, and survival strategies for making it all the way through — plus the Century Club variant for true legends.",
    benefits: [
      {
        icon: "time",
        title: "Built-in Timer",
        description: "Automatic 60-second intervals keep the pace consistent and fair"
      },
      {
        icon: "musical-notes",
        title: "Playlist Integration",
        description: "Curated Power Hour playlists where songs change every 60 seconds"
      },
      {
        icon: "trophy",
        title: "Endurance Challenge",
        description: "Track your progress and earn bragging rights for completing the full hour"
      }
    ]
  },
};

// ============================================================================
// SEASONAL DROPS
// ============================================================================

export const SEASONAL_BENEFITS: Record<string, VaultItemPreview> = {
  default: {
    fullDescription: "Limited-time seasonal content curated around holidays, ingredients, and cultural moments. These exclusive recipes and techniques are only available for a short window—unlock them before they rotate out.",
    benefits: [
      {
        icon: "calendar",
        title: "Seasonal Relevance",
        description: "Recipes perfectly timed to ingredient availability and occasions"
      },
      {
        icon: "gift",
        title: "Limited Availability",
        description: "Exclusive content that rotates out—collect while you can"
      },
      {
        icon: "star",
        title: "Holiday Entertaining",
        description: "Impress guests with drinks designed for specific celebrations"
      }
    ]
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getBenefitsForVariation(difficulty: 'simple' | 'technique_forward' | 'pro'): VaultItemPreview {
  return VARIATION_BENEFITS[difficulty];
}

export function getBenefitsForPlaybook(type: string): VaultItemPreview {
  return PLAYBOOK_BENEFITS[type] || PLAYBOOK_BENEFITS.ICE_STRATEGY;
}

export function getBenefitsForBar(barId: string): VaultItemPreview {
  // Check for exact match first, then try stripping 'bar_' prefix
  if (BAR_BENEFITS[barId]) {
    return BAR_BENEFITS[barId];
  }

  // Strip 'bar_' prefix if present to match benefit keys
  const cleanId = barId.replace('bar_', '');
  return BAR_BENEFITS[cleanId] || BAR_BENEFITS.default;
}

export function getBenefitsForGame(gameId: string): VaultItemPreview {
  // Strip 'vault_game_' or 'game_' prefix if present to match benefit keys
  const cleanId = gameId.replace('vault_game_', '').replace('game_', '');
  return GAME_BENEFITS[cleanId] || GAME_BENEFITS.kings_cup;
}

export function getBenefitsForSeasonal(): VaultItemPreview {
  return SEASONAL_BENEFITS.default;
}
