# KOOPE Paywall Strategy & Implementation Plan

## Overview
Strategic placement of paywalls throughout the KOOPE app to convert free users to KOOPE+ and PRO subscribers while maintaining a positive user experience.

---

## Subscription Tiers

### FREE Tier
- 2 lessons (indexes 0-1)
- 10 home bar inventory items
- 3 AI chat messages per day
- No vault access
- No seasonal drops
- Basic features only

### KOOPE+ ($8.99/mo or $71.99/yr)
- **Unlimited lessons**
- **Unlimited home bar inventory**
- **Unlimited AI chat**
- **Full vault access** (with XP/keys)
- **Seasonal drops access**
- All Plus features

### KOOPE PRO ($17.99/mo or $179.99/yr)
- Everything in KOOPE+
- **Vault early access** (PRO-exclusive items)
- **Smart inventory suggestions** (AI-powered)
- **Menu exporter** (PDF/printable)
- **Custom themes**
- **Creator tools**
- **Advanced analytics**
- Priority support

---

## Priority 1: High-Impact Paywall Triggers (Implement First)

### 1. Lessons (3rd Lesson Paywall) ✅ READY TO IMPLEMENT
**Location**: `src/screens/LessonsScreen.tsx`
**Trigger**: When user tries to access lesson index 2+
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { lessonGate } = usePaywallTriggers();

const handleLessonPress = (lessonIndex: number) => {
  lessonGate(lessonIndex, () => {
    // Navigate to lesson
    navigation.navigate('LessonDetail', { lessonIndex });
  });
};
```

**Why High Priority**:
- Educational content is core value prop
- Users naturally progress through lessons
- Creates urgency ("I'm on a learning streak!")
- Clear upgrade benefit

---

### 2. Home Bar Inventory (11th Item Paywall) ✅ READY TO IMPLEMENT
**Location**: `src/screens/HomeBarScreen.tsx`
**Trigger**: When user tries to add 11th inventory item
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { inventoryGate } = usePaywallTriggers();

const handleAddItem = (item: any) => {
  const currentCount = inventory.length;

  inventoryGate(currentCount, () => {
    // Add item to inventory
    addToInventory(item);
  });
};
```

**Why High Priority**:
- Users actively building their bar = high engagement
- Physical constraint feels natural ("My bar is full")
- Shows PRO benefit (unlimited inventory)
- Easy to visualize value

---

### 3. AI Chat (4th Message Paywall) ✅ READY TO IMPLEMENT
**Location**: `src/screens/AIChatScreen.tsx` (or wherever AI is implemented)
**Trigger**: When free user tries to send 4th AI message in a day
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { aiGate } = usePaywallTriggers();
const [aiUsesToday, setAiUsesToday] = useState(0);

const handleSendMessage = () => {
  aiGate(() => {
    // Send AI message
    sendAIMessage(message);
    setAiUsesToday(prev => prev + 1);
  });
};
```

**Why High Priority**:
- AI is premium feature with real cost
- 3 free messages = good trial experience
- Daily reset encourages return visits
- High perceived value

---

## Priority 2: Medium-Impact Paywall Triggers

### 4. Vault Access (Entry Paywall) ✅ READY TO IMPLEMENT
**Location**: `src/screens/vault/VaultScreen.tsx`
**Trigger**: When FREE user tries to access vault
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { vaultGate } = usePaywallTriggers();

// Check on mount or when user navigates to vault
useEffect(() => {
  vaultGate(false, () => {
    // User has access, load vault content
    loadVaultContent();
  });
}, []);
```

**Why Medium Priority**:
- Vault is exclusive content = high value
- But it's not core learning experience
- Good KOOPE+ differentiator
- Can use XP/keys as additional gate

---

### 5. Seasonal Drops (Collection Paywall) ⚠️ NEEDS IMPLEMENTATION
**Location**: Where seasonal content appears (Featured tab?)
**Trigger**: When FREE user tries to view seasonal collection
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { seasonalGate } = usePaywallTriggers();

const handleViewSeasonalDrop = () => {
  seasonalGate(() => {
    // Navigate to seasonal collection
    navigation.navigate('SeasonalCollection', { dropId });
  });
};
```

**Why Medium Priority**:
- Limited-time content creates FOMO
- Good for seasonal campaigns
- Adds freshness to subscription value
- May not exist yet

---

## Priority 3: PRO-Exclusive Features (KOOPE PRO Only)

### 6. Vault PRO Items (PRO Early Access) ✅ READY TO IMPLEMENT
**Location**: `src/screens/vault/VaultScreen.tsx`
**Trigger**: When KOOPE+ user tries to access PRO-only vault item
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { vaultGate } = usePaywallTriggers();

const handleUnlockProItem = (item: VaultItem) => {
  vaultGate(true, () => { // true = PRO required
    // Unlock PRO vault item
    unlockVaultItem(item);
  });
};
```

**Why PRO Only**:
- Exclusive early access = PRO value prop
- Creates tier differentiation
- Appeals to power users

---

### 7. Smart Inventory Suggestions ⚠️ NEEDS IMPLEMENTATION
**Location**: `src/screens/HomeBarScreen.tsx` (add feature)
**Trigger**: When non-PRO user tries to get AI suggestions
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { proGate } = usePaywallTriggers();

const handleGetSmartSuggestions = () => {
  proGate('Smart Inventory Suggestions', () => {
    // Generate AI-powered suggestions
    generateSmartSuggestions();
  });
};
```

**Why PRO Only**:
- Advanced AI feature
- Real computational cost
- Power user feature

---

### 8. Menu Exporter ⚠️ NEEDS IMPLEMENTATION
**Location**: Create new screen or add to Home Bar
**Trigger**: When non-PRO user tries to export menu
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { proGate } = usePaywallTriggers();

const handleExportMenu = () => {
  proGate('Menu Exporter', () => {
    // Export menu to PDF
    exportMenuToPDF();
  });
};
```

**Why PRO Only**:
- Professional feature
- Targets serious bartenders/hosts
- Clear business value

---

### 9. Custom Themes ⚠️ NEEDS IMPLEMENTATION
**Location**: `src/screens/SettingsScreen.tsx`
**Trigger**: When non-PRO user tries to select PRO theme
**Implementation**:
```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

const { proGate } = usePaywallTriggers();

const handleSelectTheme = (theme: Theme) => {
  if (!theme.isPro) {
    applyTheme(theme);
    return;
  }

  proGate('Custom Themes', () => {
    applyTheme(theme);
  });
};
```

**Why PRO Only**:
- Personalization premium feature
- Low implementation cost
- Good retention tool

---

## Priority 4: Soft Upsells (Non-Blocking)

### 10. XP Level-Up Upsell (Level 4 Milestone) ✅ READY TO IMPLEMENT
**Location**: XP system listener (add to context)
**Trigger**: When user reaches 1250 XP (Level 4)
**Implementation**:
```typescript
import { usePaywallTriggers, SUBSCRIPTION_LIMITS } from '../hooks/usePaywallTriggers';

const { xpGate } = usePaywallTriggers();

useEffect(() => {
  if (totalXP >= SUBSCRIPTION_LIMITS.XP_LEVEL_4_THRESHOLD && !hasShownGate) {
    xpGate(totalXP, () => {
      // User dismissed or upgraded
      console.log('Level 4 upsell shown');
    });
    setHasShownGate(true);
  }
}, [totalXP]);
```

**Why Soft Upsell**:
- Doesn't block progression
- Celebrates achievement
- Good timing (user is engaged)
- Can be dismissed

---

## Implementation Order

### Phase 1: Core Paywalls (Week 1)
1. ✅ **Lessons Gate** - `LessonsScreen.tsx`
2. ✅ **Home Bar Gate** - `HomeBarScreen.tsx`
3. ✅ **AI Chat Gate** - Wherever AI is implemented

### Phase 2: Vault & Seasonal (Week 2)
4. ✅ **Vault Entry Gate** - `VaultScreen.tsx`
5. ⚠️ **Seasonal Drops Gate** - Identify location first

### Phase 3: PRO Features (Week 3)
6. ✅ **Vault PRO Items** - `VaultScreen.tsx`
7. ⚠️ **Smart Inventory** - New feature
8. ⚠️ **Menu Exporter** - New feature
9. ⚠️ **Custom Themes** - `SettingsScreen.tsx`

### Phase 4: Soft Upsells (Week 4)
10. ✅ **XP Level-Up Upsell** - XP Context

---

## Best Practices

### 1. Show Value Before Blocking
Always let users experience the feature briefly before hitting paywall:
- Lessons: 2 free lessons
- AI Chat: 3 free messages
- Home Bar: 10 free items

### 2. Clear Messaging
Paywall should explain:
- What they're unlocking
- Why it's valuable
- How much it costs
- What tier they need

### 3. Easy Dismissal
Non-blocking paywalls should have:
- Clear close button
- "Maybe Later" option
- Don't show again for 24h

### 4. Track Analytics
Log all paywall interactions:
```typescript
trackEvent(ANALYTICS_EVENTS.PAYWALL_SHOWN, {
  [ANALYTICS_PROPS.PAYWALL_TYPE]: 'lesson_gate',
  [ANALYTICS_PROPS.LESSON_INDEX]: lessonIndex,
});
```

### 5. A/B Test Timing
Test different trigger points:
- Lessons: 2 free vs 3 free
- AI Chat: 3 messages vs 5 messages
- Home Bar: 10 items vs 15 items

---

## Success Metrics

### Conversion Metrics
- **Paywall Impression Rate**: % users who see paywall
- **Paywall Conversion Rate**: % users who upgrade after seeing paywall
- **Time to Paywall**: Days from install to first paywall
- **Paywall to Upgrade Time**: Days from first paywall to conversion

### User Experience Metrics
- **Paywall Dismissal Rate**: % users who close without upgrading
- **Feature Return Rate**: % users who return to feature after dismissal
- **Churn After Paywall**: % users who stop using app after paywall

### Revenue Metrics
- **ARPU** (Average Revenue Per User)
- **LTV** (Lifetime Value) by cohort
- **Paywall Revenue Attribution**: Revenue per paywall type

---

## Next Steps

### Immediate (Do Now)
1. ✅ Review existing `usePaywallTriggers` hook
2. ✅ Confirm subscription tiers and limits
3. 🔄 **Implement Priority 1 paywalls** (Lessons, Home Bar, AI Chat)

### Short-term (This Week)
4. Test Priority 1 paywalls with real users
5. Track analytics and conversion rates
6. Implement Priority 2 paywalls (Vault, Seasonal)

### Medium-term (Next 2 Weeks)
7. Build PRO-exclusive features
8. Implement Priority 3 paywalls
9. A/B test paywall timing and messaging

### Long-term (Ongoing)
10. Monitor metrics and optimize
11. Add new premium features
12. Iterate on paywall UX

---

**Status**: 📋 Strategy Complete - Ready for Implementation
**Last Updated**: 2026-01-13
