# Vault Tier System Implementation Plan

## Overview
This plan outlines how to implement the 3-tier subscription system (FREE, KOOPE+, KOOPE PRO) for the Vault content system in the KOOPE app.

---

## Subscription Tiers

### **FREE Tier**
- **Price**: $0
- **Lessons**: Limited (Intro only)
- **AI Coach**: Basic (token-limited)
- **Saves & Notes**: Limited
- **Inventory System**: 10-item cap
- **Seasonal Vault Access**: Locked (earn-only)
- **Monthly New Drops**: Free mini-drop
- **Challenges**: Limited
- **Brand Perks**: None
- **Offline Mode**: No
- **Recipe Builder**: Basic
- **Cocktail Cards**: Limited Pack
- **Home Bar Plan**: Basic Tips
- **Event/Class Discounts**: No
- **Creator Tools**: No
- **Community Identity**: General

### **KOOPE+ (Core Tier)**
- **Price**: $8.99/mo or $59.99/yr (USD) | $11.99/mo or $79.99/yr (CAD)
- **Lessons**: Unlimited
- **AI Coach**: Enhanced (taste + hosting intelligence)
- **Saves & Notes**: Unlimited
- **Inventory System**: Unlimited
- **Seasonal Vault Access**: Standard Access
- **Monthly New Drops**: Full Access
- **Challenges**: Full Access
- **Brand Perks**: Light Perks
- **Offline Mode**: Yes
- **Recipe Builder**: Enhanced
- **Cocktail Cards**: Full Library
- **Home Bar Plan**: Monthly Personalized Plan
- **Event/Class Discounts**: Light
- **Creator Tools**: No
- **Community Identity**: Standard

### **KOOPE PRO (Premium Tier)**
- **Price**: $19.99/mo or $119.99/yr (USD) | $24.99/mo or $149.99/yr (CAD)
- **Lessons**: Unlimited + Masterclasses
- **AI Coach**: Priority AI (long memory, full context)
- **Saves & Notes**: Unlimited + Pro Tools
- **Inventory System**: Unlimited + Smart Suggestions
- **Seasonal Vault Access**: Early Access + Monthly Free Key
- **Monthly New Drops**: Early Access + Pro Exclusives
- **Challenges**: VIP-Only Challenges
- **Brand Perks**: Exclusive Offers, Tastings, Early Event Access
- **Offline Mode**: Yes
- **Recipe Builder**: Pro Builder (Advanced Flavour Modeling)
- **Cocktail Cards**: Pro-Only Cards + Variations
- **Home Bar Plan**: Advanced Home Bar Blueprint + PDF
- **Event/Class Discounts**: Priority + Bigger Discounts
- **Creator Tools**: Menu Exporter, Upload Recipes, Private Vault Themes
- **Community Identity**: Elite Flair (Pro Badge, Seasonal Crown)

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 User Tier Management
**File**: `src/store/useUserTier.ts` (NEW)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserTier = 'FREE' | 'PLUS' | 'PRO';

interface UserTierState {
  tier: UserTier;
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'trial';
  subscriptionEndDate: Date | null;
  isTrialActive: boolean;
  trialEndDate: Date | null;

  // Actions
  setTier: (tier: UserTier) => void;
  setSubscriptionStatus: (status: 'active' | 'canceled' | 'expired' | 'trial') => void;
  startTrial: (tier: UserTier, durationDays: number) => void;
  cancelSubscription: () => void;
}

export const useUserTier = create<UserTierState>()(
  persist(
    (set) => ({
      tier: 'FREE',
      subscriptionStatus: 'active',
      subscriptionEndDate: null,
      isTrialActive: false,
      trialEndDate: null,

      setTier: (tier) => set({ tier }),
      setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),
      startTrial: (tier, durationDays) => {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + durationDays);
        set({
          tier,
          isTrialActive: true,
          trialEndDate: trialEnd,
          subscriptionStatus: 'trial',
        });
      },
      cancelSubscription: () => set({ subscriptionStatus: 'canceled' }),
    }),
    {
      name: 'user-tier-storage',
    }
  )
);
```

#### 1.2 Tier Access Control Helper
**File**: `src/utils/tierAccess.ts` (NEW)
```typescript
import { UserTier } from '../store/useUserTier';

export interface TierAccess {
  lessons: 'limited' | 'unlimited' | 'unlimited_plus_masterclasses';
  aiCoach: 'basic' | 'enhanced' | 'priority';
  savesAndNotes: 'limited' | 'unlimited' | 'unlimited_plus_pro';
  inventorySystem: 'capped' | 'unlimited' | 'unlimited_plus_smart';
  seasonalVaultAccess: 'locked' | 'standard' | 'early_access_plus_key';
  monthlyDrops: 'mini' | 'full' | 'early_plus_exclusives';
  challenges: 'limited' | 'full' | 'vip_only';
  brandPerks: 'none' | 'light' | 'exclusive';
  offlineMode: boolean;
  recipeBuilder: 'basic' | 'enhanced' | 'pro';
  cocktailCards: 'limited' | 'full' | 'pro_plus_variations';
  homeBarPlan: 'basic' | 'monthly_personalized' | 'advanced_blueprint';
  eventDiscounts: 'none' | 'light' | 'priority_plus_bigger';
  creatorTools: boolean;
  communityIdentity: 'general' | 'standard' | 'elite';
}

export const getTierAccess = (tier: UserTier): TierAccess => {
  switch (tier) {
    case 'FREE':
      return {
        lessons: 'limited',
        aiCoach: 'basic',
        savesAndNotes: 'limited',
        inventorySystem: 'capped',
        seasonalVaultAccess: 'locked',
        monthlyDrops: 'mini',
        challenges: 'limited',
        brandPerks: 'none',
        offlineMode: false,
        recipeBuilder: 'basic',
        cocktailCards: 'limited',
        homeBarPlan: 'basic',
        eventDiscounts: 'none',
        creatorTools: false,
        communityIdentity: 'general',
      };
    case 'PLUS':
      return {
        lessons: 'unlimited',
        aiCoach: 'enhanced',
        savesAndNotes: 'unlimited',
        inventorySystem: 'unlimited',
        seasonalVaultAccess: 'standard',
        monthlyDrops: 'full',
        challenges: 'full',
        brandPerks: 'light',
        offlineMode: true,
        recipeBuilder: 'enhanced',
        cocktailCards: 'full',
        homeBarPlan: 'monthly_personalized',
        eventDiscounts: 'light',
        creatorTools: false,
        communityIdentity: 'standard',
      };
    case 'PRO':
      return {
        lessons: 'unlimited_plus_masterclasses',
        aiCoach: 'priority',
        savesAndNotes: 'unlimited_plus_pro',
        inventorySystem: 'unlimited_plus_smart',
        seasonalVaultAccess: 'early_access_plus_key',
        monthlyDrops: 'early_plus_exclusives',
        challenges: 'vip_only',
        brandPerks: 'exclusive',
        offlineMode: true,
        recipeBuilder: 'pro',
        cocktailCards: 'pro_plus_variations',
        homeBarPlan: 'advanced_blueprint',
        eventDiscounts: 'priority_plus_bigger',
        creatorTools: true,
        communityIdentity: 'elite',
      };
  }
};

// Helper functions for specific feature access
export const canAccessSeasonalVault = (tier: UserTier): boolean => {
  return tier !== 'FREE';
};

export const hasEarlySeasonalAccess = (tier: UserTier): boolean => {
  return tier === 'PRO';
};

export const getMonthlyFreeKeys = (tier: UserTier): number => {
  switch (tier) {
    case 'FREE': return 0;
    case 'PLUS': return 0;
    case 'PRO': return 1;
  }
};

export const getInventoryCap = (tier: UserTier): number | null => {
  return tier === 'FREE' ? 10 : null; // null = unlimited
};

export const canAccessMasterclasses = (tier: UserTier): boolean => {
  return tier === 'PRO';
};

export const hasCreatorTools = (tier: UserTier): boolean => {
  return tier === 'PRO';
};
```

---

### Phase 2: Vault Content Filtering (Week 2-3)

#### 2.1 Update Vault Content Types
**File**: `src/config/vaultContent.ts` (MODIFY)

Add tier restrictions to content:
```typescript
export interface CocktailVariationContent {
  id: string;
  title: string;
  shortDescription: string;
  difficulty: 'simple' | 'technique_forward' | 'pro';
  xpCost: number;
  requiredTier?: UserTier; // NEW: minimum tier required
  // ... existing fields
}

export interface SeasonalDropContent {
  id: string;
  seasonName: string;
  description: string;
  availableFrom: Date;
  availableUntil: Date;
  requiredTier?: UserTier; // NEW
  earlyAccessTier?: UserTier; // NEW: early access for PRO
  earlyAccessDays?: number; // NEW: how many days early
  // ... existing fields
}
```

#### 2.2 Filter Content by Tier
**File**: `src/config/vaultContent.ts` (MODIFY)

Update helper functions:
```typescript
export function getVariationsForDisplay(userTier: UserTier = 'FREE'): CocktailVariationContent[] {
  return COCKTAIL_VARIATIONS.filter(v => {
    if (!v.requiredTier) return true;
    return getTierLevel(userTier) >= getTierLevel(v.requiredTier);
  });
}

export function getAvailableSeasonalDropsForTier(
  userTier: UserTier,
  now: Date = new Date()
): SeasonalDropContent[] {
  return SEASONAL_DROPS.filter(drop => {
    // Check if user's tier meets minimum requirement
    if (drop.requiredTier && getTierLevel(userTier) < getTierLevel(drop.requiredTier)) {
      return false;
    }

    // Check early access for PRO users
    if (drop.earlyAccessTier === 'PRO' && userTier === 'PRO') {
      const earlyAccessDate = new Date(drop.availableFrom);
      earlyAccessDate.setDate(earlyAccessDate.getDate() - (drop.earlyAccessDays || 0));
      return now >= earlyAccessDate && now <= drop.availableUntil;
    }

    // Standard availability check
    return now >= drop.availableFrom && now <= drop.availableUntil;
  });
}

function getTierLevel(tier: UserTier): number {
  switch (tier) {
    case 'FREE': return 0;
    case 'PLUS': return 1;
    case 'PRO': return 2;
  }
}
```

---

### Phase 3: UI Updates (Week 3-4)

#### 3.1 Locked Content Indicators
**File**: `src/screens/vault/VaultScreen.tsx` (MODIFY)

Update `renderContentItem` to show locked state:
```typescript
const renderContentItem = (item: any, imageUrl: string, userTier: UserTier) => {
  const isLocked = item.requiredTier && getTierLevel(userTier) < getTierLevel(item.requiredTier);

  return (
    <View key={item.id} style={[styles.contentItemCard, isLocked && styles.lockedCard]}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.contentItemThumbnail, isLocked && styles.lockedThumbnail]}
        resizeMode="cover"
      />
      {isLocked && (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={16} color={colors.accent} />
        </View>
      )}
      <View style={styles.contentItemInfo}>
        <Text style={styles.contentItemXP}>
          {isLocked ? `${item.requiredTier} Required` : `${item.xpCost} XP`}
        </Text>
        <Text style={styles.contentItemTitle}>{item.title || item.barName || item.seasonName}</Text>
        <Text style={styles.contentItemDescription} numberOfLines={2}>
          {item.shortDescription || item.description}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.contentItemUnlockButton, isLocked && styles.lockedButton]}
        activeOpacity={0.8}
        onPress={() => {
          if (isLocked) {
            // Show upgrade modal
            navigation.navigate('SubscriptionUpgrade', { targetTier: item.requiredTier });
          } else {
            // Handle unlock with XP
          }
        }}
      >
        <Text style={styles.contentItemUnlockText}>
          {isLocked ? 'Upgrade' : 'Unlock'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

Add styles:
```typescript
lockedCard: {
  opacity: 0.6,
},

lockedThumbnail: {
  opacity: 0.4,
},

lockBadge: {
  position: 'absolute',
  top: spacing(1),
  left: spacing(1),
  backgroundColor: colors.bg,
  borderRadius: radii.sm,
  padding: spacing(0.5),
},

lockedButton: {
  backgroundColor: colors.gold,
},
```

#### 3.2 Tier Badge Display
**File**: `src/components/TierBadge.tsx` (NEW)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { UserTier } from '../store/useUserTier';

interface TierBadgeProps {
  tier: UserTier;
  size?: 'small' | 'medium' | 'large';
}

export default function TierBadge({ tier, size = 'medium' }: TierBadgeProps) {
  const getBadgeConfig = () => {
    switch (tier) {
      case 'FREE':
        return {
          label: 'Free',
          icon: 'person-outline' as const,
          color: colors.subtext,
          bgColor: colors.card,
        };
      case 'PLUS':
        return {
          label: 'KOOPE+',
          icon: 'star' as const,
          color: colors.accent,
          bgColor: colors.card,
        };
      case 'PRO':
        return {
          label: 'KOOPE PRO',
          icon: 'diamond' as const,
          color: colors.gold,
          bgColor: colors.card,
        };
    }
  };

  const config = getBadgeConfig();
  const sizeConfig = {
    small: { fontSize: 11, iconSize: 14, padding: spacing(0.5) },
    medium: { fontSize: 13, iconSize: 16, padding: spacing(1) },
    large: { fontSize: 16, iconSize: 20, padding: spacing(1.5) },
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor, padding: sizeConfig[size].padding }]}>
      <Ionicons name={config.icon} size={sizeConfig[size].iconSize} color={config.color} />
      <Text style={[styles.label, { color: config.color, fontSize: sizeConfig[size].fontSize }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    borderRadius: radii.md,
  },
  label: {
    fontWeight: '700',
  },
});
```

---

### Phase 4: Subscription Purchase Flow (Week 4-5)

#### 4.1 Subscription Upgrade Screen
**File**: `src/screens/subscription/SubscriptionUpgradeScreen.tsx` (NEW)

Create a comprehensive subscription screen showing:
- Tier comparison table
- Feature breakdowns
- Pricing (monthly/yearly toggle)
- Purchase buttons
- Trial offer for new users

#### 4.2 Payment Integration
- Integrate RevenueCat for subscription management
- Support iOS (App Store) and Android (Google Play) in-app purchases
- Handle subscription status updates
- Implement receipt validation

#### 4.3 Trial Management
```typescript
// Offer 7-day free trial for KOOPE+ and 14-day for KOOPE PRO
const TRIAL_DURATIONS = {
  PLUS: 7,
  PRO: 14,
};
```

---

### Phase 5: XP & Keys Economy Adjustment (Week 5-6)

#### 5.1 Tiered XP Earning Rates
```typescript
export const XP_MULTIPLIERS = {
  FREE: 1.0,
  PLUS: 1.25,  // 25% bonus
  PRO: 1.5,    // 50% bonus
};
```

#### 5.2 Monthly Key Allocation
```typescript
// PRO users get 1 free key per month
export const MONTHLY_KEY_GRANT = {
  FREE: 0,
  PLUS: 0,
  PRO: 1,
};
```

#### 5.3 Key Purchase Pricing
```typescript
// Tiered pricing for key bundles
export const KEY_BUNDLE_PRICES = {
  single: {
    FREE: 199,      // $1.99
    PLUS: 149,      // $1.49 (25% off)
    PRO: 99,        // $0.99 (50% off)
  },
  pack_5: {
    FREE: 799,      // $7.99
    PLUS: 599,      // $5.99
    PRO: 399,       // $3.99
  },
  // ... more bundles
};
```

---

### Phase 6: Seasonal Content Strategy (Week 6-7)

#### 6.1 Content Release Schedule
```typescript
// Example: Winter 2025 Drop
{
  id: 'winter-2025',
  seasonName: 'Winter Warmers 2025',
  description: 'Cozy cocktails for cold nights',
  availableFrom: new Date('2024-12-01'),
  availableUntil: new Date('2025-02-28'),
  requiredTier: 'PLUS',          // PLUS and PRO can access
  earlyAccessTier: 'PRO',         // PRO gets early access
  earlyAccessDays: 14,            // 14 days before PLUS users
  content: [...],
}
```

#### 6.2 FREE User Teaser
- Show seasonal content as "locked"
- Display "Upgrade to KOOPE+" CTA
- Allow single-item unlock with XP + Key for FREE users as "taste test"

---

### Phase 7: Analytics & Tracking (Week 7-8)

#### 7.1 Track Tier Engagement
```typescript
// Track which features drive upgrades
logEvent('vault_locked_content_viewed', {
  content_id: item.id,
  content_type: 'cocktail_variation',
  required_tier: item.requiredTier,
  user_tier: currentTier,
});

logEvent('subscription_upgrade_initiated', {
  from_tier: currentTier,
  to_tier: targetTier,
  trigger_feature: 'seasonal_vault',
});
```

#### 7.2 A/B Testing
- Test different trial durations
- Test pricing strategies
- Test feature access levels

---

## Content Strategy by Tier

### FREE Users
- **Cocktails**: 20% of variations (simple difficulty only)
- **Seasonal**: Locked (teaser view only, can earn 1 mini-drop per season)
- **Playbooks**: 1 free playbook per category (Ice Strategy intro only)
- **Bar Features**: Locked (view only, no unlock)

### KOOPE+ Users
- **Cocktails**: 100% of simple + technique-forward (80% total)
- **Seasonal**: Full access on release date
- **Playbooks**: All playbooks unlockable with XP
- **Bar Features**: Full access

### KOOPE PRO Users
- **Cocktails**: 100% including pro-level variations
- **Seasonal**: Early access (14 days before PLUS) + 1 free key/month
- **Playbooks**: All playbooks + exclusive masterclass series
- **Bar Features**: All features + behind-the-scenes content

---

## Monetization Projection

### Revenue Model
1. **Subscription Revenue**: Primary income source
2. **XP Boost Purchases**: Secondary (let users buy XP to unlock faster)
3. **Key Bundle Sales**: Tertiary (discounted for PRO users)
4. **Brand Partnership Revenue**: Vault items sponsored by brands

### Target Metrics
- **FREE → PLUS conversion**: 15-20% within 30 days
- **PLUS → PRO conversion**: 10-15% within 60 days
- **Monthly churn rate**: < 5%
- **Lifetime Value (LTV)**:
  - PLUS: $60-80 (8-10 months avg)
  - PRO: $120-180 (6-9 months avg)

---

## Technical Dependencies

### Required Libraries
```json
{
  "react-native-purchases": "^6.0.0",  // RevenueCat SDK
  "@stripe/stripe-react-native": "^0.37.0",  // Stripe (backup payment)
  "zustand": "^4.4.0",  // State management (already in use)
}
```

### Backend Requirements
1. **Subscription Webhook Handler**: Listen to RevenueCat webhooks for subscription updates
2. **Receipt Validation**: Validate purchases server-side
3. **User Tier Sync**: Keep tier status in sync across devices
4. **Monthly Key Grant**: Cron job to grant 1 key to PRO users monthly

---

## Testing Plan

### Test Cases
1. **Tier Access Control**
   - FREE user can't access PLUS content
   - PLUS user can access standard seasonal drops
   - PRO user gets early access to seasonal content

2. **Subscription Flow**
   - Purchase KOOPE+ subscription
   - Upgrade PLUS → PRO
   - Downgrade PRO → PLUS
   - Cancel subscription
   - Subscription expiry handling

3. **Trial Flow**
   - Start 7-day PLUS trial
   - Start 14-day PRO trial
   - Trial expiry handling
   - Convert trial to paid

4. **Key Economy**
   - PRO user receives 1 free key on 1st of month
   - Key bundle purchases apply tier discount
   - Key usage unlocks content

---

## Migration Strategy

### Existing Users
1. **Grandfather Existing Users**: All current users get KOOPE+ for free for 6 months
2. **XP Conversion**: Convert existing XP balances (no changes needed)
3. **Unlocked Content**: Keep all previously unlocked items unlocked
4. **Communication**: Email blast explaining new tier system + benefits

---

## Success Metrics

### KPIs to Track
1. **Conversion Rate**: FREE → PLUS and PLUS → PRO
2. **Churn Rate**: Monthly subscription cancellations
3. **ARPU (Average Revenue Per User)**: Target $4-6/month across all users
4. **Content Engagement**: Track which vault items drive most unlocks
5. **Trial Conversion**: % of trial users converting to paid

---

## Next Steps

1. **Week 1-2**: Build core tier infrastructure (useUserTier, tierAccess utils)
2. **Week 2-3**: Update vault content filtering logic
3. **Week 3-4**: Build subscription upgrade UI
4. **Week 4-5**: Integrate RevenueCat and payment processing
5. **Week 5-6**: Adjust XP/Key economy
6. **Week 6-7**: Implement seasonal content strategy
7. **Week 7-8**: Add analytics and testing
8. **Week 8**: Beta launch with select users
9. **Week 9**: Full rollout

---

## Open Questions

1. **Should FREE users earn keys at all?** Or XP only?
2. **What's the right XP cost for pro-level content?** (10k-15k XP range?)
3. **How many seasonal drops per year?** (4 quarterly drops? 12 monthly?)
4. **Brand partnership revenue share?** (70/30 split? 80/20?)
5. **Referral program for PRO users?** (Get 1 month free for each referral?)
