# KOOPE Paywall Strategy (Revised - Duolingo Model)

## Overview
Updated strategy following the Duolingo freemium model: **Education is free for everyone**, paywalls focus on **convenience features** and **exclusive content**.

---

## Subscription Tiers (Revised)

### FREE Tier ✅
**Philosophy**: Full learning experience with practical limitations

- ✅ **All lessons unlocked** - Complete bartending education
- ✅ **Limited Home Bar** - 10 ingredient slots
- ✅ **Limited AI Chat** - 3 messages per day
- ✅ **Partial Vault Access** - Some items available, premium locked
- ✅ **Basic features** - Recipes, guides, bars exploration
- ❌ No seasonal drops
- ❌ No PRO tools

**Value Proposition**: "Learn bartending completely free. Upgrade for unlimited tools and exclusive content."

---

### KOOPE+ Tier ($8.99/mo or $71.99/yr) ✅
**Philosophy**: Remove limitations, unlock full platform

- ✅ **All lessons** (same as FREE)
- ✅ **Unlimited Home Bar** - Track your entire collection
- ✅ **Unlimited AI Chat** - Ask the AI bartender anything
- ✅ **Full Vault Access** - All standard vault items (still need XP/keys)
- ✅ **Seasonal Drops** - Exclusive limited-time collections
- ✅ **Ad-free experience**
- ✅ **Cloud sync** - Access across devices
- ❌ No PRO-exclusive features

**Value Proposition**: "Your complete bartending toolkit. Build unlimited bars, chat freely, unlock everything."

---

### KOOPE PRO Tier ($17.99/mo or $179.99/yr) ✅
**Philosophy**: Premium tools for serious bartenders and hosts

- ✅ **Everything in KOOPE+**
- ✅ **Vault PRO Exclusives** - Early access to new drops
- ✅ **Smart Inventory AI** - Personalized ingredient suggestions
- ✅ **Menu Exporter** - Export menus to PDF for events
- ✅ **Custom Themes** - Personalize your app experience
- ✅ **Creator Tools** - Advanced recipe builder
- ✅ **Analytics Dashboard** - Track your bartending journey
- ✅ **Priority Support** - Direct help from the team

**Value Proposition**: "Professional tools for serious bartenders. Export menus, get AI suggestions, access exclusives."

---

## Why This Model Works Better

### Matches User Expectations
- **Duolingo taught us**: Education should be free
- **Users expect**: Learn first, pay for convenience
- **Better growth**: Free users become advocates

### Clear Value Ladder
1. **FREE**: "I'm learning bartending" → Natural limits create friction
2. **PLUS**: "I'm building my bar" → Remove limits, full access
3. **PRO**: "I'm a serious bartender" → Professional tools

### Lower Barrier to Entry
- No lesson paywall = more users complete curriculum
- More completions = more engaged users
- More engaged users = higher conversion rate

---

## Revised Paywall Triggers

### Priority 1: Convenience Paywalls (KOOPE+)

#### 1. Home Bar Inventory (11th Item) ✅ KEEP THIS
**Location**: `src/screens/HomeBarScreen.tsx`
**Trigger**: When user tries to add 11th inventory item
**Why**: Natural limit, high perceived value, clear benefit

**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { inventoryGate } = usePaywallTriggers();

const handleAddItem = (item: any) => {
  inventoryGate(inventory.length, () => {
    addToInventory(item);
  });
};
```

---

#### 2. AI Chat (4th Message) ✅ KEEP THIS
**Location**: Wherever AI chat is implemented
**Trigger**: When free user tries to send 4th AI message in a day
**Why**: High-value feature, daily reset encourages retention

**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { aiGate } = usePaywallTriggers();

const handleSendMessage = () => {
  aiGate(() => {
    sendAIMessage(message);
    setAiUsesToday(prev => prev + 1);
  });
};
```

---

#### 3. Vault Entry Paywall ⚠️ REVISE THIS
**Location**: `src/screens/vault/VaultScreen.tsx`
**Trigger**: When FREE user tries to access vault
**NEW APPROACH**: Show partial vault to FREE users

**Revised Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { useSubscription } from '../contexts/SubscriptionContext';

const { isKoopePlus, isKoopePro } = useSubscription();

// Filter vault items by tier
const availableItems = vaultItems.filter(item => {
  if (item.tier === 'free') return true;
  if (item.tier === 'plus' && (isKoopePlus || isKoopePro)) return true;
  if (item.tier === 'pro' && isKoopePro) return true;
  return false;
});

// Show locked items with upgrade prompt
const lockedItems = vaultItems.filter(item => !availableItems.includes(item));
```

**Why Revise**:
- Let FREE users see vault and unlock some items
- Creates desire for locked premium items
- Better than complete blocking

---

#### 4. Seasonal Drops ✅ KEEP THIS
**Location**: Where seasonal content appears
**Trigger**: When FREE user tries to view seasonal collection
**Why**: Limited-time content creates FOMO

**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { seasonalGate } = usePaywallTriggers();

const handleViewSeasonalDrop = () => {
  seasonalGate(() => {
    navigation.navigate('SeasonalCollection', { dropId });
  });
};
```

---

### Priority 2: PRO Exclusive Features

#### 5. Vault PRO Items ✅ KEEP THIS
**Location**: `src/screens/vault/VaultScreen.tsx`
**Trigger**: When KOOPE+ user tries to access PRO-only item
**Why**: Creates tier differentiation

**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { vaultGate } = usePaywallTriggers();

const handleUnlockProItem = (item: VaultItem) => {
  vaultGate(true, () => { // true = PRO required
    unlockVaultItem(item);
  });
};
```

---

#### 6. Smart Inventory Suggestions ⚠️ NEW FEATURE
**Location**: `src/screens/HomeBarScreen.tsx`
**Trigger**: When non-PRO user taps "Get Smart Suggestions"
**Why**: Advanced AI feature, PRO value prop

**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { proGate } = usePaywallTriggers();

const handleGetSmartSuggestions = () => {
  proGate('Smart Inventory Suggestions', () => {
    generateSmartSuggestions();
  });
};
```

---

#### 7. Menu Exporter ⚠️ NEW FEATURE
**Location**: Create new feature in Home Bar or Recipes
**Trigger**: When non-PRO user tries to export menu
**Why**: Professional feature for hosts/bartenders

---

#### 8. Custom Themes ⚠️ NEW FEATURE
**Location**: `src/screens/SettingsScreen.tsx`
**Trigger**: When non-PRO user selects PRO theme
**Why**: Personalization premium

---

### Priority 3: Soft Upsells (Non-Blocking)

#### 9. XP Level-Up Upsell ✅ KEEP THIS
**Location**: XP system listener
**Trigger**: When user reaches Level 4 (1250 XP)
**Why**: Celebration moment, good timing

---

## What Changed from Original Strategy

### ❌ REMOVED: Lesson Paywall
**Before**: FREE users limited to 2 lessons
**After**: All lessons free for everyone
**Why**: Education should be accessible, matches Duolingo model

### ⚠️ REVISED: Vault Access
**Before**: FREE users blocked entirely
**After**: FREE users get partial access
**Why**: Show value before blocking, create desire

### ✅ KEPT: Home Bar Limit
**Before**: 10 items for FREE
**After**: Still 10 items for FREE
**Why**: Natural constraint, high upgrade value

### ✅ KEPT: AI Chat Limit
**Before**: 3 messages/day for FREE
**After**: Still 3 messages/day for FREE
**Why**: Expensive feature, daily reset

---

## Implementation Order (Revised)

### Phase 1: Core Convenience Paywalls (Week 1)
1. ✅ **Home Bar Gate** - Already has hook, just implement
2. ✅ **AI Chat Gate** - Already has hook, just implement
3. ⚠️ **Vault Revision** - Change from full block to partial access

### Phase 2: Content Paywalls (Week 2)
4. ⚠️ **Seasonal Drops Gate** - Identify location, implement

### Phase 3: PRO Features (Week 3)
5. ✅ **Vault PRO Items** - Already has hook
6. ⚠️ **Smart Inventory** - Build feature + gate
7. ⚠️ **Menu Exporter** - Build feature + gate
8. ⚠️ **Custom Themes** - Build feature + gate

### Phase 4: Soft Upsells (Week 4)
9. ✅ **XP Level-Up Upsell** - Already has hook

---

## Vault Tier System (Revised)

### FREE Tier Items
- **Starter recipes** (3-5 items)
- **Basic techniques** (2-3 items)
- **Common glassware guides** (2 items)

### KOOPE+ Tier Items
- **Premium recipes** (15-20 items)
- **Advanced techniques** (10 items)
- **All glassware guides** (5+ items)
- **Seasonal collections** (varies)

### KOOPE PRO Tier Items
- **Exclusive early access** (new drops first)
- **PRO-only recipes** (experimental/rare)
- **Master techniques** (professional level)
- **Limited edition content** (special releases)

---

## Success Metrics (Revised)

### Conversion Funnel
1. **FREE → Completes curriculum** (education goal)
2. **FREE → Hits home bar limit** (first friction point)
3. **FREE → Hits AI chat limit** (second friction point)
4. **FREE → Converts to PLUS** (primary goal)
5. **PLUS → Wants PRO tools** (secondary goal)

### Key Metrics
- **Curriculum Completion Rate**: % FREE users who finish all lessons
- **Home Bar Fill Rate**: % users who reach 10 items
- **AI Chat Engagement**: % users who hit daily limit
- **Vault Discovery**: % FREE users who visit vault
- **FREE to PLUS Conversion**: % who upgrade after hitting limits
- **PLUS to PRO Conversion**: % who upgrade for tools

---

## Best Practices (Updated)

### 1. Lead with Education
- All lessons always free
- Encourage completion
- Celebrate milestones

### 2. Show Value First
- Let users experience features
- Create natural friction points
- Don't block core functionality

### 3. Clear Upgrade Benefits
- "Unlimited bar tracking"
- "24/7 AI bartender access"
- "All vault recipes unlocked"

### 4. Tier Differentiation
- **FREE**: "Learn everything"
- **PLUS**: "Build everything"
- **PRO**: "Create everything"

---

## Next Steps

### Immediate (Do Now)
1. ✅ Review revised strategy
2. ✅ Confirm vault tier structure
3. 🔄 **Implement Home Bar gate**
4. 🔄 **Implement AI Chat gate**

### Short-term (This Week)
5. Revise vault to show partial content to FREE
6. Test paywalls with real users
7. Track conversion metrics

### Medium-term (Next 2 Weeks)
8. Implement seasonal drops gate
9. Build PRO feature suite
10. A/B test limits (10 vs 15 bar items, 3 vs 5 AI messages)

---

**Status**: 📋 Revised Strategy - Duolingo Model
**Last Updated**: 2026-01-13
**Key Change**: Education is free, pay for convenience and exclusives
