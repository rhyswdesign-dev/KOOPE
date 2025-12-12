# Vault Tier System - FAST TRACK Implementation Plan

## 🚀 Goal: Ship in 2 Weeks (10 Working Days)

This is an accelerated plan to get the tier system live quickly with core features first, then iterate.

---

## Phase 1: MVP Core (Days 1-3) - FOUNDATION

### Day 1: User Tier Infrastructure
**Goal**: Set up tier state management and access control

#### Morning (4 hours)
1. **Create User Tier Store** - `src/store/useUserTier.ts`
   ```typescript
   import { create } from 'zustand';
   import { persist } from 'zustand/middleware';

   export type UserTier = 'FREE' | 'PLUS' | 'PRO';

   interface UserTierState {
     tier: UserTier;
     setTier: (tier: UserTier) => void;
   }

   export const useUserTier = create<UserTierState>()(
     persist(
       (set) => ({
         tier: 'FREE',
         setTier: (tier) => set({ tier }),
       }),
       { name: 'user-tier-storage' }
     )
   );
   ```

2. **Create Access Control Utility** - `src/utils/tierAccess.ts`
   ```typescript
   import { UserTier } from '../store/useUserTier';

   export const getTierLevel = (tier: UserTier): number => {
     switch (tier) {
       case 'FREE': return 0;
       case 'PLUS': return 1;
       case 'PRO': return 2;
     }
   };

   export const canAccessContent = (userTier: UserTier, requiredTier?: UserTier): boolean => {
     if (!requiredTier) return true;
     return getTierLevel(userTier) >= getTierLevel(requiredTier);
   };

   export const hasEarlySeasonalAccess = (tier: UserTier): boolean => tier === 'PRO';
   export const getMonthlyFreeKeys = (tier: UserTier): number => tier === 'PRO' ? 1 : 0;
   ```

#### Afternoon (4 hours)
3. **Add Tier Info to Mock Content** - Update `src/config/vaultContent.ts`
   - Add `requiredTier?: UserTier` to all content types
   - Mark premium content with tier requirements
   - Example:
     ```typescript
     {
       id: 'pro-martini',
       title: 'Professional Martini Variations',
       difficulty: 'pro',
       requiredTier: 'PRO', // ← ADD THIS
       xpCost: 5000,
       // ... rest
     }
     ```

4. **Update Filter Functions** - Modify `src/config/vaultContent.ts`
   ```typescript
   export function getVariationsForDisplay(userTier: UserTier = 'FREE'): CocktailVariationContent[] {
     return COCKTAIL_VARIATIONS.filter(v => canAccessContent(userTier, v.requiredTier));
   }

   export function getTechniquePlaybooksByType(
     type: TechniquePlaybookType,
     userTier: UserTier = 'FREE'
   ): TechniquePlaybookContent[] {
     return TECHNIQUE_PLAYBOOKS
       .filter(p => p.type === type)
       .filter(p => canAccessContent(userTier, p.requiredTier));
   }
   ```

**End of Day 1 Deliverable**: ✅ Tier state management + content filtering by tier

---

### Day 2: Locked Content UI
**Goal**: Show locked content with upgrade CTAs

#### Morning (4 hours)
1. **Create Tier Badge Component** - `src/components/TierBadge.tsx`
   ```typescript
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';
   import { Ionicons } from '@expo/vector-icons';
   import { colors, spacing, radii } from '../theme/tokens';
   import { UserTier } from '../store/useUserTier';

   export default function TierBadge({ tier }: { tier: UserTier }) {
     const config = {
       FREE: { label: 'Free', icon: 'person-outline', color: colors.subtext },
       PLUS: { label: 'KOOPE+', icon: 'star', color: colors.accent },
       PRO: { label: 'PRO', icon: 'diamond', color: colors.gold },
     }[tier];

     return (
       <View style={styles.badge}>
         <Ionicons name={config.icon as any} size={14} color={config.color} />
         <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
       </View>
     );
   }

   const styles = StyleSheet.create({
     badge: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: 4,
       backgroundColor: colors.card,
       paddingHorizontal: 8,
       paddingVertical: 4,
       borderRadius: radii.md,
     },
     label: { fontSize: 11, fontWeight: '700' },
   });
   ```

2. **Create Lock Overlay Component** - `src/components/LockedContentOverlay.tsx`
   ```typescript
   import React from 'react';
   import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
   import { Ionicons } from '@expo/vector-icons';
   import { colors, spacing, radii } from '../theme/tokens';
   import { UserTier } from '../store/useUserTier';

   interface Props {
     requiredTier: UserTier;
     onUpgradePress: () => void;
   }

   export default function LockedContentOverlay({ requiredTier, onUpgradePress }: Props) {
     return (
       <View style={styles.overlay}>
         <Ionicons name="lock-closed" size={20} color={colors.gold} />
         <Text style={styles.text}>{requiredTier} Required</Text>
         <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgradePress}>
           <Text style={styles.upgradeBtnText}>Upgrade</Text>
         </TouchableOpacity>
       </View>
     );
   }

   const styles = StyleSheet.create({
     overlay: {
       position: 'absolute',
       top: 0,
       left: 0,
       right: 0,
       bottom: 0,
       backgroundColor: 'rgba(0,0,0,0.75)',
       justifyContent: 'center',
       alignItems: 'center',
       gap: spacing(1),
       borderRadius: radii.lg,
     },
     text: { color: colors.text, fontSize: 14, fontWeight: '600' },
     upgradeBtn: {
       backgroundColor: colors.gold,
       paddingHorizontal: spacing(3),
       paddingVertical: spacing(1),
       borderRadius: radii.md,
       marginTop: spacing(1),
     },
     upgradeBtnText: { color: colors.bg, fontSize: 14, fontWeight: '700' },
   });
   ```

#### Afternoon (4 hours)
3. **Update VaultScreen to Show Locked Content** - Modify `src/screens/vault/VaultScreen.tsx`
   ```typescript
   import { useUserTier } from '../../store/useUserTier';
   import { canAccessContent, getTierLevel } from '../../utils/tierAccess';
   import LockedContentOverlay from '../../components/LockedContentOverlay';

   export default function VaultScreen() {
     const { tier } = useUserTier();
     // ... existing code

     const renderContentItem = (item: any, imageUrl: string) => {
       const isLocked = !canAccessContent(tier, item.requiredTier);

       return (
         <View key={item.id} style={styles.contentItemCard}>
           <Image source={{ uri: imageUrl }} style={styles.contentItemThumbnail} />
           <View style={styles.contentItemInfo}>
             <Text style={styles.contentItemXP}>
               {isLocked ? `${item.requiredTier} Required` : `${item.xpCost} XP`}
             </Text>
             <Text style={styles.contentItemTitle}>{item.title}</Text>
             <Text style={styles.contentItemDescription} numberOfLines={2}>
               {item.shortDescription}
             </Text>
           </View>

           {isLocked && (
             <LockedContentOverlay
               requiredTier={item.requiredTier}
               onUpgradePress={() => nav.navigate('SubscriptionUpgrade')}
             />
           )}

           {!isLocked && (
             <TouchableOpacity style={styles.contentItemUnlockButton}>
               <Text style={styles.contentItemUnlockText}>Unlock</Text>
             </TouchableOpacity>
           )}
         </View>
       );
     };
   }
   ```

4. **Add Tier Badge to Header** - Show user's current tier in vault header
   ```typescript
   <View style={styles.headerStats}>
     <TierBadge tier={tier} />
     {/* ... existing stats */}
   </View>
   ```

**End of Day 2 Deliverable**: ✅ Locked content UI with upgrade CTAs

---

### Day 3: Subscription Upgrade Screen
**Goal**: Basic subscription purchase flow

#### Morning (4 hours)
1. **Create Subscription Upgrade Screen** - `src/screens/subscription/SubscriptionUpgradeScreen.tsx`
   ```typescript
   import React, { useState } from 'react';
   import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
   import { colors, spacing, radii } from '../../theme/tokens';
   import { useUserTier, UserTier } from '../../store/useUserTier';

   export default function SubscriptionUpgradeScreen({ navigation }: any) {
     const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
     const { setTier } = useUserTier();

     const tiers = [
       {
         id: 'PLUS' as UserTier,
         name: 'KOOPE+',
         monthlyPrice: 8.99,
         yearlyPrice: 59.99,
         features: [
           'Unlimited Lessons',
           'Enhanced AI Coach',
           'Full Seasonal Access',
           'Offline Mode',
           'Full Cocktail Library',
         ],
       },
       {
         id: 'PRO' as UserTier,
         name: 'KOOPE PRO',
         monthlyPrice: 19.99,
         yearlyPrice: 119.99,
         popular: true,
         features: [
           'Everything in KOOPE+',
           'Masterclass Access',
           'Priority AI',
           'Early Seasonal Access',
           '1 Free Key/Month',
           'Creator Tools',
           'Pro Badge',
         ],
       },
     ];

     const handlePurchase = (tier: UserTier) => {
       // TODO: Integrate RevenueCat
       // For now, just set tier (demo mode)
       setTier(tier);
       navigation.goBack();
     };

     return (
       <ScrollView style={styles.container}>
         {/* Billing Toggle */}
         <View style={styles.billingToggle}>
           <TouchableOpacity
             style={[styles.toggleBtn, billingPeriod === 'monthly' && styles.toggleBtnActive]}
             onPress={() => setBillingPeriod('monthly')}
           >
             <Text style={styles.toggleText}>Monthly</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[styles.toggleBtn, billingPeriod === 'yearly' && styles.toggleBtnActive]}
             onPress={() => setBillingPeriod('yearly')}
           >
             <Text style={styles.toggleText}>Yearly</Text>
             <Text style={styles.saveBadge}>Save 37%</Text>
           </TouchableOpacity>
         </View>

         {/* Tier Cards */}
         {tiers.map((tier) => (
           <View key={tier.id} style={[styles.tierCard, tier.popular && styles.popularCard]}>
             {tier.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>MOST POPULAR</Text></View>}

             <Text style={styles.tierName}>{tier.name}</Text>
             <Text style={styles.tierPrice}>
               ${billingPeriod === 'monthly' ? tier.monthlyPrice : (tier.yearlyPrice / 12).toFixed(2)}
               <Text style={styles.pricePeriod}>/mo</Text>
             </Text>

             {billingPeriod === 'yearly' && (
               <Text style={styles.billedYearly}>Billed ${tier.yearlyPrice}/year</Text>
             )}

             <View style={styles.features}>
               {tier.features.map((feature, idx) => (
                 <Text key={idx} style={styles.feature}>✓ {feature}</Text>
               ))}
             </View>

             <TouchableOpacity
               style={[styles.purchaseBtn, tier.popular && styles.popularBtn]}
               onPress={() => handlePurchase(tier.id)}
             >
               <Text style={styles.purchaseBtnText}>Subscribe to {tier.name}</Text>
             </TouchableOpacity>
           </View>
         ))}
       </ScrollView>
     );
   }

   const styles = StyleSheet.create({
     container: { flex: 1, backgroundColor: colors.bg, padding: spacing(2) },
     billingToggle: { flexDirection: 'row', gap: spacing(1), marginBottom: spacing(3) },
     toggleBtn: {
       flex: 1,
       padding: spacing(2),
       backgroundColor: colors.card,
       borderRadius: radii.md,
       alignItems: 'center',
     },
     toggleBtnActive: { backgroundColor: colors.accent },
     toggleText: { color: colors.text, fontWeight: '600' },
     saveBadge: { color: colors.gold, fontSize: 11, fontWeight: '700', marginTop: 4 },
     tierCard: {
       backgroundColor: colors.card,
       borderRadius: radii.lg,
       padding: spacing(3),
       marginBottom: spacing(2),
       borderWidth: 2,
       borderColor: colors.line,
     },
     popularCard: { borderColor: colors.gold },
     popularBadge: {
       position: 'absolute',
       top: -12,
       alignSelf: 'center',
       backgroundColor: colors.gold,
       paddingHorizontal: spacing(2),
       paddingVertical: spacing(0.5),
       borderRadius: radii.md,
     },
     popularText: { color: colors.bg, fontSize: 11, fontWeight: '900' },
     tierName: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing(1) },
     tierPrice: { fontSize: 32, fontWeight: '900', color: colors.accent },
     pricePeriod: { fontSize: 16, color: colors.subtext },
     billedYearly: { fontSize: 13, color: colors.subtext, marginTop: spacing(0.5) },
     features: { marginVertical: spacing(3) },
     feature: { fontSize: 15, color: colors.text, marginBottom: spacing(1) },
     purchaseBtn: {
       backgroundColor: colors.accent,
       padding: spacing(2),
       borderRadius: radii.pill,
       alignItems: 'center',
     },
     popularBtn: { backgroundColor: colors.gold },
     purchaseBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
   });
   ```

2. **Add to Navigation** - Update `src/navigation/RootNavigator.tsx`
   ```typescript
   import SubscriptionUpgradeScreen from '../screens/subscription/SubscriptionUpgradeScreen';

   <Stack.Screen
     name="SubscriptionUpgrade"
     component={SubscriptionUpgradeScreen}
     options={{ title: 'Upgrade Subscription', presentation: 'modal' }}
   />
   ```

#### Afternoon (4 hours)
3. **Add Tier Switcher (Dev Tool)** - For testing different tiers
   ```typescript
   // src/screens/settings/TierSwitcher.tsx
   import { useUserTier } from '../../store/useUserTier';

   export default function TierSwitcher() {
     const { tier, setTier } = useUserTier();

     return (
       <View style={styles.container}>
         <Text style={styles.title}>Current Tier: {tier}</Text>
         <TouchableOpacity onPress={() => setTier('FREE')} style={styles.btn}>
           <Text>Switch to FREE</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setTier('PLUS')} style={styles.btn}>
           <Text>Switch to KOOPE+</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setTier('PRO')} style={styles.btn}>
           <Text>Switch to PRO</Text>
         </TouchableOpacity>
       </View>
     );
   }
   ```

4. **Test Full Flow**
   - Switch to FREE tier → See locked content
   - Tap "Upgrade" → See subscription screen
   - Purchase KOOPE+ → Content unlocks
   - Switch to PRO → More content unlocks

**End of Day 3 Deliverable**: ✅ Full tier switching + locked content flow

---

## Phase 2: Content & Polish (Days 4-6)

### Day 4: Content Tier Assignment
**Goal**: Mark all vault content with appropriate tiers

#### Full Day (8 hours)
1. **Assign Tiers to Cocktail Variations**
   - Simple variations: FREE (60%), PLUS (40%)
   - Technique-forward: PLUS (80%), PRO (20%)
   - Pro variations: PRO (100%)

2. **Assign Tiers to Playbooks**
   - 1 intro playbook per category: FREE
   - Standard playbooks: PLUS
   - Advanced playbooks: PRO

3. **Assign Tiers to Bar Features**
   - All bar features: PLUS+

4. **Assign Tiers to Seasonal Content**
   - Seasonal drops: PLUS (standard access), PRO (early access)

5. **Update Mock Data** in `src/config/vaultContent.ts`

**End of Day 4 Deliverable**: ✅ All content properly tiered

---

### Day 5: XP Economy Adjustments
**Goal**: Balance XP costs for different tiers

#### Morning (4 hours)
1. **Create XP Multiplier System**
   ```typescript
   // src/utils/xpMultiplier.ts
   export const XP_EARN_MULTIPLIERS = {
     FREE: 1.0,
     PLUS: 1.25,
     PRO: 1.5,
   };

   export const calculateXPEarned = (baseXP: number, tier: UserTier): number => {
     return Math.floor(baseXP * XP_EARN_MULTIPLIERS[tier]);
   };
   ```

2. **Update XP Earning** - Modify lesson completion, quiz completion, etc.
   ```typescript
   const earnedXP = calculateXPEarned(100, userTier);
   ```

#### Afternoon (4 hours)
3. **Add XP Boost Indicator**
   - Show "PLUS Bonus: +25% XP" or "PRO Bonus: +50% XP" on earn events

4. **Test XP Economy**
   - Verify FREE users earn base XP
   - Verify PLUS users earn 25% bonus
   - Verify PRO users earn 50% bonus

**End of Day 5 Deliverable**: ✅ Tiered XP earning system

---

### Day 6: Monthly Key Grant (PRO)
**Goal**: PRO users get 1 free key per month

#### Morning (4 hours)
1. **Create Key Grant System**
   ```typescript
   // src/store/useMonthlyKeyGrant.ts
   export const useMonthlyKeyGrant = create<KeyGrantState>()(
     persist(
       (set, get) => ({
         lastGrantDate: null,

         checkAndGrantKey: (tier: UserTier, addKey: () => void) => {
           if (tier !== 'PRO') return;

           const now = new Date();
           const lastGrant = get().lastGrantDate ? new Date(get().lastGrantDate) : null;

           // Check if it's a new month
           if (!lastGrant || lastGrant.getMonth() !== now.getMonth()) {
             addKey();
             set({ lastGrantDate: now.toISOString() });
             return true;
           }
           return false;
         },
       }),
       { name: 'monthly-key-grant' }
     )
   );
   ```

2. **Trigger on App Launch**
   ```typescript
   // In App.tsx or main entry
   useEffect(() => {
     if (tier === 'PRO') {
       const granted = checkAndGrantKey(tier, () => dispatch({ type: 'ADD_KEY', payload: 1 }));
       if (granted) {
         // Show toast: "You received your monthly free key!"
       }
     }
   }, []);
   ```

#### Afternoon (4 hours)
3. **Add "Next Key Grant" Indicator** for PRO users
   - Show countdown to next monthly key in vault header

4. **Test Key Grant System**

**End of Day 6 Deliverable**: ✅ Monthly key grant for PRO users

---

## Phase 3: Payment Integration (Days 7-9)

### Day 7: RevenueCat Setup
**Goal**: Integrate real payment processing

#### Morning (4 hours)
1. **Install RevenueCat**
   ```bash
   npm install react-native-purchases
   cd ios && pod install
   ```

2. **Configure RevenueCat**
   - Create account at revenuecat.com
   - Set up products in App Store Connect / Google Play Console
   - Add API keys to app

3. **Create Products**
   - `koope_plus_monthly` - $8.99/mo
   - `koope_plus_yearly` - $59.99/yr
   - `koope_pro_monthly` - $19.99/mo
   - `koope_pro_yearly` - $119.99/yr

#### Afternoon (4 hours)
4. **Implement Purchase Flow**
   ```typescript
   import Purchases from 'react-native-purchases';

   const handlePurchase = async (productId: string) => {
     try {
       const { customerInfo } = await Purchases.purchasePackage(productId);

       // Check entitlements
       if (customerInfo.entitlements.active['koope_pro']) {
         setTier('PRO');
       } else if (customerInfo.entitlements.active['koope_plus']) {
         setTier('PLUS');
       }

       navigation.goBack();
     } catch (error) {
       // Handle error
     }
   };
   ```

**End of Day 7 Deliverable**: ✅ RevenueCat integration

---

### Day 8: Restore Purchases & Receipt Validation
**Goal**: Handle subscription restoration and validation

#### Morning (4 hours)
1. **Add Restore Purchases**
   ```typescript
   const restorePurchases = async () => {
     try {
       const customerInfo = await Purchases.restorePurchases();
       // Update tier based on active entitlements
     } catch (error) {
       // Handle error
     }
   };
   ```

2. **Add on App Launch**
   ```typescript
   useEffect(() => {
     Purchases.getCustomerInfo().then((info) => {
       // Sync tier with subscription status
     });
   }, []);
   ```

#### Afternoon (4 hours)
3. **Handle Subscription Expiry**
   ```typescript
   if (!customerInfo.entitlements.active['koope_plus'] && tier !== 'FREE') {
     setTier('FREE');
     // Show "Your subscription expired" message
   }
   ```

4. **Test Restore Flow**

**End of Day 8 Deliverable**: ✅ Restore purchases + validation

---

### Day 9: Trial Offers
**Goal**: 7-day KOOPE+ trial, 14-day PRO trial

#### Morning (4 hours)
1. **Configure Trials in App Store / Play Store**
   - KOOPE+: 7-day free trial
   - KOOPE PRO: 14-day free trial

2. **Update UI to Show Trial Offer**
   ```typescript
   <Text style={styles.trialOffer}>Start 7-Day Free Trial</Text>
   ```

#### Afternoon (4 hours)
3. **Track Trial Status**
   ```typescript
   const isTrialing = customerInfo.entitlements.active['koope_plus']?.willRenew === false;
   ```

4. **Show Trial Expiry Countdown**

**End of Day 9 Deliverable**: ✅ Trial offers live

---

## Phase 4: Launch Prep (Day 10)

### Day 10: Testing, Analytics, Launch
**Goal**: Final testing and go live

#### Morning (4 hours)
1. **Add Analytics Events**
   ```typescript
   logEvent('subscription_upgrade_viewed', { from_tier: tier });
   logEvent('subscription_purchased', { tier: newTier, billing_period: period });
   logEvent('locked_content_viewed', { content_id: item.id, required_tier: item.requiredTier });
   ```

2. **Test All Flows**
   - FREE → PLUS upgrade
   - PLUS → PRO upgrade
   - Trial start → convert to paid
   - Subscription expiry → downgrade to FREE
   - Restore purchases

#### Afternoon (4 hours)
3. **Fix Any Bugs**

4. **Soft Launch** - Release to TestFlight / Internal Testing

5. **Monitor Analytics** - Track conversion rates, errors

**End of Day 10 Deliverable**: ✅ LIVE IN PRODUCTION

---

## Post-Launch (Week 3+)

### Week 3: Iterate & Optimize
- Monitor conversion rates (FREE → PLUS, PLUS → PRO)
- A/B test pricing
- Add more premium content
- Refine XP economy based on data

### Week 4: Advanced Features
- Creator tools for PRO users
- Early seasonal access automation
- Community identity (badges, crowns)

---

## Success Metrics (Track Daily)

1. **Conversion Rates**
   - FREE → Trial: Target 30%
   - Trial → Paid: Target 40%
   - FREE → PLUS: Target 15-20%
   - PLUS → PRO: Target 10-15%

2. **Churn Rate**: Target < 5% monthly

3. **ARPU**: Target $4-6/month across all users

4. **Content Engagement**
   - Which locked content drives most upgrades?
   - Which tier features are most valued?

---

## Risk Mitigation

### Backup Plan if RevenueCat Issues
- Use direct Stripe integration
- Or start with "demo mode" (manual tier switching) and add payments later

### Backup Plan if Payment Review Delays
- Launch with tier system but FREE for all users
- Collect email waitlist for paid tiers
- Enable payments once approved

---

## Resources Needed

### Development
- 1 developer (full-time, 10 days)
- Access to:
  - App Store Connect (for iOS IAP)
  - Google Play Console (for Android IAP)
  - RevenueCat account

### Design
- Subscription screen design (use template, polish later)
- Lock overlay icons/graphics

### Business
- Pricing finalized ($8.99 PLUS, $19.99 PRO)
- Legal: Terms of Service, Privacy Policy (subscription terms)
- App Store review: Screenshots, description

---

## Daily Standup Questions

1. What did I ship yesterday?
2. What am I shipping today?
3. Any blockers?
4. Is launch still on track?

---

## Let's Build! 🚀

**Start Date**: Today
**Target Launch**: 10 working days from now
**First Task**: Create `src/store/useUserTier.ts`
