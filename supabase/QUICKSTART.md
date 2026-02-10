# ⚡ Supabase Quick Start Checklist

5-minute setup to get your database running.

## ☑️ Pre-Flight Check

- [ ] Supabase account created
- [ ] Project created in Supabase
- [ ] `.env` file has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Setup Steps (Do in order)

### 1. Create Tables (2 min)
- [ ] Go to Supabase → SQL Editor → New Query
- [ ] Copy all of `migrations/001_create_tables.sql`
- [ ] Paste and click **"Run"**
- [ ] Should see ✅ "Success. No rows returned"

### 2. Add Cocktails (1 min)
- [ ] SQL Editor → New Query
- [ ] Copy all of `migrations/002_seed_cocktails.sql`
- [ ] Paste and click **"Run"**
- [ ] Should see ✅ "Success" with 15 rows inserted

### 3. Create Test User (1 min)
- [ ] Go to Authentication → Users
- [ ] Click "Add user" → "Create new user"
- [ ] Email: `test@koope.app`
- [ ] Password: `TestPassword123!`
- [ ] Check "Auto Confirm Email" ✅
- [ ] Click "Create user"
- [ ] **Copy the User ID** (save it somewhere)

### 4. Verify Setup (1 min)
- [ ] Go to Table Editor
- [ ] See `cocktails` table with 15 rows
- [ ] See `user_inventory` table (empty)
- [ ] See `user_scans` table (empty)

### 5. Test In App (< 1 min)
- [ ] Open KŌOPE app
- [ ] Click "Sign In with Test Account"
- [ ] Should see "Success!" message
- [ ] Skip to main app

## ✅ You're Done!

Now you can:
- Add items to inventory → they save to Supabase
- View "What Can I Make?" → shows real cocktails
- Your 35 mock items need to be re-added

---

## 🔄 Re-Adding Your 35 Items

**Fastest Method:** Manual entry in app
1. Home Bar → + button
2. Enter name, category
3. Save
4. Repeat

**Estimated time:** 10-15 minutes

---

## ❌ Troubleshooting

| Problem | Fix |
|---------|-----|
| "Table not found" | Run migration 001 again |
| Empty cocktails | Run migration 002 again |
| Can't sign in | Create test user in Auth |
| Items not saving | Check .env has correct keys |

---

**Need detailed help?** See [SUPABASE_SETUP.md](../SUPABASE_SETUP.md)
