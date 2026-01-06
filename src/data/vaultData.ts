/**
 * VAULT ECONOMY DATA
 * Mock data for XP + Keys based virtual economy system
 */

import { VaultItem, VaultCycle, MonetizationItem, UserVaultProfile } from '../types/vault';

// ================== CURRENT VAULT CYCLE ==================

// Generate current month/year collection name dynamically
const getCurrentCollectionName = (): string => {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();
  return `${monthName} ${year} Collection`;
};

// Generate cycle ID from current date
const getCurrentCycleId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `cycle_${year}_${month}`;
};

export const currentVaultCycle: VaultCycle = {
  id: getCurrentCycleId(),
  name: getCurrentCollectionName(),
  startDate: '2025-09-01T00:00:00Z',
  endDate: '2025-09-30T23:59:59Z',
  isActive: true,
  featuredItemIds: ['vault_comp_untitled', 'vault_class_mixology', 'vault_mystery_premium'],
  mysteryDropPool: ['vault_mystery_common', 'vault_mystery_premium'],
  totalItemsReleased: 12,
  totalUnlocks: 847,
  createdAt: '2024-12-31T00:00:00Z',
};

// Get countdown to next vault reset
export const getVaultCountdown = (): { days: number; hours: number; minutes: number } => {
  const now = new Date();
  const endDate = new Date(currentVaultCycle.endDate);
  const timeDiff = Math.max(0, endDate.getTime() - now.getTime());
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
};

// ================== VAULT ITEMS (XP + Keys Based) ==================

export const vaultItems: VaultItem[] = [
  // COMMON TIER (500-1,000 XP + 1 Key) - Comps, 2-for-1s, small merch, badges
  {
    id: 'vault_comp_untitled',
    name: 'Untitled Lounge - Cocktail Comp',
    description: 'Complimentary cocktail at Untitled Champagne Lounge',
    image: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=800&q=60',
    category: 'experiences',
    type: 'digital',
    rarity: 'common',
    xpCost: 750,
    keysCost: 1,
    totalStock: 100,
    currentStock: 73,
    cycleId: 'cycle_2025_01',
    partner: 'Untitled Lounge',
    contents: ['Digital Voucher', 'Valid for 30 Days', 'Any Signature Cocktail'],
    estimatedValue: '$18 Value',
    isActive: true,
    releaseDate: '2025-01-01T00:00:00Z',
    createdAt: '2024-12-31T12:00:00Z',
    updatedAt: '2025-01-12T08:30:00Z',
  },
  
  {
    id: 'vault_badge_common',
    name: 'HGA Gold Member Badge',
    description: 'Exclusive digital badge for your profile',
    image: 'https://images.unsplash.com/photo-1578475239581-5a5f2bf82fbc?auto=format&fit=crop&w=800&q=60',
    category: 'digital',
    type: 'digital',
    rarity: 'common',
    xpCost: 500,
    keysCost: 1,
    // XP-as-discount option available
    discountOption: {
      reducedXP: 250,
      cashPrice: 1.99, // $1.99 to make up XP difference
    },
    totalStock: 500,
    currentStock: 428,
    cycleId: 'cycle_2025_01',
    partner: 'KŌOPE',
    contents: ['Digital Badge', 'Profile Display', 'Member Recognition'],
    estimatedValue: '$5 Value',
    isActive: true,
    releaseDate: '2025-01-01T00:00:00Z',
    createdAt: '2024-12-31T12:00:00Z',
    updatedAt: '2025-01-12T08:30:00Z',
  },

  // LIMITED TIER (2,500-5,000 XP + 2 Keys) - Class tickets, bookings, HGA merch
  {
    id: 'vault_class_mixology',
    name: 'Master Mixology Class',
    description: 'Learn from expert bartenders in this exclusive 2-hour class',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800&q=60',
    category: 'experiences',
    type: 'experience',
    rarity: 'limited',
    xpCost: 4000,
    keysCost: 2,
    discountOption: {
      reducedXP: 2000,
      cashPrice: 19.99, // Significant cash option for classes
    },
    totalStock: 25,
    currentStock: 8, // Low stock creates urgency
    cycleId: 'cycle_2025_01',
    partner: 'Campari Academy',
    contents: ['2-Hour Class', 'Expert Instruction', 'Recipe Cards', 'Certificate'],
    estimatedValue: '$80 Value',
    isActive: true,
    releaseDate: '2025-01-05T00:00:00Z',
    createdAt: '2025-01-04T12:00:00Z',
    updatedAt: '2025-01-12T08:30:00Z',
  },

  {
    id: 'vault_merch_hoodie',
    name: 'KŌOPE Premium Hoodie',
    description: 'Limited edition hoodie with embroidered KŌOPE logo',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=60',
    category: 'merch',
    type: 'physical',
    rarity: 'limited',
    xpCost: 3000,
    keysCost: 2,
    totalStock: 100,
    currentStock: 47,
    cycleId: 'cycle_2025_01',
    partner: 'KŌOPE',
    contents: ['Premium Cotton Hoodie', 'Embroidered Logo', 'Limited Edition Tag'],
    estimatedValue: '$65 Value',
    isActive: true,
    releaseDate: '2025-01-08T00:00:00Z',
    createdAt: '2025-01-07T12:00:00Z',
    updatedAt: '2025-01-12T08:30:00Z',
  },

  {
    id: 'vault_glassware_rare',
    name: 'Crystal Coupe Collection',
    description: 'Hand-blown crystal coupes from master craftsmen',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=60',
    category: 'glassware',
    type: 'physical',
    rarity: 'limited',
    xpCost: 4200,
    keysCost: 2,
    totalStock: 30,
    currentStock: 8, // Very low stock
    cycleId: 'cycle_2025_03',
    contents: ['4x Crystal Coupe Glasses (6oz)', 'Velvet Storage Case', 'Care Instructions'],
    estimatedValue: '$180 Value',
    isActive: true,
    releaseDate: '2025-03-10T00:00:00Z',
    createdAt: '2025-03-09T12:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
  },

  // LIMITED TIER - High XP requirement scenario
  {
    id: 'vault_premium_spirits_collection',
    name: 'Rare Spirits Collection',
    description: 'Curated selection of 6 rare spirits from award-winning distilleries',
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=800&q=60',
    category: 'spirits',
    type: 'physical',
    rarity: 'limited',
    xpCost: 12000, // User has 8450 XP - needs 3550 more
    keysCost: 3, // User has exactly 3 keys
    totalStock: 20,
    currentStock: 8,
    cycleId: 'cycle_2025_09',
    contents: ['6 Premium Spirits (50ml each)', 'Tasting Notes Card', 'Collector Box', 'Certificate of Authenticity'],
    estimatedValue: '$320 Value',
    isActive: true,
    releaseDate: '2025-09-05T00:00:00Z',
    createdAt: '2025-09-04T12:00:00Z',
    updatedAt: '2025-09-12T08:30:00Z',
  },

  // RARE/PRESTIGE TIER (10,000+ XP + 3-4 Keys)
  {
    id: 'vault_masterclass_rare',
    name: 'Master Distiller Experience',
    description: 'Private 1-on-1 session with award-winning master distiller',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800&q=60',
    category: 'experiences',
    type: 'experience',
    rarity: 'rare',
    xpCost: 15000,
    keysCost: 4,
    requiresPro: true, // KOOPE PRO required
    discountOption: {
      reducedXP: 7500,
      cashPrice: 49.99, // High cash option for experiences
    },
    totalStock: 5,
    currentStock: 2, // Ultra exclusive
    cycleId: 'cycle_2025_03',
    contents: ['2-hour Private Session', 'Tasting of 8 Premium Spirits', 'Signed Certificate', 'Custom Recipe Creation'],
    estimatedValue: '$400+ Value',
    isActive: true,
    releaseDate: '2025-03-15T00:00:00Z',
    createdAt: '2025-03-14T12:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
  },

  {
    id: 'vault_prestige_tools',
    name: 'Japanese Master Tool Set',
    description: 'Handcrafted bar tools from legendary Japanese artisans',
    image: 'https://images.unsplash.com/photo-1565114807295-beeda80ba829?auto=format&fit=crop&w=800&q=60',
    category: 'bar-tools',
    type: 'physical',
    rarity: 'prestige',
    xpCost: 25000,
    keysCost: 4,
    requiresPrestige: true, // Prestige subscription required
    totalStock: 3,
    currentStock: 1, // Almost gone
    cycleId: 'cycle_2025_03',
    contents: ['Damascus Steel Bar Spoon', 'Handforged Jigger', 'Cedar Storage Box', 'Authenticity Certificate'],
    estimatedValue: '$800+ Value',
    isActive: true,
    releaseDate: '2025-03-20T00:00:00Z',
    createdAt: '2025-03-19T12:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
  },

  // MYSTERY DROPS (Variable XP + Keys)
  {
    id: 'vault_mystery_common',
    name: 'Mystery Bar Box',
    description: 'Surprise collection of bar essentials and treats',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=60',
    category: 'bar-tools',
    type: 'mystery',
    rarity: 'mystery',
    xpCost: 1200,
    keysCost: 1,
    discountOption: {
      reducedXP: 600,
      cashPrice: 4.99,
    },
    totalStock: 200,
    currentStock: 156,
    cycleId: 'cycle_2025_03',
    mysteryPool: ['Bar Tool', 'Cocktail Recipe Book', 'Premium Bitters', 'Glassware', 'Garnish Kit'],
    mysteryTags: ['tools', 'ingredients', 'books'],
    estimatedValue: '$40-80 Value',
    isActive: true,
    releaseDate: '2025-03-01T00:00:00Z',
    createdAt: '2025-02-28T12:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
  },

  {
    id: 'vault_mystery_premium',
    name: 'Premium Mystery Collection',
    description: 'High-value surprise items from premium brands',
    image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=800&q=60',
    category: 'bar-tools',
    type: 'mystery',
    rarity: 'mystery',
    xpCost: 6000,
    keysCost: 3,
    discountOption: {
      reducedXP: 3000,
      cashPrice: 19.99,
    },
    totalStock: 25,
    currentStock: 7, // Limited mystery drops
    cycleId: 'cycle_2025_03',
    mysteryPool: ['Premium Shaker Set', 'Crystal Glassware', 'Artisan Bitters Set', 'Signed Recipe Collection'],
    mysteryTags: ['premium', 'limited', 'collectible'],
    estimatedValue: '$150-300 Value',
    isActive: true,
    releaseDate: '2025-03-08T00:00:00Z',
    createdAt: '2025-03-07T12:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
  },

  // OUT OF STOCK EXAMPLE
  {
    id: 'vault_sold_out',
    name: 'Exclusive Mixing Glass',
    description: 'Hand-etched mixing glass - SOLD OUT',
    image: 'https://images.unsplash.com/photo-1578475239581-5a5f2bf82fbc?auto=format&fit=crop&w=800&q=60',
    category: 'glassware',
    type: 'physical',
    rarity: 'limited',
    xpCost: 2800,
    keysCost: 2,
    totalStock: 20,
    currentStock: 0, // SOLD OUT
    cycleId: 'cycle_2025_03',
    contents: ['Hand-etched Mixing Glass', 'Bar Spoon', 'Felt Storage Pouch'],
    estimatedValue: '$90 Value',
    isActive: false, // Deactivated when sold out
    releaseDate: '2025-03-03T00:00:00Z',
    createdAt: '2025-03-02T12:00:00Z',
    updatedAt: '2025-03-12T08:30:00Z',
  },
];

// ================== MONETIZATION ITEMS (Keys/Boosters for Real Money) ==================

export const monetizationItems: MonetizationItem[] = [
  // KEY BUNDLES
  {
    id: 'keys_starter_pack',
    type: 'keys',
    name: 'Starter Key Pack',
    description: 'Perfect for your first Vault unlocks',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=60',
    price: 299, // $2.99
    keysGranted: 2,
    isBundle: false,
    inStock: true,
    stripePriceId: 'price_keys_starter_pack',
    stripeProductId: 'prod_keys_starter_pack',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
  },

  {
    id: 'keys_value_pack',
    name: 'Value Key Bundle',
    type: 'keys',
    description: '5 Keys + XP Booster - Best Value!',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=60',
    price: 699, // $6.99
    originalPrice: 899, // Show 22% discount
    keysGranted: 5,
    isBundle: true,
    bundleItems: [
      { type: 'keys', quantity: 5, name: '5 Vault Keys' },
      { type: 'booster', quantity: 1, name: '2x XP Booster (24h)' },
    ],
    boosterEffect: {
      type: 'xp_multiplier',
      multiplier: 2.0,
      duration: 24,
      description: 'Double XP for 24 hours',
    },
    inStock: true,
    stripePriceId: 'price_keys_value_pack',
    stripeProductId: 'prod_keys_value_pack',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
  },

  {
    id: 'keys_ultimate_pack',
    name: 'Ultimate Key Collection',
    type: 'keys',
    description: '12 Keys + Premium Boosters - For Vault Masters',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=400&q=60',
    price: 1499, // $14.99
    originalPrice: 1999, // 25% discount
    keysGranted: 12,
    isBundle: true,
    bundleItems: [
      { type: 'keys', quantity: 12, name: '12 Vault Keys' },
      { type: 'booster', quantity: 1, name: '3x XP Booster (48h)' },
      { type: 'booster', quantity: 1, name: 'Mystery Luck Booster' },
    ],
    boosterEffect: {
      type: 'xp_multiplier',
      multiplier: 3.0,
      duration: 48,
      description: 'Triple XP for 48 hours + Mystery Luck',
    },
    inStock: true,
    stripePriceId: 'price_keys_ultimate_pack',
    stripeProductId: 'prod_keys_ultimate_pack',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
  },

  // INDIVIDUAL BOOSTERS
  {
    id: 'booster_2x_xp',
    name: '2x XP Booster',
    type: 'booster',
    description: 'Double your XP earnings for 24 hours',
    image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=400&q=60',
    price: 199, // $1.99
    isBundle: false,
    boosterEffect: {
      type: 'xp_multiplier',
      multiplier: 2.0,
      duration: 24,
      description: 'Double XP for 24 hours',
    },
    inStock: true,
    stripePriceId: 'price_booster_2x_xp',
    stripeProductId: 'prod_booster_2x_xp',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
  },

  {
    id: 'booster_mystery_luck',
    name: 'Mystery Luck Booster',
    type: 'booster',
    description: 'Increases chances of rare items from Mystery Drops',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=60',
    price: 299, // $2.99
    isBundle: false,
    boosterEffect: {
      type: 'mystery_luck',
      duration: 168, // 1 week
      description: 'Better mystery drop outcomes for 1 week',
    },
    inStock: true,
    stockLimit: 50, // Limited availability
    stripePriceId: 'price_booster_mystery_luck',
    stripeProductId: 'prod_booster_mystery_luck',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
  },

  // PHYSICAL MERCH (Real money only, no keys)
  {
    id: 'merch_tshirt',
    name: 'KŌOPE T-Shirt',
    type: 'merch',
    description: 'Premium cotton tee with embroidered logo',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=60',
    price: 2499, // $24.99
    isBundle: false,
    inStock: true,
    stripePriceId: 'price_merch_tshirt',
    stripeProductId: 'prod_merch_tshirt',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-03-01T00:00:00Z',
  },
];

// ================== MOCK USER PROFILE ==================

export const mockUserVaultProfile: UserVaultProfile = {
  userId: 'user_12345',
  xpBalance: 8450, // Current XP earned through lessons/challenges
  keysBalance: 3, // Currently owned keys
  totalXpEarned: 15200,
  totalKeysEarned: 8,
  totalXpSpent: 6750,
  totalKeysSpent: 5,
  unlockedItems: [
    {
      itemId: 'vault_jigger_common',
      itemName: 'Precision Jigger Set',
      unlockedAt: '2025-03-08T14:30:00Z',
      cycleId: 'cycle_2025_03',
      xpSpent: 750,
      keysSpent: 1,
      fulfillmentStatus: 'delivered',
      trackingNumber: 'UPS123456789',
    },
    {
      itemId: 'vault_mystery_common',
      itemName: 'Mystery Bar Box',
      unlockedAt: '2025-03-10T10:15:00Z',
      cycleId: 'cycle_2025_03',
      xpSpent: 600, // Used discount option
      keysSpent: 1,
      cashSpent: 4.99, // Paid $4.99 to reduce XP cost
      fulfillmentStatus: 'shipped',
      trackingNumber: 'FEDEX987654321',
    },
  ],
  activeBooster: {
    type: 'xp_multiplier',
    multiplier: 2.0,
    expiresAt: '2025-03-13T14:30:00Z',
  },
  updatedAt: '2025-03-12T08:30:00Z',
};

// ================== HELPER FUNCTIONS ==================

export const getVaultItemsByRarity = (rarity: VaultItem['rarity']): VaultItem[] => {
  return vaultItems.filter(item => item.rarity === rarity && item.isActive);
};

export const getActiveVaultItems = (): VaultItem[] => {
  return vaultItems.filter(item => item.isActive && item.currentStock > 0);
};

export const getFeaturedVaultItems = (): VaultItem[] => {
  const featuredIds = currentVaultCycle.featuredItemIds;
  return vaultItems.filter(item => featuredIds.includes(item.id) && item.isActive);
};

export const getMysteryDropItems = (): VaultItem[] => {
  return vaultItems.filter(item => item.type === 'mystery' && item.isActive);
};

export const canUserUnlockItem = (item: VaultItem, userProfile: UserVaultProfile): {
  canUnlock: boolean;
  reason?: string;
} => {
  if (!item.isActive) {
    return { canUnlock: false, reason: 'Item is not currently available' };
  }
  
  if (item.currentStock <= 0) {
    return { canUnlock: false, reason: 'Item is out of stock' };
  }
  
  if (userProfile.xpBalance < item.xpCost) {
    const xpNeeded = item.xpCost - userProfile.xpBalance;
    return { canUnlock: false, reason: `Need ${xpNeeded} more XP` };
  }
  
  if (userProfile.keysBalance < item.keysCost) {
    const keysNeeded = item.keysCost - userProfile.keysBalance;
    return { canUnlock: false, reason: `Need ${keysNeeded} more Keys` };
  }
  
  return { canUnlock: true };
};