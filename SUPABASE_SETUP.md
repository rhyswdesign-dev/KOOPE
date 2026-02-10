# 🎯 Supabase Setup Guide for KŌOPE App

Complete, organized guide to set up your Supabase database.

## 📋 Prerequisites

- ✅ Supabase account (https://supabase.com)
- ✅ KŌOPE project created in Supabase
- ✅ Environment variables configured in `.env`

## 🗄️ Database Architecture

### Tables Overview
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ user_inventory  │────▶│ auth.users   │◀────│ user_scans  │
│ (bar items)     │     │ (Supabase)   │     │ (analytics) │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               │
                        ┌──────▼──────┐
                        │  cocktails  │
                        │  (recipes)  │
                        └─────────────┘
```

### Table Details

**1. user_inventory**
- Purpose: Store user's bar inventory
- Fields: item_name, item_type, category, brand, image_url
- RLS: Users can only access their own items

**2. user_scans**
- Purpose: Track scan activity for analytics
- Fields: scan_type, item_name, brand_name, location, confidence
- RLS: Users can view their own scans, guests can create scans

**3. cocktails**
- Purpose: Recipe database
- Fields: name, ingredients (comma-separated), instructions, category, glass_type
- RLS: Public read access, admin write only

**4. user_profiles** (auto-created by Supabase Auth)
- Purpose: Extended user information
- Managed automatically by Supabase

---

## 🚀 Setup Instructions

### Step 1: Access SQL Editor

1. Go to https://app.supabase.com
2. Select your KŌOPE project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"**

### Step 2: Run Database Migrations

#### Migration 1: Create Tables

📄 File: `supabase/migrations/001_create_tables.sql`

**What it does:**
- Creates all 3 tables with proper types
- Sets up indexes for fast queries
- Creates `get_monthly_scan_count()` function
- Enables Row Level Security
- Creates security policies

**How to run:**
1. Copy entire file contents
2. Paste into SQL Editor
3. Click **"Run"** button
4. ✅ Should see "Success. No rows returned"

#### Migration 2: Seed Cocktails

📄 File: `supabase/migrations/002_seed_cocktails.sql`

**What it does:**
- Adds 15 popular cocktail recipes
- Includes classics, modern, and tiki drinks

**How to run:**
1. Copy entire file contents
2. Paste into SQL Editor
3. Click **"Run"** button
4. ✅ Should see "Success" message

### Step 3: Verify Tables

1. Go to **"Table Editor"** (left sidebar)
2. You should see:
   - ✅ `cocktails` (15 rows)
   - ✅ `user_inventory` (0 rows initially)
   - ✅ `user_scans` (0 rows initially)

3. Click each table to verify structure

### Step 4: Create Test User

1. Go to **"Authentication"** > **"Users"**
2. Click **"Add user"** > **"Create new user"**
3. Fill in:
   ```
   Email: test@koope.app
   Password: TestPassword123!
   Auto Confirm Email: ✅ (check this)
   ```
4. Click **"Create user"**
5. **Copy the User ID** (you'll need this later)

### Step 5: Test the Connection

1. Open your KŌOPE app
2. Go through onboarding to the Sign-In screen
3. Click **"Sign In with Test Account"** button
4. Should see success message
5. Skip to main app

---

## 📦 Migrating Your 35 Inventory Items

You have 35 items in mock data. Here are your options:

### Option A: Manual Re-entry (Recommended)
**Best for:** Learning the app, ensuring data quality

1. Go to "Home Bar" in the app
2. For each item, use:
   - 📸 Camera scan (if you have the bottle)
   - ➕ Manual entry (fastest for bulk)
3. Items automatically save to Supabase

**Estimate:** ~10-15 minutes for 35 items

### Option B: Bulk Import via Supabase
**Best for:** Speed, technical users

1. Go to **"Table Editor"** > `user_inventory`
2. Click **"Insert"** > **"Insert row"**
3. Fill in each field:
   ```
   user_id: [Your test user UUID from Step 4]
   item_type: 'spirit' or 'ingredient'
   item_name: 'Vodka'
   category: 'vodka'
   brand: 'Tito's' (optional)
   ```
4. Click **"Save"**
5. Repeat for each item

**Estimate:** ~15-20 minutes for 35 items

### Option C: Export/Import Script (Advanced)
If you want to preserve your exact mock data, I can create a migration script.

---

## 🔒 Security Configuration

All security is automatically configured by the migrations:

### Row Level Security (RLS) Policies

**user_inventory:**
```sql
✅ Users can SELECT their own inventory
✅ Users can INSERT to their own inventory
✅ Users can UPDATE their own inventory
✅ Users can DELETE from their own inventory
```

**user_scans:**
```sql
✅ Users can SELECT their own scans
✅ Anyone can INSERT scans (for guest users)
✅ Users can UPDATE their own scans
```

**cocktails:**
```sql
✅ Public SELECT access (everyone)
❌ Only admins can INSERT/UPDATE/DELETE
```

---

## 🧪 Testing Your Setup

### Test 1: View Cocktails
```sql
SELECT * FROM cocktails LIMIT 5;
```
Expected: 5 cocktail rows

### Test 2: Check RLS
```sql
SELECT COUNT(*) FROM user_inventory;
```
Expected: 0 (until you add items)

### Test 3: Test Function
```sql
SELECT get_monthly_scan_count('[your-user-id]');
```
Expected: 0

### In-App Tests:
1. ✅ Sign in with test account
2. ✅ Add item to inventory
3. ✅ Go to "What Can I Make?"
4. ✅ See cocktails you can make
5. ✅ Filter by ingredients you selected

---

## 📊 Database Maintenance

### Adding More Cocktails

**Via SQL:**
```sql
INSERT INTO cocktails (name, ingredients, instructions, category, glass_type, garnish)
VALUES (
  'Cosmopolitan',
  'Vodka, Triple Sec, Cranberry Juice, Lime Juice',
  'Shake all ingredients with ice. Strain into chilled martini glass.',
  'Classic',
  'Martini Glass',
  'Lime twist'
);
```

**Via Table Editor:**
1. Go to `cocktails` table
2. Click "Insert" > "Insert row"
3. Fill in fields
4. Save

### Viewing User Stats

```sql
-- Active users this month
SELECT COUNT(DISTINCT user_id) FROM user_scans
WHERE scanned_at >= date_trunc('month', NOW());

-- Most popular spirits
SELECT item_name, COUNT(*) as scans
FROM user_scans
WHERE item_name IS NOT NULL
  AND scan_type = 'bottle'
GROUP BY item_name
ORDER BY scans DESC
LIMIT 10;

-- Inventory breakdown
SELECT category, COUNT(*) as items
FROM user_inventory
GROUP BY category
ORDER BY items DESC;
```

### Backups

1. Go to **"Database"** > **"Backups"**
2. Enable daily backups
3. Download manual backup before major changes

---

## 🐛 Troubleshooting

### "Table 'public.cocktails' does not exist"
**Fix:** Run `001_create_tables.sql` migration

### "Row Level Security" policy violation
**Fix:**
- Make sure you're signed in
- Check user_id matches your auth user
- Verify RLS policies exist

### Empty inventory after adding items
**Fix:**
- Check browser console for errors
- Verify Supabase URL and anon key in `.env`
- Check **"Logs"** in Supabase for errors

### "No cocktails found"
**Fix:** Run `002_seed_cocktails.sql` migration

---

## 🎯 Next Steps After Setup

1. **Turn off DEV MODE**
   - File: `src/hooks/useSimpleOnboarding.ts`
   - Comment out lines 42-44 (auto sign-out)

2. **Add More Cocktails**
   - Expand your recipe database
   - Include your favorite drinks

3. **Configure OAuth** (Optional)
   - Set up Apple Sign-In
   - Set up Google Sign-In

4. **Test "What Can I Make?"**
   - Add diverse inventory items
   - Test matching algorithm
   - Verify ingredient highlighting

---

## 📞 Need Help?

**Common Issues:**
- Check Supabase logs: **"Logs"** > **"Postgres Logs"**
- Verify environment variables in `.env.local`
- Make sure tables are in `public` schema
- Check browser console for client errors

**Supabase Resources:**
- Documentation: https://supabase.com/docs
- SQL Reference: https://supabase.com/docs/guides/database

---

✅ **Setup Complete!** Your app is now using Supabase for production data storage.
