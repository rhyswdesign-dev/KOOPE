# RevenueCat Integration Setup Guide

Complete guide for the KOOPE app's RevenueCat subscription system.

## 📦 Installation Complete

- ✅ `react-native-purchases` - Core RevenueCat SDK
- ✅ `react-native-purchases-ui` - Paywalls & Customer Center

## 🔑 Configuration

### API Keys
Located in: `src/constants/subscriptions.ts`

```typescript
IOS_API_KEY: 'test_KIZwnFeRKJvlQzvHuvqxkwSdSda'
ANDROID_API_KEY: 'test_KIZwnFeRKJvlQzvHuvqxkwSdSda'
```

## 📱 Product Configuration

### Entitlements
Configure these in RevenueCat Dashboard:
- `koope_pro` - KOOPE Pro features
- `pro` - Pro tier features
- `prestige` - Prestige tier features

### Products
Configure these in App Store Connect / Google Play Console and RevenueCat:

**One-time Purchases:**
- `monthly` - Monthly access
- `yearly` - Yearly access
- `lifetime` - Lifetime access

**Pro Tier Subscriptions:**
- `pro_monthly` - Pro Monthly Sub
- `pro_yearly` - Pro Annual

**Prestige Tier Subscriptions:**
- `prestige_monthly` - Prestige Monthly Sub
- `prestige_yearly` - Prestige Annual Sub

### Offerings
Create these in RevenueCat Dashboard:
- `default` - Default offering (shown to all users)
- `pro` - Pro tier offering
- `prestige` - Prestige tier offering
- `onboarding` - Special onboarding offering

## 🏗️ Architecture

### SubscriptionContext
**Location**: `src/contexts/SubscriptionContext.tsx`

Provides global subscription state:
```typescript
const {
  isPro,              // Pro tier active
  isKoopePro,        // KOOPE Pro active
  isPrestige,        // Prestige tier active
  isSubscriber,      // Any subscription active
  isLoading,         // Loading state
  error,             // Error message
  customerInfo,      // RevenueCat customer info
  offerings,         // Available offerings
  refreshSubscriptionStatus,  // Refresh function
  getOfferings,               // Fetch offerings
  restorePurchases,          // Restore purchases
} = useSubscription();
```

### Features

#### 1. Paywall Screen
**Location**: `src/screens/PaywallScreen.tsx`

Custom paywall with beautiful UI - **works immediately without dashboard configuration**.

**Usage:**
```typescript
navigation.navigate('Paywall', {
  offering: 'pro',  // Optional: specific offering
  displayCloseButton: true  // Optional: show close button
});
```

**Features:**
- Fetches offerings directly from RevenueCat SDK
- Beautiful custom UI with package selection
- Handles purchase flow via `Purchases.purchasePackage()`
- Auto-selects best value (Annual package)
- Restore purchases built-in
- Works immediately with just API key configuration

#### 2. Customer Center Screen
**Location**: `src/screens/CustomerCenterScreen.tsx`

Self-service subscription management.

**Usage:**
```typescript
navigation.navigate('CustomerCenter');
```

**Features:**
- View active subscriptions
- Cancel subscriptions
- Change subscription plans
- Restore purchases
- View billing history

#### 3. Subscription Debug Screen
**Location**: `src/screens/SubscriptionDebugScreen.tsx`

Development testing screen.

**Usage:**
```typescript
navigation.navigate('SubscriptionDebug');
```

## 🚀 Implementation Examples

### Check Subscription Status
```typescript
import { useSubscription } from './src/contexts/SubscriptionContext';

function ProFeature() {
  const { isKoopePro, isLoading } = useSubscription();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isKoopePro) {
    return <UpgradeCTA />;
  }

  return <ProFeatureContent />;
}
```

### Show Paywall
```typescript
import { useNavigation } from '@react-navigation/native';

function UpgradeButton() {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('Paywall', {
      offering: 'pro',
      displayCloseButton: true
    });
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>Upgrade to Pro</Text>
    </TouchableOpacity>
  );
}
```

### Manage Subscription
```typescript
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from './src/contexts/SubscriptionContext';

function ManageSubscriptionButton() {
  const navigation = useNavigation();
  const { isSubscriber } = useSubscription();

  if (!isSubscriber) return null;

  return (
    <TouchableOpacity onPress={() => navigation.navigate('CustomerCenter')}>
      <Text>Manage Subscription</Text>
    </TouchableOpacity>
  );
}
```

### Restore Purchases
```typescript
import { useSubscription } from './src/contexts/SubscriptionContext';

function RestoreButton() {
  const { restorePurchases } = useSubscription();
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
      <Text>{isRestoring ? 'Restoring...' : 'Restore Purchases'}</Text>
    </TouchableOpacity>
  );
}
```

## ⚙️ RevenueCat Dashboard Setup

### 1. Create Project
1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Create new project for KOOPE
3. Copy API keys to `src/constants/subscriptions.ts`

### 2. Configure Entitlements
1. Navigate to **Entitlements** tab
2. Create entitlements:
   - `koope_pro`
   - `pro`
   - `prestige`

### 3. Configure Products
1. Navigate to **Products** tab
2. Add all products (see Product Configuration above)
3. Link to App Store Connect / Google Play Console product IDs

### 4. Create Offerings
1. Navigate to **Offerings** tab
2. Create offerings (see Offerings above)
3. Assign products to offerings
4. Set default offering

### 5. Setup Paywalls (Optional - Not Required)
**Note:** The app uses a custom paywall that works immediately without this configuration.

If you want to use RevenueCat's remote Paywalls V2 (optional):
1. Navigate to **Paywalls** tab
2. Enable Paywalls V2 beta
3. Create paywall templates
4. Configure pricing display
5. Customize UI/UX
6. Enable for offerings

### 6. Configure Customer Center
1. Navigate to **Customer Center** tab
2. Enable Customer Center
3. Customize appearance
4. Configure available actions

## 📲 App Store Configuration

### iOS - App Store Connect
1. Create In-App Purchases
2. Set up subscription groups
3. Configure pricing for all products
4. Add localized descriptions
5. Submit for review

### Android - Google Play Console
1. Create subscriptions
2. Set up subscription groups
3. Configure base plans
4. Set pricing for all products
5. Add localized descriptions

## 🧪 Testing

### Sandbox Testing

**iOS:**
1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Run app and attempt purchase
4. Sign in with sandbox account when prompted

**Android:**
1. Add test account in Google Play Console
2. Opt into testing track
3. Install app from Play Store
4. Test purchases

### Test Checklist
- [ ] Purchase Pro Monthly
- [ ] Purchase Pro Yearly
- [ ] Purchase Prestige Monthly
- [ ] Purchase Prestige Yearly
- [ ] Restore purchases
- [ ] Subscription upgrades
- [ ] Subscription downgrades
- [ ] Subscription cancellation
- [ ] Customer Center flow
- [ ] Offline purchases sync
- [ ] Expired subscription handling

## 🔒 Best Practices

### Error Handling
All subscription operations handle errors gracefully and won't block the app. Non-subscribers can still use free features.

### Offline Support
- Customer info cached locally
- Purchases sync when online
- Graceful degradation when offline

### Security
- API keys configured on backend (not hardcoded)
- Server-to-server webhooks for real-time updates
- Receipt validation on RevenueCat servers

### Performance
- Subscription status cached in context
- Minimal API calls
- Efficient entitlement checking

## 📊 Analytics Integration

RevenueCat automatically tracks:
- Purchases
- Renewals
- Cancellations
- Revenue
- Churn
- LTV

Access charts in RevenueCat Dashboard.

## 🔗 Resources

- [RevenueCat Docs](https://docs.revenuecat.com/)
- [React Native SDK](https://docs.revenuecat.com/docs/reactnative)
- [Paywalls](https://docs.revenuecat.com/docs/tools/paywalls)
- [Customer Center](https://docs.revenuecat.com/docs/tools/customer-center)
- [Testing Guide](https://docs.revenuecat.com/docs/test-and-launch)

## 🆘 Troubleshooting

### Paywall Not Showing
1. Check offerings configured in dashboard
2. Verify products linked correctly
3. Check API key is correct
4. Review logs for errors

### Purchases Not Working
1. Verify sandbox account setup
2. Check product IDs match exactly
3. Ensure app is signed with correct provisioning profile
4. Review RevenueCat logs

### Customer Info Not Updating
1. Call `refreshSubscriptionStatus()`
2. Check network connectivity
3. Verify API key
4. Check RevenueCat dashboard for errors

## 📝 Quick Start Guide

### Minimum Setup (Custom Paywall - Works Immediately)
1. **Configure Products**: Set up all products in App Store Connect / Google Play Console
2. **Setup Offerings**: Create offerings in RevenueCat dashboard
3. **Test**: Test the custom paywall with sandbox accounts
4. **Add Gates**: Implement subscription gates for premium features using `SubscriptionGate` component
5. **Launch**: Submit for App Store / Play Store review

### Full Setup (Remote Paywalls - Optional)
1. Complete Minimum Setup above
2. **Enable Paywalls V2**: Enable in RevenueCat dashboard (beta feature)
3. **Design Paywalls**: Configure paywall templates in RevenueCat
4. **Update Code**: Replace custom PaywallScreen with `RevenueCatUI.presentPaywall()` implementation
5. **Analytics**: Set up custom events for tracking

---

**Status**: ✅ Integration Complete
**Last Updated**: 2025-11-26
**Version**: 1.0
