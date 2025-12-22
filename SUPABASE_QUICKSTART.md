# Supabase Quick Start Guide

This guide will get your app running with Supabase in under 30 minutes.

## Prerequisites

- Supabase account ([sign up free](https://supabase.com))
- Google Cloud Console account ([console.cloud.google.com](https://console.cloud.google.com))
- Apple Developer account (for iOS deployment)

---

## Step 1: Create Supabase Project (5 min)

1. **Go to [Supabase Dashboard](https://app.supabase.com)**

2. **Create a new project**
   - Click "New Project"
   - Organization: Select or create one
   - Name: `koope-production` (or your choice)
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
   - Click "Create new project"

3. **Wait for project to initialize** (~2 minutes)

4. **Get your API credentials**
   - Go to Project Settings > API
   - Copy `Project URL` → This is your `SUPABASE_URL`
   - Copy `anon public` key → This is your `SUPABASE_ANON_KEY`

---

## Step 2: Configure Environment Variables (2 min)

1. **Copy `.env.example` to `.env`**
   ```bash
   cp .env.example .env
   ```

2. **Update Supabase credentials in `.env`**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   Replace with your actual values from Step 1.

3. **Restart your development server**
   ```bash
   # Kill the current server (Ctrl+C)
   # Restart
   npm start
   ```

---

## Step 3: Run Database Migrations (3 min)

You can run migrations either via Supabase Dashboard or CLI.

### Option A: Using Supabase Dashboard (Recommended)

1. **Open SQL Editor**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Run the migration**
   - Click "New query"
   - Copy the entire contents of `supabase/migrations/001_challenges_schema.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

3. **Verify tables created**
   - Click "Table Editor" in left sidebar
   - You should see:
     - `challenges`
     - `user_challenge_progress`
     - `profiles`

4. **Seed sample data**
   - Go back to "SQL Editor"
   - Click "New query"
   - Copy contents of `supabase/seed_challenges.sql`
   - Paste and run

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or manually run the SQL files
supabase db execute --file supabase/migrations/001_challenges_schema.sql
supabase db execute --file supabase/seed_challenges.sql
```

---

## Step 4: Set Up Google OAuth (10 min)

### 4.1 Configure Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**

2. **Create or select a project**

3. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"

5. **Configure OAuth consent screen** (if prompted)
   - User Type: External
   - App name: KŌOPE
   - User support email: your email
   - Developer contact: your email
   - Click "Save and Continue"
   - Scopes: Leave default, click "Save and Continue"
   - Test users: Add yourself, click "Save and Continue"

6. **Create iOS OAuth Client**
   - Application type: iOS
   - Name: KŌOPE iOS
   - Bundle ID: Your app's bundle ID (e.g., `com.yourcompany.koope`)
   - Click "Create"
   - **Copy the iOS Client ID** → Save for later

7. **Create Android OAuth Client** (optional, for Android support)
   - Application type: Android
   - Name: KŌOPE Android
   - Package name: Your app's package name
   - SHA-1 signing certificate: Get from `keytool` or Expo
   - Click "Create"
   - **Copy the Android Client ID** → Save for later

8. **Create Web OAuth Client** (required by Supabase)
   - Application type: Web application
   - Name: KŌOPE Web
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
   - Click "Create"
   - **Copy the Web Client ID** → Save for later

### 4.2 Update Environment Variables

Add the Google Client IDs to your `.env`:

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-ghijkl.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-mnopqr.apps.googleusercontent.com
```

### 4.3 Configure Supabase for Google OAuth

1. **Go to Supabase Dashboard** → Your Project → Authentication → Providers

2. **Enable Google provider**
   - Toggle "Google" to enabled
   - Paste your **Web Client ID** from Step 4.1.8
   - Get the Client Secret:
     - Go back to Google Cloud Console > Credentials
     - Click on your Web OAuth client
     - Copy the "Client secret"
   - Paste Client Secret into Supabase
   - Click "Save"

---

## Step 5: Set Up Apple Sign-In (5 min)

### 5.1 Configure Apple Developer Account

1. **Go to [Apple Developer](https://developer.apple.com)**

2. **Register your App ID** (if not already done)
   - Go to Certificates, Identifiers & Profiles
   - Click "Identifiers" > "+"
   - Select "App IDs" > "App"
   - Description: KŌOPE
   - Bundle ID: Explicit (e.g., `com.yourcompany.koope`)
   - Capabilities: Check "Sign in with Apple"
   - Click "Continue" > "Register"

3. **Create a Services ID** (for Supabase)
   - Go to Identifiers > "+"
   - Select "Services IDs"
   - Description: KŌOPE Auth Service
   - Identifier: `com.yourcompany.koope.auth`
   - Check "Sign in with Apple"
   - Click "Configure"
   - Primary App ID: Select your app's ID
   - Domains: `your-project.supabase.co`
   - Return URLs: `https://your-project.supabase.co/auth/v1/callback`
   - Click "Continue" > "Register"

4. **Create a Private Key**
   - Go to Keys > "+"
   - Key Name: KŌOPE Apple Sign-In Key
   - Check "Sign in with Apple"
   - Click "Configure" > Select your App ID
   - Click "Continue" > "Register"
   - **Download the key file** (`.p8`) - You can only download this once!
   - Note the Key ID (e.g., `ABC123DEF4`)

5. **Get your Team ID**
   - Go to Membership
   - Copy your Team ID (e.g., `XYZ789ABC1`)

### 5.2 Configure Supabase for Apple Sign-In

1. **Go to Supabase Dashboard** → Your Project → Authentication → Providers

2. **Enable Apple provider**
   - Toggle "Apple" to enabled
   - Services ID: `com.yourcompany.koope.auth` (from Step 5.1.3)
   - Team ID: Your Apple Team ID (from Step 5.1.5)
   - Key ID: Your Key ID (from Step 5.1.4)
   - Private Key: Open the `.p8` file you downloaded, copy the entire contents
   - Click "Save"

---

## Step 6: Test Authentication (5 min)

### On iOS Simulator

1. **Start the app**
   ```bash
   npm start
   # Press 'i' for iOS simulator
   ```

2. **Go through onboarding**
   - Swipe through welcome carousel
   - On sign-in screen, tap "Continue with Apple" or "Continue with Google"

3. **Verify auth works**
   - Should authenticate successfully
   - Should navigate to main app
   - Check Supabase Dashboard > Authentication > Users to see new user

### Troubleshooting

**Google Sign-In not working?**
- Verify all 3 client IDs are correct in `.env`
- Check Web Client ID and Secret in Supabase
- Ensure redirect URI matches exactly

**Apple Sign-In not working?**
- Verify Services ID, Team ID, Key ID in Supabase
- Check Private Key is complete (including headers)
- Ensure domain and return URL are correct
- Apple Sign-In only works on physical devices or simulators with Apple ID

**"Missing Supabase configuration" error?**
- Check `.env` file exists and has correct values
- Restart development server after changing `.env`
- Ensure values don't have quotes or extra spaces

---

## Step 7: Verify Challenge System (2 min)

1. **Open the app**

2. **Navigate to Lessons screen**

3. **Check the tabs**
   - You should see: Lessons, Challenges, Challenge 2
   - Both challenge tabs should show sample challenges
   - Progress bars should display (hardcoded for now)

4. **Verify in Supabase**
   - Go to Supabase Dashboard > Table Editor
   - Check `challenges` table has 8 sample challenges
   - Daily (3), Weekly (3), Monthly (2)

---

## Next Steps

Now that Supabase is configured:

1. **Connect Challenge Progress** - Hook up user actions to `challengeService.updateProgress()`
2. **Implement Reward Claiming** - Add UI for claiming XP/keys/badges
3. **Choose Challenge UI** - Pick between "Challenges" or "Challenge 2" tab
4. **Migrate Firebase Data** - Move existing user data to Supabase
5. **Remove Firebase** - Clean up old Firebase code

---

## Configuration Checklist

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Sample challenges seeded
- [ ] Google OAuth configured (Cloud Console + Supabase)
- [ ] Apple Sign-In configured (Developer Portal + Supabase)
- [ ] Tested authentication on simulator
- [ ] Verified challenge data in database
- [ ] Restarted development server with new env vars

---

## Quick Reference

### Supabase Dashboard URLs

- **Project Dashboard**: `https://app.supabase.com/project/your-project-ref`
- **SQL Editor**: `https://app.supabase.com/project/your-project-ref/sql`
- **Table Editor**: `https://app.supabase.com/project/your-project-ref/editor`
- **Authentication**: `https://app.supabase.com/project/your-project-ref/auth/users`
- **API Settings**: `https://app.supabase.com/project/your-project-ref/settings/api`

### External Services

- **Google Cloud Console**: `https://console.cloud.google.com`
- **Apple Developer**: `https://developer.apple.com`

### Local Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# View environment variables
cat .env

# Check database migrations
ls supabase/migrations/

# Install Supabase CLI
npm install -g supabase
```

---

## Support

If you encounter issues:

1. Check [SUPABASE_AUTH_MIGRATION.md](./SUPABASE_AUTH_MIGRATION.md) for detailed troubleshooting
2. Review [CHALLENGE_SYSTEM_SETUP.md](./CHALLENGE_SYSTEM_SETUP.md) for challenge setup
3. Check Supabase logs in Dashboard > Logs
4. Verify all environment variables are correct

---

**Estimated Setup Time**: 25-30 minutes

Once complete, your app will have:
- ✅ Working Apple & Google OAuth
- ✅ Database with challenge system
- ✅ User profiles
- ✅ Row-level security
- ✅ Session persistence

**Ready to launch!** 🚀
