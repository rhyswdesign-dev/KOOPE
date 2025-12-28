# Vault Migration Status

## ✅ Completed

1. **Tables Created Successfully**
   - `user_vault_profiles` - User vault balances and booster state
   - `vault_transactions` - Purchase and unlock transactions
   - `xp_transactions` - XP earning and spending history
   - `vault_carts` - Shopping cart state

2. **RPC Functions Created**
   - `activate_user_booster()` - Activate XP/Keys multiplier boosters
   - `check_booster_expiry()` - Auto-expire boosters
   - `decrement_booster_uses()` - Decrement use-based boosters

3. **Triggers Created**
   - Auto-update `updated_at` timestamps
   - Auto-create vault profile on user signup

4. **Indexes Created**
   - Performance indexes on user_id and created_at columns

5. **Repository Code Implemented**
   - `vaultRepo.ts` - Vault profile and balance operations
   - `vaultTransactionRepo.ts` - Transaction logging and booster management
   - `vaultService.ts` - Updated to use Supabase instead of Firebase

## ⚠️ Known Issue: RLS Policies

**Problem**: RLS policies are currently set to `true`, which allows all authenticated users to access all data. This is **not secure**.

**Current State**:
```sql
-- Current policy (INSECURE)
USING (true)  -- Allows ALL authenticated users to access ALL rows
```

**Required State**:
```sql
-- Required policy (SECURE)
USING (auth.uid() = user_id)  -- Only allows users to access their own data
```

**Why SQL Creation Failed**:
When attempting to create policies via SQL with `auth.uid() = user_id`, we encountered:
```
ERROR: operator does not exist: uuid = text
```

This suggests a type mismatch issue in your Supabase instance configuration.

## 🔧 Required Action: Fix RLS Policies

You have two options:

### Option 1: Fix via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Policies**
3. For each table (`user_vault_profiles`, `vault_transactions`, `xp_transactions`, `vault_carts`):

   **For SELECT policies:**
   - Click the policy name
   - Edit the USING expression to: `auth.uid() = user_id`
   - Save

   **For INSERT policies:**
   - Click the policy name
   - Edit the WITH CHECK expression to: `auth.uid() = user_id`
   - Save

   **For UPDATE policies:**
   - Click the policy name
   - Edit both USING and WITH CHECK to: `auth.uid() = user_id`
   - Save

### Option 2: Drop and Recreate via SQL

If you want to try SQL again, you can:

1. Drop all vault policies:
```sql
-- Run this in Supabase SQL Editor
DROP POLICY IF EXISTS "Users can view their vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can insert their vault profile" ON user_vault_profiles;
DROP POLICY IF EXISTS "Users can update their vault profile" ON user_vault_profiles;
-- (repeat for other tables)
```

2. Then manually create policies via Dashboard UI as described in Option 1

## 📋 Next Steps

1. **Fix RLS Policies** (using Option 1 above)
2. **Test Vault Operations** in your app:
   - User vault profile creation
   - XP earning and spending
   - Item unlocking
   - Booster activation
3. **Verify Data Security**:
   - Ensure users can only access their own vault data
   - Test that RLS prevents cross-user data access

## 🎯 Migration Files Reference

- `VAULT_NO_RLS.sql` - Creates tables without policies (already run)
- `ADD_RLS_POLICIES.sql` - Attempts to add policies via SQL (failed due to type error)
- `CHECK_VAULT_STATUS.sql` - Diagnostic query to check current state
- `CHECK_VAULT_POLICIES.sql` - View current policy expressions
