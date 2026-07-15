# Supabase Database

Database setup and migrations for KŌOPE app.

## 📚 Documentation

- **[📖 SUPABASE_SETUP.md](../SUPABASE_SETUP.md)** - Complete setup guide with troubleshooting
- **`migrations/`** is the single source of truth for schema/RLS. Do not add new ad-hoc `.sql` files at the `supabase/` root — add a numbered migration instead (standing rule, see `docs/KOOPE-ENGINEERING-WORKPLAN.md` §"Cross-cutting standing rules").
- **`archive/`** holds ~35 historical one-off `.sql`/`.md` files that were run by hand against production before the migrations directory existed. They are NOT tracked as applied migrations and should not be re-run as-is; kept for historical reference only. Where their content was still live, it has been re-expressed as a numbered migration (see `migrations/029_fix_rls_recipes_and_vault.sql` for the RLS fixes).
- **`__tests__/`** holds SQL verification scripts to run manually against a database after applying migrations (e.g. RLS isolation checks).

## 📁 Directory Structure

```
supabase/
├── README.md                      # This file
├── QUICKSTART.md                  # Quick setup checklist
├── migrations/
│   ├── 001_create_tables.sql     # Creates all tables, indexes, RLS
│   └── 002_seed_cocktails.sql    # Adds 15 sample cocktails
```

## 🗄️ Database Tables

### Core Tables

| Table | Purpose | Rows (initial) |
|-------|---------|----------------|
| `cocktails` | Recipe database | 15 |
| `user_inventory` | User's bar inventory | 0 |
| `user_scans` | Scan tracking & analytics | 0 |

### Supporting

| Table | Purpose | Managed By |
|-------|---------|------------|
| `user_profiles` | User info | Supabase Auth |
| `auth.users` | Authentication | Supabase Auth |

## 🚀 Quick Setup

### 1. Run Migrations
```sql
-- In Supabase SQL Editor:

-- Step 1: Create tables
-- Copy/paste: migrations/001_create_tables.sql

-- Step 2: Add cocktails
-- Copy/paste: migrations/002_seed_cocktails.sql
```

### 2. Create Test User
- Email: `test@koope.app`
- Password: `TestPassword123!`

### 3. Test
- Sign in to app with test account
- Add items to inventory
- Check "What Can I Make?"

## 📊 Schema Overview

### user_inventory
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
item_type       TEXT ('spirit' | 'ingredient')
item_name       TEXT
category        TEXT
brand           TEXT (optional)
image_url       TEXT (optional)
added_at        TIMESTAMP
```

### user_scans
```sql
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES auth.users (nullable)
scan_type               TEXT ('bottle' | 'ingredient' | 'recipe')
item_name               TEXT
brand_name              TEXT
scanned_at              TIMESTAMP
detection_confidence    DECIMAL
user_location           TEXT
added_to_inventory      BOOLEAN
```

### cocktails
```sql
id              UUID PRIMARY KEY
name            TEXT
ingredients     TEXT (comma-separated)
instructions    TEXT
category        TEXT
glass_type      TEXT
garnish         TEXT
image_url       TEXT (optional)
```

## 🔒 Security

**Row Level Security (RLS) enabled on all tables:**

- `user_inventory`: Users can only access their own items
- `user_scans`: Users can view their own scans
- `cocktails`: Public read, admin write

**Policies are automatically created by migrations.**

## 🛠️ Maintenance

### Add Cocktail
```sql
INSERT INTO cocktails (name, ingredients, instructions, category, glass_type)
VALUES ('Drink Name', 'Ingredient1, Ingredient2', 'Instructions...', 'Category', 'Glass Type');
```

### View User Stats
```sql
-- Monthly scans per user
SELECT user_id, COUNT(*) as scans
FROM user_scans
WHERE scanned_at >= date_trunc('month', NOW())
GROUP BY user_id;
```

### Backup
Go to Supabase Dashboard → Database → Backups

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Table not found | Run `001_create_tables.sql` |
| Empty cocktails | Run `002_seed_cocktails.sql` |
| RLS policy error | Make sure user is signed in |
| Items not saving | Check `.env` has correct keys |

## 📞 Support

- [Supabase Docs](https://supabase.com/docs)
- [SQL Reference](https://supabase.com/docs/guides/database)
- See detailed setup guide: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md)

---

**Last Updated:** Setup complete with organized migration structure
