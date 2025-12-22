# Data Migration Scripts

This directory contains scripts for migrating data from Firebase to Supabase.

## Prerequisites

1. **Firebase Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the downloaded file as `serviceAccountKey.json` in this directory

2. **Supabase Service Role Key**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Project Settings → API
   - Copy the "service_role" key (not the "anon" key)
   - Add to your `.env` file: `SUPABASE_SERVICE_ROLE_KEY=your-key-here`

## Usage

### Step 1: Export Firebase Data

```bash
# Install dependencies
npm install firebase-admin

# Run export script
node scripts/export-firebase-data.js
```

This will create an `exports/` directory with JSON files for all your Firebase collections.

### Step 2: Review Exported Data

Check the files in the `exports/` directory:
- `users.json` - User profiles
- `recipes.json` - Recipe data
- `feedback.json` - User feedback
- `users_preferences.json` - User preferences
- `challenges.json` - Challenge data (if exists)

### Step 3: Import to Supabase

```bash
# Make sure your .env has SUPABASE_SERVICE_ROLE_KEY set
npx ts-node scripts/import-to-supabase.ts
```

This will import all data into your Supabase tables with proper transformations.

### Step 4: Verify Data

1. Go to Supabase Dashboard → Table Editor
2. Check each table has the expected data
3. Verify Row Level Security is working (try accessing data as a test user)
4. Test the app to ensure everything works

## What Gets Migrated

- ✅ User profiles → `profiles` table
- ✅ Recipes → `recipes` table
- ✅ Feedback → `feedback` table
- ✅ User preferences → `user_preferences` table
- ✅ Challenges → `challenges` table (if exists)

## Data Transformations

The scripts automatically handle:
- Firebase Timestamps → ISO date strings
- Field name conversions (camelCase → snake_case)
- Data structure adjustments for Supabase schema
- Parent-child relationships from subcollections

## Troubleshooting

**Error: serviceAccountKey.json not found**
- Download the Firebase service account key (see Prerequisites)

**Error: Missing Supabase credentials**
- Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env` file

**Import errors**
- Check that your Supabase database has the required tables
- Run the migration SQL files from `supabase/migrations/`
- Verify RLS policies are set up correctly

**Data not appearing in app**
- Check RLS policies in Supabase Dashboard
- Ensure user IDs match between Firebase and Supabase auth
- Verify the app is using the correct Supabase URL and anon key

## Safety Notes

⚠️ **Important Security Notes:**

1. **Never commit serviceAccountKey.json** - It's in .gitignore, but double-check
2. **Never commit .env with SUPABASE_SERVICE_ROLE_KEY** - This key bypasses all security
3. **Keep Firebase project active** during migration period as a backup
4. **Test thoroughly** before deleting Firebase data
5. **Archive Firebase project** - Don't delete it until production is stable

## Need Help?

See the main migration guide: [FIREBASE_TO_SUPABASE_MIGRATION.md](../FIREBASE_TO_SUPABASE_MIGRATION.md)
