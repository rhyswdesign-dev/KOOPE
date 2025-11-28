/**
 * VAULT ECONOMY SYSTEM
 * Core type definitions for XP + Keys based virtual economy
 */

// ================== VAULT ITEM TYPES ==================

export type VaultItemRarity = 'common' | 'limited' | 'rare' | 'prestige' | 'mystery';
export type VaultItemCategory = 'cocktail-kit' | 'bar-tools' | 'glassware' | 'spirits' | 'books' | 'merch' | 'experiences' | 'digital';
export type VaultItemType = 'physical' | 'digital' | 'experience' | 'mystery';

export interface VaultItem {
  id: string;
  name: string;
  description: string;
  image: string;
  category: VaultItemCategory;
  type: VaultItemType;
  rarity: VaultItemRarity;

  // XP + Keys Cost Structure
  xpCost: number;                    // Base XP requirement
  keysCost: number;                  // Keys required (1-4 typically)

  // XP-as-Discount Option (optional)
  discountOption?: {
    reducedXP: number;               // Lower XP cost if paying money
    cashPrice: number;               // Dollar amount to make up difference
  };

  // Scarcity Mechanics
  totalStock: number;                // Total available this cycle
  currentStock: number;              // Remaining in current cycle
  cycleId: string;                   // Links to 30-day cycle

  // Subscription Gating
  requiresPro?: boolean;             // Requires KOOPE PRO subscription
  requiresPrestige?: boolean;        // Requires Prestige subscription

  // Metadata
  contents?: string[];               // What's included (for mystery/kits)
  estimatedValue?: string;           // "$200+ Value" display
  partner?: string;                  // Partner venue/brand name
  isActive: boolean;                 // Can be unlocked
  releaseDate: string;
  expiryDate?: string;               // Auto-remove date

  // Mystery Drop Specifics
  mysteryPool?: string[];            // Possible items for mystery drops
  mysteryTags?: string[];            // Tags for mystery categorization

  createdAt: string;
  updatedAt: string;
}

// ================== VAULT CYCLE SYSTEM ==================

export interface VaultCycle {
  id: string;
  name: string;                      // "March 2025 Collection"
  startDate: string;
  endDate: string;
  isActive: boolean;
  
  // Featured items for this cycle
  featuredItemIds: string[];
  mysteryDropPool: string[];         // Mystery items available this cycle
  
  // Cycle statistics
  totalItemsReleased: number;
  totalUnlocks: number;              // Across all users
  
  createdAt: string;
}

// ================== USER ECONOMY ==================

export interface UserVaultProfile {
  userId: string;
  
  // Balances
  xpBalance: number;                 // Earned XP (lessons, challenges, videos)
  keysBalance: number;               // Purchased Keys
  
  // Lifetime Stats
  totalXpEarned: number;
  totalKeysEarned: number;           // From purchases + promotions
  totalXpSpent: number;
  totalKeysSpent: number;
  
  // Unlocked Items History
  unlockedItems: UnlockedVaultItem[];
  
  // Booster Effects (temporary multipliers)
  activeBooster?: UserBooster;
  
  updatedAt: string;
}

export interface UnlockedVaultItem {
  itemId: string;
  itemName: string;
  unlockedAt: string;
  cycleId: string;
  
  // Cost paid to unlock
  xpSpent: number;
  keysSpent: number;
  cashSpent?: number;                // If used XP-as-discount option
  
  // Delivery/fulfillment status (for physical items)
  fulfillmentStatus?: 'pending' | 'processing' | 'shipped' | 'delivered';
  trackingNumber?: string;
  shippingAddress?: VaultAddress;
}

// ================== MONETIZATION ITEMS ==================

export interface MonetizationItem {
  id: string;
  type: 'keys' | 'booster' | 'pass' | 'merch';
  name: string;
  description: string;
  image: string;
  
  // Real money pricing
  price: number;                     // USD cents (e.g., 499 = $4.99)
  originalPrice?: number;            // For discount display
  
  // What you get
  keysGranted?: number;              // For key bundles
  boosterEffect?: BoosterEffect;     // For XP multipliers
  
  // Bundle specifics
  isBundle: boolean;
  bundleItems?: BundleItem[];
  
  // Availability
  inStock: boolean;
  stockLimit?: number;               // Limited quantity items
  
  // Stripe integration
  stripePriceId: string;
  stripeProductId: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  type: 'keys' | 'booster';
  quantity: number;
  name: string;
}

export interface BoosterEffect {
  type: 'xp_multiplier' | 'double_keys' | 'mystery_luck';
  multiplier?: number;               // e.g., 2.0 for 2x XP
  duration: number;                  // Hours active
  description: string;
}

export interface UserBooster {
  type: BoosterEffect['type'];
  multiplier?: number;
  expiresAt: string;
  remainingUses?: number;            // For use-based boosters
}

// ================== VAULT UNLOCK FLOW ==================

export interface VaultUnlockRequest {
  userId: string;
  itemId: string;
  useDiscountOption: boolean;        // Use XP-as-discount if available
  shippingAddress?: VaultAddress;    // For physical items
}

export interface VaultUnlockResponse {
  success: boolean;
  error?: VaultUnlockError;
  
  // Transaction details
  transaction?: {
    transactionId: string;
    xpSpent: number;
    keysSpent: number;
    cashCharged?: number;            // If discount option used
    itemUnlocked: VaultItem;
    newXpBalance: number;
    newKeysBalance: number;
  };
}

export type VaultUnlockError = 
  | 'insufficient_xp'
  | 'insufficient_keys'
  | 'item_out_of_stock'
  | 'item_not_active'
  | 'item_not_found'
  | 'cycle_expired'
  | 'payment_failed'
  | 'user_not_found';

// ================== VAULT PURCHASE FLOW ==================

export interface VaultPurchaseRequest {
  userId: string;
  monetizationItemId: string;
  quantity: number;
  paymentMethodId: string;           // Stripe payment method
}

export interface VaultPurchaseResponse {
  success: boolean;
  error?: string;
  
  // Purchase details
  purchase?: {
    purchaseId: string;
    totalPaid: number;               // USD cents
    keysGranted: number;
    boosterGranted?: BoosterEffect;
    stripePaymentIntentId: string;
    newKeysBalance: number;
  };
}

// ================== VAULT CART (Keys/Boosters Only) ==================

export interface VaultCartItem {
  monetizationItemId: string;
  quantity: number;
  unitPrice: number;                 // USD cents
  totalPrice: number;                // quantity * unitPrice
}

export interface VaultCart {
  userId: string;
  items: VaultCartItem[];
  subtotal: number;                  // USD cents
  tax: number;                       // USD cents
  total: number;                     // USD cents
  updatedAt: string;
}

// ================== ADDRESSES & DELIVERY ==================

export interface VaultAddress {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

// ================== VAULT ANALYTICS ==================

export interface VaultAnalytics {
  cycleId: string;
  
  // Item performance
  itemUnlocks: Record<string, number>;     // itemId -> unlock count
  xpSpentByItem: Record<string, number>;   // itemId -> total XP spent
  keysSpentByItem: Record<string, number>; // itemId -> total Keys spent
  
  // User behavior
  totalActiveUsers: number;
  avgXpPerUser: number;
  avgKeysPerUser: number;
  
  // Revenue metrics
  keysSold: number;
  boostersSold: number;
  totalRevenue: number;                    // USD cents
  
  updatedAt: string;
}

// ================== FIRESTORE COLLECTION STRUCTURE ==================

export interface FirestoreVaultSchema {
  // Core collections
  vaultItems: VaultItem[];
  vaultCycles: VaultCycle[];
  userVaultProfiles: UserVaultProfile[];
  monetizationItems: MonetizationItem[];
  vaultCarts: VaultCart[];
  vaultAddresses: VaultAddress[];
  
  // Transaction logs
  vaultUnlocks: UnlockedVaultItem[];
  vaultPurchases: {
    id: string;
    userId: string;
    monetizationItemId: string;
    quantity: number;
    totalPaid: number;
    stripePaymentIntentId: string;
    purchasedAt: string;
  }[];
  
  // Analytics
  vaultAnalytics: VaultAnalytics[];
}