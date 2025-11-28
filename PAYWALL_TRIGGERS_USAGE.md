# Paywall Triggers Usage Guide

Complete examples for integrating the `usePaywallTriggers` hook into KOOPE app screens.

## Import the Hook

```typescript
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
```

---

## 1. AI Chat Gate

**Location**: AI Chat screen where users send messages

**Implementation**:
```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { useSubscription } from '../contexts/SubscriptionContext';

function AIChatScreen() {
  const { aiGate } = usePaywallTriggers();
  const { isKoopePro } = useSubscription();
  const [message, setMessage] = useState('');
  const [freeAIUses, setFreeAIUses] = useState(0); // Track FREE user AI usage

  const handleSendMessage = async () => {
    // Gate check BEFORE sending
    const canProceed = aiGate(() => {
      // onSuccess callback - send the message
      sendMessageToAI(message);

      // Increment FREE user counter if needed
      if (!isKoopePro) {
        setFreeAIUses(prev => prev + 1);
      }
    });

    // If gate returns false, paywall was shown and message won't send
    if (!canProceed) {
      console.log('AI gate blocked - upgrade required');
    }
  };

  const sendMessageToAI = async (msg: string) => {
    // Your actual AI message sending logic here
    console.log('Sending to AI:', msg);
  };

  return (
    <View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Ask the AI bartender..."
      />
      <TouchableOpacity onPress={handleSendMessage}>
        <Text>Send</Text>
      </TouchableOpacity>

      {/* Show remaining uses for FREE users */}
      {!isKoopePro && (
        <Text>AI messages used today: {freeAIUses}/3</Text>
      )}
    </View>
  );
}
```

---

## 2. Lesson Gate

**Location**: Lesson list screen where users tap to open lessons

**Implementation**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { Ionicons } from '@expo/vector-icons';

interface Lesson {
  id: string;
  title: string;
  index: number;
  description: string;
}

function LessonsScreen() {
  const navigation = useNavigation();
  const { lessonGate } = usePaywallTriggers();

  const lessons: Lesson[] = [
    { id: '1', title: 'Intro to Cocktails', index: 0, description: 'Basic foundations' },
    { id: '2', title: 'Essential Tools', index: 1, description: 'Your bar toolkit' },
    { id: '3', title: 'Classic Cocktails', index: 2, description: 'Timeless recipes' },
    { id: '4', title: 'Advanced Techniques', index: 3, description: 'Pro skills' },
    // ... more lessons
  ];

  const handleLessonPress = (lesson: Lesson) => {
    // Gate check BEFORE opening lesson
    const canProceed = lessonGate(lesson.index, () => {
      // onSuccess - navigate to lesson
      navigation.navigate('LessonDetail', { lessonId: lesson.id });
    });

    if (!canProceed) {
      console.log(`Lesson ${lesson.index} blocked - upgrade required`);
    }
  };

  const renderLesson = ({ item }: { item: Lesson }) => {
    const isLocked = item.index > 1; // FREE users can only access lessons 0 and 1

    return (
      <TouchableOpacity onPress={() => handleLessonPress(item)}>
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ color: '#8B8B8B' }}>{item.description}</Text>
          </View>
          {isLocked && (
            <Ionicons name="lock-closed" size={20} color="#D4AF37" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={lessons}
      renderItem={renderLesson}
      keyExtractor={(item) => item.id}
    />
  );
}
```

---

## 3. Inventory Gate

**Location**: Home bar inventory screen where users add items

**Implementation**:
```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { useSubscription } from '../contexts/SubscriptionContext';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
}

function HomeBarInventoryScreen() {
  const { inventoryGate } = usePaywallTriggers();
  const { isKoopePro } = useSubscription();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const availableItems: InventoryItem[] = [
    { id: '1', name: 'Vodka', category: 'Spirit' },
    { id: '2', name: 'Gin', category: 'Spirit' },
    { id: '3', name: 'Rum', category: 'Spirit' },
    // ... more items
  ];

  const handleAddItem = (item: InventoryItem) => {
    const currentCount = inventory.length;

    // Gate check BEFORE adding item
    const canProceed = inventoryGate(currentCount, () => {
      // onSuccess - add the item
      setInventory(prev => [...prev, item]);
      Alert.alert('Added!', `${item.name} added to your bar`);
    });

    if (!canProceed) {
      console.log('Inventory gate blocked - upgrade required');
    }
  };

  const renderAvailableItem = ({ item }: { item: InventoryItem }) => {
    const isInInventory = inventory.some(i => i.id === item.id);

    return (
      <TouchableOpacity
        onPress={() => handleAddItem(item)}
        disabled={isInInventory}
      >
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 16 }}>{item.name}</Text>
          <Text style={{ color: '#8B8B8B' }}>{item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Inventory count indicator */}
      <View style={{ padding: 16, backgroundColor: '#252A2E' }}>
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>
          Your Bar: {inventory.length} items
        </Text>
        {!isKoopePro && (
          <Text style={{ color: '#D4AF37', fontSize: 14, marginTop: 4 }}>
            {10 - inventory.length} slots remaining (Free tier)
          </Text>
        )}
      </View>

      <FlatList
        data={availableItems}
        renderItem={renderAvailableItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
```

---

## 4. Vault Gate

**Location**: Vault screen where users try to unlock items

**Implementation**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';
import { Ionicons } from '@expo/vector-icons';

interface VaultItem {
  id: string;
  name: string;
  description: string;
  isProOnly: boolean; // PRO-exclusive early access items
  keysCost: number;
}

function VaultScreen() {
  const { vaultGate } = usePaywallTriggers();
  const [userKeys, setUserKeys] = useState(5);

  const vaultItems: VaultItem[] = [
    { id: '1', name: 'Rare Tiki Recipe', description: 'Exotic blend', isProOnly: false, keysCost: 3 },
    { id: '2', name: 'PRO Early Access', description: 'New seasonal drop', isProOnly: true, keysCost: 0 },
    { id: '3', name: 'Classic Revival', description: 'Lost recipe', isProOnly: false, keysCost: 5 },
  ];

  const handleUnlockItem = (item: VaultItem) => {
    // Gate check with PRO flag
    const canProceed = vaultGate(item.isProOnly, () => {
      // onSuccess - check if user has enough keys
      if (userKeys >= item.keysCost) {
        setUserKeys(prev => prev - item.keysCost);
        unlockRecipe(item);
      } else {
        Alert.alert('Not Enough Keys', `You need ${item.keysCost} keys to unlock this item.`);
      }
    });

    if (!canProceed) {
      console.log('Vault gate blocked - upgrade required');
    }
  };

  const unlockRecipe = (item: VaultItem) => {
    Alert.alert('Unlocked!', `${item.name} is now in your collection.`);
  };

  const renderVaultItem = ({ item }: { item: VaultItem }) => (
    <TouchableOpacity onPress={() => handleUnlockItem(item)}>
      <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#252A2E', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF' }}>
              {item.name}
            </Text>
            <Text style={{ color: '#B8B8B8', marginTop: 4 }}>
              {item.description}
            </Text>
            {item.isProOnly && (
              <Text style={{ color: '#CD7F32', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                PRO EXCLUSIVE
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="key" size={24} color="#D4AF37" />
            <Text style={{ color: '#D4AF37', fontSize: 16, fontWeight: '700' }}>
              {item.keysCost}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#FFF', fontSize: 16 }}>
          Your Keys: {userKeys}
        </Text>
      </View>

      <FlatList
        data={vaultItems}
        renderItem={renderVaultItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
```

---

## 5. Seasonal Gate

**Location**: Seasonal drops screen

**Implementation**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

interface SeasonalDrop {
  id: string;
  title: string;
  description: string;
  cocktails: string[];
}

function SeasonalDropsScreen() {
  const navigation = useNavigation();
  const { seasonalGate } = usePaywallTriggers();

  const currentDrop: SeasonalDrop = {
    id: 'winter-2025',
    title: 'Winter Warmers',
    description: 'Cozy cocktails for cold nights',
    cocktails: ['Hot Toddy', 'Mulled Wine', 'Irish Coffee'],
  };

  const handleViewDrop = () => {
    // Gate check BEFORE showing seasonal content
    const canProceed = seasonalGate(() => {
      // onSuccess - navigate to seasonal collection
      navigation.navigate('SeasonalCollection', { dropId: currentDrop.id });
    });

    if (!canProceed) {
      console.log('Seasonal gate blocked - upgrade required');
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <View style={{ padding: 20, backgroundColor: '#252A2E', borderRadius: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 8 }}>
          {currentDrop.title}
        </Text>
        <Text style={{ color: '#B8B8B8', fontSize: 16, marginBottom: 16 }}>
          {currentDrop.description}
        </Text>

        <Text style={{ color: '#D4AF37', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
          INCLUDED COCKTAILS:
        </Text>
        {currentDrop.cocktails.map((cocktail, index) => (
          <Text key={index} style={{ color: '#FFF', fontSize: 16, marginBottom: 4 }}>
            • {cocktail}
          </Text>
        ))}

        <TouchableOpacity
          style={{
            backgroundColor: '#D4AF37',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 20,
          }}
          onPress={handleViewDrop}
        >
          <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>
            View Collection
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

---

## 6. PRO Tools Gate

**Location**: PRO-exclusive features (smart inventory, advanced AI, creator tools, menu exporter, custom themes)

**Implementation Example 1 - Smart Inventory Suggestions**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

function SmartInventorySuggestions() {
  const { proGate } = usePaywallTriggers();

  const handleGetSuggestions = () => {
    // Gate check with feature name
    const canProceed = proGate('Smart Inventory Suggestions', () => {
      // onSuccess - show AI-powered suggestions
      generateSmartSuggestions();
    });

    if (!canProceed) {
      console.log('PRO gate blocked - upgrade required');
    }
  };

  const generateSmartSuggestions = () => {
    console.log('Generating smart inventory suggestions...');
    // Your AI suggestions logic here
  };

  return (
    <TouchableOpacity
      style={{ padding: 16, backgroundColor: '#CD7F32', borderRadius: 12 }}
      onPress={handleGetSuggestions}
    >
      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
        Get Smart Suggestions (PRO)
      </Text>
    </TouchableOpacity>
  );
}
```

**Implementation Example 2 - Menu Exporter**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

function MenuExporterScreen() {
  const { proGate } = usePaywallTriggers();

  const handleExportMenu = () => {
    const canProceed = proGate('Menu Exporter', () => {
      // onSuccess - export menu
      exportMenuToPDF();
    });

    if (!canProceed) {
      console.log('PRO gate blocked - upgrade required');
    }
  };

  const exportMenuToPDF = () => {
    console.log('Exporting menu to PDF...');
    // Your export logic here
  };

  return (
    <TouchableOpacity onPress={handleExportMenu}>
      <Text>Export Menu (PRO)</Text>
    </TouchableOpacity>
  );
}
```

**Implementation Example 3 - Custom Themes**:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { usePaywallTriggers } from '../hooks/usePaywallTriggers';

function ThemeSettingsScreen() {
  const { proGate } = usePaywallTriggers();

  const themes = [
    { id: 'default', name: 'Classic Dark', isPro: false },
    { id: 'midnight', name: 'Midnight Blue', isPro: true },
    { id: 'rose-gold', name: 'Rose Gold', isPro: true },
  ];

  const handleSelectTheme = (theme: any) => {
    if (!theme.isPro) {
      // Free theme - apply directly
      applyTheme(theme.id);
      return;
    }

    // PRO theme - gate check
    const canProceed = proGate('Custom Themes', () => {
      applyTheme(theme.id);
    });

    if (!canProceed) {
      console.log('PRO gate blocked - upgrade required');
    }
  };

  const applyTheme = (themeId: string) => {
    console.log('Applying theme:', themeId);
    // Your theme application logic here
  };

  const renderTheme = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleSelectTheme(item)}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#FFF', fontSize: 16 }}>{item.name}</Text>
        {item.isPro && (
          <Text style={{ color: '#CD7F32', fontSize: 12 }}>PRO</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={themes}
      renderItem={renderTheme}
      keyExtractor={(item) => item.id}
    />
  );
}
```

---

## 7. XP Level-Up Gate

**Location**: XP system listener (context or custom hook)

**Implementation**:
```typescript
import React, { useEffect, useRef } from 'react';
import { usePaywallTriggers, SUBSCRIPTION_LIMITS } from '../hooks/usePaywallTriggers';

// Custom hook to track XP and trigger gate
export function useXPLevelUpListener(currentXP: number) {
  const { xpGate } = usePaywallTriggers();
  const previousXP = useRef(currentXP);
  const hasShownLevel4Gate = useRef(false);

  useEffect(() => {
    // Check if user just crossed Level 4 threshold
    const justReachedLevel4 =
      previousXP.current < SUBSCRIPTION_LIMITS.XP_LEVEL_4_THRESHOLD &&
      currentXP >= SUBSCRIPTION_LIMITS.XP_LEVEL_4_THRESHOLD;

    if (justReachedLevel4 && !hasShownLevel4Gate.current) {
      // Trigger XP gate (soft upsell)
      xpGate(currentXP, () => {
        console.log('User reached Level 4!');
        // Optional: Additional celebration logic
      });

      hasShownLevel4Gate.current = true;
    }

    previousXP.current = currentXP;
  }, [currentXP, xpGate]);
}

// Usage in a screen or context
function GameScreen() {
  const [xp, setXp] = useState(1200);

  // Hook automatically triggers gate when XP crosses threshold
  useXPLevelUpListener(xp);

  const earnXP = (amount: number) => {
    setXp(prev => prev + amount);
  };

  return (
    <View>
      <Text>Current XP: {xp}</Text>
      <TouchableOpacity onPress={() => earnXP(100)}>
        <Text>Earn 100 XP</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Advanced Patterns

### Pattern 1: Combining Multiple Gates

```typescript
function ComplexFeatureScreen() {
  const { inventoryGate, proGate } = usePaywallTriggers();
  const [inventory, setInventory] = useState([]);

  const handleAddSmartItem = (item: any) => {
    // Check inventory gate first
    const hasInventorySpace = inventoryGate(inventory.length, () => {
      // Then check PRO gate for smart suggestions
      proGate('Smart Suggestions', () => {
        // Both gates passed - add item with AI recommendation
        addItemWithAI(item);
      });
    });

    if (!hasInventorySpace) {
      console.log('Inventory full');
    }
  };

  const addItemWithAI = (item: any) => {
    console.log('Adding item with AI:', item);
  };

  return <View>{/* UI */}</View>;
}
```

### Pattern 2: Preemptive Gate Check

```typescript
function LessonCard({ lesson, index }: { lesson: any; index: number }) {
  const { lessonGate } = usePaywallTriggers();
  const { isKoopePro } = useSubscription();

  // Check if lesson is locked BEFORE user taps
  const isLocked = !isKoopePro && index > 1;

  const handlePress = () => {
    lessonGate(index, () => {
      // Navigate to lesson
      console.log('Opening lesson', lesson.title);
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={isLocked}>
      <View style={{ opacity: isLocked ? 0.5 : 1 }}>
        <Text>{lesson.title}</Text>
        {isLocked && <Text>🔒 KOOPE+ Required</Text>}
      </View>
    </TouchableOpacity>
  );
}
```

### Pattern 3: Silent Gate Check (No Paywall, Just Boolean)

```typescript
function FeatureEnabler() {
  const { proGate } = usePaywallTriggers();
  const { isPro } = useSubscription();

  // Check status without showing paywall
  const hasProAccess = isPro;

  return (
    <View>
      {hasProAccess ? (
        <ProFeature />
      ) : (
        <TouchableOpacity onPress={() => proGate('Advanced Features', () => {})}>
          <Text>Unlock PRO Features</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

## Testing Checklist

- [ ] AI gate blocks FREE users after 3 messages
- [ ] Lesson gate blocks FREE users from lessons 2+
- [ ] Inventory gate blocks FREE users at 10 items
- [ ] Vault gate blocks FREE users entirely
- [ ] Vault gate blocks KOOPE+ users from PRO items
- [ ] Seasonal gate blocks FREE users
- [ ] PRO gate blocks non-PRO users
- [ ] XP gate shows soft upsell at Level 4 (1250 XP)
- [ ] All gates navigate to Paywall screen
- [ ] PRO gates show PRO-specific offering
- [ ] onSuccess callbacks execute when gate passes

---

## Constants Reference

```typescript
import { SUBSCRIPTION_LIMITS } from '../hooks/usePaywallTriggers';

SUBSCRIPTION_LIMITS.FREE_AI_LIMIT          // 3
SUBSCRIPTION_LIMITS.FREE_INVENTORY_LIMIT   // 10
SUBSCRIPTION_LIMITS.FREE_LESSON_LIMIT      // 1 (lessons 0-1 only)
SUBSCRIPTION_LIMITS.XP_LEVEL_4_THRESHOLD   // 1250
```

---

**Status**: ✅ Ready to Integrate
**Last Updated**: 2025-11-27
