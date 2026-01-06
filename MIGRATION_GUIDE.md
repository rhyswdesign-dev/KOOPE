# Database Migration Guide

**Purpose**: Set up all database tables for the Vault economy, user profiles, and progress tracking

**Time Required**: ~5 minutes

---

## Prerequisites

- Active Supabase project
- Access to Supabase Dashboard
- Project URL and Anon Key configured in `.env`

---

## Option 1: Run Complete Migration (Recommended)

This is the fastest way to set up all tables at once.

### Steps:

1. **Open Supabase SQL Editor**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project
   - Click **"SQL Editor"** in the left sidebar

2. **Load the migration script**
   - Click **"New query"**
   - Open the file: `supabase/RUN_ALL_MIGRATIONS.sql`
   - Copy ALL contents (Cmd/Ctrl + A, then Cmd/Ctrl + C)

3. **Paste and run**
   - Paste into the SQL editor (Cmd/Ctrl + V)
   - Click **"Run"** (or press Cmd/Ctrl + Enter)

4. **Verify success**
   - You should see "Migration Complete! Tables created: 8" at the bottom
   - Click **"Table Editor"** in the left sidebar
   - Verify these tables exist:
     - `users_profiles`
     - `user_lesson_progress`
     - `user_module_progress`
     - `user_quiz_attempts`
     - `user_vault_profiles`
     - `vault_transactions`
     - `xp_transactions`
     - `vault_carts`

---

## Option 2: Run Migrations Individually

If you prefer to run migrations one at a time, follow this order:

### Step 1: User Profiles
```sql
-- Run: supabase/migrations/005_users_profile_schema.sql
-- Creates: users_profiles table
```

### Step 2: Progress Tracking
```sql
-- Run: supabase/migrations/004_user_progress_schema.sql
-- Creates: user_lesson_progress, user_module_progress, user_quiz_attempts
```

### Step 3: Vault Economy
```sql
-- Run: supabase/migrations/006_vault_transactions_schema.sql
-- Creates: user_vault_profiles, vault_transactions, xp_transactions, vault_carts
```

### Step 4: Vault Functions
```sql
-- Run: supabase/migrations/007_vault_rpc_functions.sql
-- Creates: RPC functions for stock management and boosters
```

---

## Verification Checklist

After running migrations, verify:

### ✅ Tables Created
- [ ] `users_profiles` - User profile data
- [ ] `user_lesson_progress` - Lesson completion tracking
- [ ] `user_module_progress` - Module completion tracking
- [ ] `user_quiz_attempts` - Quiz attempt history
- [ ] `user_vault_profiles` - XP, Keys, Cash balances
- [ ] `vault_transactions` - Purchase/unlock history
- [ ] `xp_transactions` - XP earning logs
- [ ] `vault_carts` - Shopping cart data

### ✅ RLS Policies
All tables should have Row Level Security enabled. Check by:
1. Go to **Table Editor**
2. Click any table
3. Click **"RLS"** tab
4. Should see policies like "Users can view own profile"

### ✅ Functions
Check functions exist:
1. Go to **Database** → **Functions**
2. Verify these exist:
   - `decrement_vault_item_stock`
   - `activate_user_booster`
   - `check_booster_expiry`
   - `decrement_booster_uses`
   - `handle_new_user`
   - `handle_new_user_vault_profile`

### ✅ Triggers
Check triggers are active:
1. Go to **Database** → **Triggers**
2. Should see:
   - `on_auth_user_created` (creates user profile)
   - `on_auth_user_created_vault_profile` (creates vault profile)
   - Various `updated_at` triggers

---

## Testing the Migration

### Test 1: User Profile Auto-Creation

1. **Create a test user** (via app or Supabase Auth)
2. **Check users_profiles table**:
   ```sql
   SELECT id, email, created_at
   FROM users_profiles
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. **Verify**: New user should appear with default values

### Test 2: Vault Profile Auto-Creation

1. **Check user_vault_profiles table**:
   ```sql
   SELECT user_id, xp_balance, keys_balance
   FROM user_vault_profiles
   ORDER BY created_at DESC
   LIMIT 5;
   ```
2. **Verify**: Each user should have a vault profile with 0 balances

### Test 3: RPC Functions

1. **Test booster activation**:
   ```sql
   SELECT activate_user_booster(
     '<user-uuid>'::uuid,
     'xp_multiplier',
     1.5,
     24,
     NULL
   );
   ```
2. **Verify**: Should return `{"success": true, ...}`

---

## Troubleshooting

### Error: "relation already exists"

**Solution**: Table already created, this is OK. Skip that migration or drop the table first (dangerous!).

### Error: "permission denied"

**Solution**: You need admin access to the Supabase project.

### Error: "auth.users does not exist"

**Solution**: Supabase Auth is not enabled. Go to Authentication → Policies and enable it.

### Error: "function does not exist"

**Solution**: Run the base functions first (from `RUN_ALL_MIGRATIONS.sql` lines 1-30).

---

## Rollback Instructions

**WARNING**: This will delete all data!

To remove all tables:

```sql
-- Drop tables (cascades will remove dependent objects)
DROP TABLE IF EXISTS vault_carts CASCADE;
DROP TABLE IF EXISTS xp_transactions CASCADE;
DROP TABLE IF EXISTS vault_transactions CASCADE;
DROP TABLE IF EXISTS user_vault_profiles CASCADE;
DROP TABLE IF EXISTS user_quiz_attempts CASCADE;
DROP TABLE IF EXISTS user_module_progress CASCADE;
DROP TABLE IF EXISTS user_lesson_progress CASCADE;
DROP TABLE IF EXISTS users_profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS decrement_vault_item_stock(TEXT);
DROP FUNCTION IF EXISTS activate_user_booster(UUID, TEXT, NUMERIC, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS check_booster_expiry(UUID);
DROP FUNCTION IF EXISTS decrement_booster_uses(UUID);
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_new_user_vault_profile();
```

---

## What's Next?

After successful migration:

1. ✅ **Test the app** - Sign in and verify data loads
2. ✅ **Test XP awarding** - Complete a lesson, check XP increases
3. ✅ **Test vault operations** - Browse vault items (when implemented)
4. ✅ **Monitor logs** - Check for any Supabase errors

---

## Need Help?

- Check Supabase logs: **Logs** → **Postgres Logs**
- Review migration files: `supabase/migrations/`
- Check [PHASE2_VAULT_MIGRATION_SUMMARY.md](PHASE2_VAULT_MIGRATION_SUMMARY.md)
