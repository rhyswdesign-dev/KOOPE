import { Ionicons } from '@expo/vector-icons';

export type ScreenTourId =
  | 'tab_lessons'
  | 'tab_discover'
  | 'tab_camera'
  | 'tab_inventory'
  | 'tab_profile'
  | 'feature_lesson_engine'
  | 'feature_smart_scan'
  | 'feature_recipe_detail'
  | 'cellar_home'
  | 'cellar_market'
  | 'cellar_register'
  | 'cellar_watch'
  | 'cellar_vault'
  | 'cellar_bottle_detail'
  | 'trial_pro_unlock';

export interface ScreenTourSlide {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const SCREEN_TOURS: Record<ScreenTourId, ScreenTourSlide[]> = {
  tab_lessons: [
    {
      title: 'Lessons Tab',
      body: 'Start with guided bartending lessons and track your progress with XP and streaks.',
      icon: 'school-outline',
    },
    {
      title: 'Challenges',
      body: 'Complete weekly and monthly challenges to unlock more rewards and recipes.',
      icon: 'trophy-outline',
    },
    {
      title: 'Level Up',
      body: 'Use this tab to build your skills before jumping into advanced recipes.',
      icon: 'bar-chart-outline',
    },
  ],
  tab_discover: [
    {
      title: 'Discover Tab',
      body: 'Browse recipes, moods, and personalized recommendations from your activity.',
      icon: 'compass-outline',
    },
    {
      title: 'Save + Build Lists',
      body: 'Save cocktails you like and turn ingredients into a shopping list quickly.',
      icon: 'bookmark-outline',
    },
    {
      title: 'Upgrade Features',
      body: 'Some advanced recommendations and controls are unlocked through paid tiers.',
      icon: 'diamond-outline',
    },
  ],
  tab_camera: [
    {
      title: 'Camera Tab',
      body: 'Scan bottles, labels, and recipe clues to add items faster to your bar.',
      icon: 'camera-outline',
    },
    {
      title: 'Smart Scan',
      body: 'Use Smart Scan for barcode-first lookup and AI-assisted recognition paths.',
      icon: 'scan-outline',
    },
    {
      title: 'Manual Fallback',
      body: 'If a bottle is not found, you can still add it manually to keep moving.',
      icon: 'create-outline',
    },
  ],
  tab_inventory: [
    {
      title: 'Inventory Tab',
      body: 'Manage bottles and ingredients in your home bar with searchable categories.',
      icon: 'wine-outline',
    },
    {
      title: 'Optimize + Restock',
      body: 'Use optimization and restock nudges to decide what to buy next.',
      icon: 'sparkles-outline',
    },
    {
      title: 'Shopping Cart',
      body: 'Move missing items to shopping lists and plan future purchases.',
      icon: 'cart-outline',
    },
  ],
  tab_profile: [
    {
      title: 'Profile Tab',
      body: 'Track XP, streaks, unlocked content, and saved items in one place.',
      icon: 'person-outline',
    },
    {
      title: 'Settings + Support',
      body: 'Open settings to manage account, subscriptions, notifications, and support.',
      icon: 'settings-outline',
    },
    {
      title: 'Keep It Current',
      body: 'Revisit this tab to manage your preferences and review your app progress.',
      icon: 'refresh-outline',
    },
  ],
  feature_lesson_engine: [
    {
      title: 'Lesson Engine',
      body: 'Each lesson is interactive and tracks your correct answers and mastery gains.',
      icon: 'reader-outline',
    },
    {
      title: 'Completion Summary',
      body: 'When you finish, you will see XP awarded and your skill progression details.',
      icon: 'checkmark-done-outline',
    },
  ],
  feature_smart_scan: [
    {
      title: 'Smart Scan Flow',
      body: 'Scan starts with barcode matching, then falls back to additional recognition paths.',
      icon: 'barcode-outline',
    },
    {
      title: 'Consent + Tier Rules',
      body: 'Free and paid tiers may see different scan behavior depending on consent and features.',
      icon: 'shield-checkmark-outline',
    },
  ],
  feature_recipe_detail: [
    {
      title: 'Recipe Detail',
      body: 'Review ingredients, steps, and batch options before making the drink.',
      icon: 'restaurant-outline',
    },
    {
      title: 'Log What You Used',
      body: 'Use the make flow to capture brands, substitutions, and personal modifications.',
      icon: 'clipboard-outline',
    },
    {
      title: 'Rate + Learn',
      body: 'After completion, add rating and notes to improve future recommendations.',
      icon: 'star-outline',
    },
  ],

  // ─── Cellar Tours ────────────────────────────────────────────────────────────

  cellar_home: [
    {
      title: 'Your Cellar',
      body: 'This is your collector dashboard. The large number at the top is your total estimated portfolio value — updated as you log purchase prices and valuations.',
      icon: 'cube-outline',
    },
    {
      title: 'Ready to Open',
      body: 'Bottles whose drinking window is active or approaching. Tap any card to see your full collector dossier, including a Hold / Open Soon / Review directive.',
      icon: 'wine-outline',
    },
    {
      title: 'Top Movers',
      body: 'Bottles where your estimated value is furthest above your purchase price — a quick read on what\'s appreciating in your collection.',
      icon: 'trending-up-outline',
    },
    {
      title: 'ADD ASSET',
      body: 'Tap ADD ASSET at the bottom to register a new acquisition with purchase price, condition, and strategy. The more detail you log, the sharper every recommendation gets.',
      icon: 'add-circle-outline',
    },
    {
      title: 'Navigate the Cellar',
      body: 'Use the tab bar below to switch between MARKET (analytics), + (register), WATCH (watchlist), and VAULT (featured lot detail).',
      icon: 'grid-outline',
    },
  ],

  cellar_market: [
    {
      title: 'Market Overview',
      body: 'Your total portfolio value, calculated from all bottles where you\'ve logged a valuation estimate. Tap 1Y / 5Y / ALL to see simulated performance curves.',
      icon: 'bar-chart-outline',
    },
    {
      title: 'Category Split',
      body: 'See how your collection breaks down by spirit type — Whisky, Rum, Cognac, and so on. Spot gaps or imbalances at a glance.',
      icon: 'pie-chart-outline',
    },
    {
      title: 'Portfolio Holdings',
      body: 'Every bottle you\'ve added, listed by estimated value. This is your full inventory view. Tap REGISTER NEW ASSET to log an acquisition directly from here.',
      icon: 'list-outline',
    },
  ],

  cellar_register: [
    {
      title: 'Log an Acquisition',
      body: 'This is the intake form for a new bottle. Fill in the purchase details when you buy — the more you record, the sharper your Hold / Open / Review recommendations will be.',
      icon: 'document-text-outline',
    },
    {
      title: 'Condition & Seal',
      body: 'Condition (Mint / Excellent / Good) affects resale value. Seal status (Sealed / Opened) affects drinking window logic — opened bottles are tracked differently.',
      icon: 'shield-checkmark-outline',
    },
    {
      title: 'Fill Level',
      body: 'Use the slider to record how full the bottle is. 100% means factory-sealed. This matters for aged whisky and collector bottles where fill level affects value.',
      icon: 'water-outline',
    },
    {
      title: 'Strategy',
      body: 'Tag your intent — DRINK, HOLD, or RESELL. This shapes the recommendations you\'ll see on the bottle detail and in your VAULT view.',
      icon: 'flag-outline',
    },
    {
      title: 'Secure to Vault',
      body: 'Tap SECURE TO VAULT to save the acquisition record. Then add the bottle to your inventory bar (Home Bar) to sync the full tasting and brand profile.',
      icon: 'lock-closed-outline',
    },
  ],

  cellar_watch: [
    {
      title: 'Your Watchlist',
      body: 'Bottles you\'re tracking but haven\'t bought yet. Watch cards show market pricing signals and rarity indicators to help you time future acquisitions.',
      icon: 'eye-outline',
    },
    {
      title: 'Watch Cards',
      body: 'Each card shows current market price, trend percentage, rarity tier, and drinking window. Tap the bookmark icon on any card to pin or unpin it from your active watch.',
      icon: 'bookmark-outline',
    },
    {
      title: 'Category Filter',
      body: 'Tap a category chip at the top to filter your watchlist by spirit type. Useful when you\'re focused on a specific area of the market.',
      icon: 'filter-outline',
    },
  ],

  cellar_vault: [
    {
      title: 'Featured Lot',
      body: 'The VAULT shows your highest-rated bottle in full collector detail. It\'s a deep read on a single bottle — valuation, condition, metrics, and a curated recommendation.',
      icon: 'shield-outline',
    },
    {
      title: 'Browse Your Lots',
      body: 'Use the ← and → arrows next to the "LOT X OF Y" breadcrumb to move through every bottle in your cellar. The lot counter shows where you are in the collection.',
      icon: 'arrow-forward-outline',
    },
    {
      title: 'Collector Metrics',
      body: 'Three cards below the bottle image: Scarcity Score (rarity on secondary market), Asset Status (current fill level), and Market Velocity (demand signal). Use these to inform timing.',
      icon: 'analytics-outline',
    },
    {
      title: 'Hold / Open / Review',
      body: 'This directive is generated from your price data and drinking window. HOLD means it\'s appreciating. OPEN SOON means the window is live. REVIEW means more data needed.',
      icon: 'compass-outline',
    },
    {
      title: 'Edit Your Data',
      body: 'Tap the pencil icon (top right) to update purchase price, estimated value, drinking window, and tasting notes. Keeping this current sharpens every recommendation.',
      icon: 'pencil-outline',
    },
  ],

  cellar_bottle_detail: [
    {
      title: 'Collector Dossier',
      body: 'This screen is the full record for one bottle — price history, condition, secondary market context, and a curated collector recommendation.',
      icon: 'document-outline',
    },
    {
      title: 'Price Comparison',
      body: 'The two numbers at the top are what you paid vs. the current estimated value. The percentage below shows your gain or loss. Green means the bottle is appreciating.',
      icon: 'cash-outline',
    },
    {
      title: 'Edit Button',
      body: 'Tap EDIT (top right) to update purchase price, valuation, drinking window, quantity, and notes at any time. The more current this data, the better your directives.',
      icon: 'pencil-outline',
    },
    {
      title: 'Collector Directive',
      body: 'HOLD, OPEN SOON, or REVIEW — generated from your price and window data. The Curator\'s Rationale below it explains the logic in plain language.',
      icon: 'shield-checkmark-outline',
    },
  ],

  // ─── Trial Pro Unlock Tour ────────────────────────────────────────────────

  trial_pro_unlock: [
    {
      title: 'PRO is Now Live',
      body: 'For the next 48 hours, you have full PRO access. This is everything KOOPE can do — explore it before your trial ends.',
      icon: 'flash-outline',
    },
    {
      title: 'Vault Weekly Drops',
      body: 'A new featured cocktail drops every week — full editorial story, technique notes, and sourcing context. Find it in the Vault tab. This week\'s drop is already live.',
      icon: 'shield-outline',
    },
    {
      title: 'Pro Recipe Builder',
      body: 'Build cocktails from scratch using classic ratios, or remix an existing recipe and save your version. Find it in the Recipes tab under "Build a Recipe".',
      icon: 'construct-outline',
    },
    {
      title: 'Hosting Tools',
      body: 'Planning a gathering? Enter your guest count and KOOPE picks the right cocktails, scales ingredients, and builds a prep timeline. Find it in your bar menu.',
      icon: 'people-outline',
    },
    {
      title: '48 Hours — Make It Count',
      body: 'Your trial ends in 2 days. When it does, you\'ll be asked to choose a plan. PLUS keeps your bar running. PRO keeps all of this.',
      icon: 'timer-outline',
    },
  ],
};
