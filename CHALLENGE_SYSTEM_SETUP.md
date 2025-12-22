# Challenge System Setup Guide

This guide walks you through setting up the challenge rotation system with Supabase.

## Overview

The challenge system provides:
- **Daily challenges** (3 challenges, reset at midnight)
- **Weekly challenges** (2-3 challenges, reset on Monday)
- **Monthly challenges** (1-2 challenges, reset on first of month)
- Progress tracking per user
- Reward system (XP, vault keys, badges)

## Database Setup

### 1. Run the Migration

Apply the schema migration to your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard > SQL Editor
# Copy and paste: supabase/migrations/001_challenges_schema.sql
```

This creates:
- `challenges` table - Stores challenge definitions
- `user_challenge_progress` table - Tracks user progress
- `profiles` table - User profile data
- Row Level Security policies
- Indexes for performance
- Triggers for `updated_at` timestamps

### 2. Seed Sample Data

Populate with sample challenges:

```bash
# Using Supabase CLI
supabase db seed

# Or manually in Supabase Dashboard > SQL Editor
# Copy and paste: supabase/seed_challenges.sql
```

This creates sample challenges across all three frequencies.

## Challenge Types

### Daily Challenges (3 active)
- Quick Study - Complete 3 lessons (50 XP)
- Perfect Score - Get 100% on quiz (75 XP)
- Streak Keeper - Maintain streak (30 XP)

### Weekly Challenges (2-3 active)
- Recipe Explorer - View 10 recipes (150 XP + 1 key)
- XP Grinder - Earn 500 XP (200 XP + 1 key)
- Bar Crawler - Visit 5 bars (120 XP)

### Monthly Challenges (1-2 active)
- Master Mixologist - Complete all modules (500 XP + 3 keys + badge)
- Vault Raider - Unlock 10 recipes (400 XP + 2 keys)

## Using the Challenge Service

### Get Active Challenges

```typescript
import { challengeService } from './src/services/challengeService';

const challenges = await challengeService.getActiveChallenges(userId);
```

Returns challenges with user's current progress merged in.

### Update Progress

```typescript
// Increment progress by 1
await challengeService.updateProgress(userId, challengeId);

// Increment by custom amount
await challengeService.updateProgress(userId, challengeId, 5);
```

Automatically marks as completed when `progress >= requirementCount`.

### Claim Rewards

```typescript
const reward = await challengeService.claimReward(userId, challengeId);

if (reward) {
  console.log(`Earned ${reward.xp} XP`);
  if (reward.keys) console.log(`Earned ${reward.keys} keys`);
  if (reward.badge) console.log(`Unlocked badge: ${reward.badge}`);
}
```

## Challenge Rotation

Challenges expire automatically based on frequency:

- **Daily**: Midnight tonight (23:59:59)
- **Weekly**: Next Monday at midnight
- **Monthly**: Last day of current month at 23:59:59

### Generating New Challenges

The `generateChallenges()` method is a placeholder for creating new challenges:

```typescript
// Call from a scheduled job (e.g., cron, Supabase Edge Function)
await challengeService.generateChallenges('daily');
await challengeService.generateChallenges('weekly');
await challengeService.generateChallenges('monthly');
```

## UI Components

### Two Challenge Tab Designs

The app includes two challenge UI designs for comparison:

1. **Challenges Tab** - Simple list with difficulty badges
2. **Challenge 2 Tab** - Grouped by frequency with progress bars

Navigate to Lessons screen → Challenges/Challenge 2 tabs to compare.

## Integration Example

```typescript
// In your component
import { useState, useEffect } from 'react';
import { challengeService } from './services/challengeService';
import { useAuth } from './contexts/AuthContext';

function ChallengesScreen() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    if (user) {
      loadChallenges();
    }
  }, [user]);

  const loadChallenges = async () => {
    const data = await challengeService.getActiveChallenges(user.id);
    setChallenges(data);
  };

  const handleChallengeAction = async (challengeId) => {
    const completed = await challengeService.updateProgress(user.id, challengeId);

    if (completed) {
      const reward = await challengeService.claimReward(user.id, challengeId);
      // Show reward UI
      alert(`Challenge complete! Earned ${reward.xp} XP`);
    }

    await loadChallenges(); // Refresh
  };

  return (
    // Render challenges with progress bars
  );
}
```

## Requirement Types

When creating new challenges, use these requirement types:

- `lesson_complete` - Complete N lessons
- `xp_earn` - Earn N XP
- `streak_maintain` - Keep streak for N days
- `recipe_view` - View N recipes
- `bar_visit` - Visit N bars
- `vault_unlock` - Unlock N vault items
- `quiz_perfect` - Get perfect score N times
- `module_complete` - Complete N modules

## Database Schema Reference

### challenges table
```sql
- id (uuid, primary key)
- title (text)
- description (text)
- category (skill|progress|exploration|social)
- frequency (daily|weekly|monthly)
- difficulty (easy|medium|hard|epic)
- xp_reward (integer)
- keys_reward (integer, nullable)
- badge_reward (text, nullable)
- requirement_type (enum)
- requirement_count (integer)
- icon (text - Ionicons name)
- color (text - hex color)
- expires_at (timestamptz)
```

### user_challenge_progress table
```sql
- user_id (uuid, foreign key to auth.users)
- challenge_id (uuid, foreign key to challenges)
- progress (integer)
- is_completed (boolean)
- completed_at (timestamptz, nullable)
- started_at (timestamptz)
- updated_at (timestamptz)
```

## Next Steps

1. ✅ Database schema created
2. ✅ Sample challenges seeded
3. ✅ Challenge service implemented
4. ✅ UI components created
5. 🔲 Connect to actual user actions (lesson completion, XP earning, etc.)
6. 🔲 Implement scheduled challenge rotation
7. 🔲 Add reward claiming UI with animations
8. 🔲 Create challenge notification system

## Scheduled Challenge Rotation (Optional)

Use Supabase Edge Functions or a cron job to rotate challenges:

```typescript
// Edge Function: functions/rotate-challenges/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const now = new Date().toISOString();

  // Delete expired challenges
  await supabase
    .from('challenges')
    .delete()
    .lt('expires_at', now);

  // Generate new challenges
  // (Implementation depends on your challenge generation logic)

  return new Response('Challenges rotated', { status: 200 });
});
```

Schedule with:
```bash
# Daily at midnight
0 0 * * * curl -X POST https://your-project.supabase.co/functions/v1/rotate-challenges
```

## Troubleshooting

### Challenge Progress Not Updating
- Verify user is authenticated (`user.id` exists)
- Check RLS policies allow user to insert/update their progress
- Ensure challenge hasn't expired

### Challenges Not Appearing
- Confirm `expires_at` is in the future
- Check `getActiveChallenges()` filters: `gte('expiresAt', now)`
- Verify seed data was inserted correctly

### Reward Claiming Fails
- Ensure challenge `is_completed = true` before claiming
- Check reward values exist in challenge record

## Support

For issues or questions:
- Check [SUPABASE_AUTH_MIGRATION.md](./SUPABASE_AUTH_MIGRATION.md) for auth setup
- Review [src/services/challengeService.ts](./src/services/challengeService.ts) implementation
- Inspect database tables in Supabase Dashboard
