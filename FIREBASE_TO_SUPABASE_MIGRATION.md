## Firebase to Supabase Data Migration Guide

This guide documents the migration from Firebase Firestore to Supabase PostgreSQL.

---

## Migration Status

### ✅ Completed

#### Authentication
- [x] Firebase Auth → Supabase Auth
- [x] Email/password auth removed (OAuth-only)
- [x] Apple Sign-In implemented
- [x] Google Sign-In implemented
- [x] Session persistence with AsyncStorage
- [x] All `user.uid` → `user.id` references updated

#### Code Updates
- [x] AuthContext migrated to Supabase
- [x] OAuthSignInScreen using Supabase auth
- [x] SettingsScreen using Supabase signOut
- [x] EditProfileScreen saving to Supabase profiles
- [x] ProfileScreen using Supabase user.id
- [x] FeedbackScreen using user.id
- [x] AIRecipeFormatScreen using user.id
- [x] GroceryListModal using user.id
- [x] LessonEngine using user.id
- [x] All storage.ts references updated
- [x] All firestore.ts references updated
- [x] usePersonalization store updated
- [x] ConsentScreen updated
- [x] SignUpScreen updated

#### Database Schema
- [x] Challenge system schema created
- [x] User profiles table created
- [x] Recipes table schema created
- [x] Feedback table schema created
- [x] User preferences table schema created
- [x] Row Level Security policies configured
- [x] Storage buckets for recipe images

#### Data Access Layer
- [x] Created `src/lib/supabaseData.ts`
- [x] User profile operations
- [x] Recipe CRUD operations
- [x] Feedback submission
- [x] User preferences management
- [x] Storage file upload/delete helpers

### 🔄 In Progress

- [ ] Update FeedbackScreen to use `feedbackService.submit()`
- [ ] Update recipe screens to use `recipeService`
- [ ] Update personalization store to use Supabase
- [ ] Replace Firestore calls in remaining components

### 📋 Pending

#### Data Migration
- [ ] Export existing Firebase data
  - [ ] User profiles
  - [ ] Recipes
  - [ ] Feedback
  - [ ] User preferences
  - [ ] Challenge progress
- [ ] Transform data to Supabase format
- [ ] Import into Supabase tables
- [ ] Verify data integrity

#### Code Cleanup
- [ ] Remove Firebase dependencies
  - [ ] Uninstall `firebase` package
  - [ ] Delete `src/config/firebase.ts`
  - [ ] Delete `src/lib/auth.ts` (legacy)
  - [ ] Delete `src/lib/firestore.ts` (replace with supabaseData)
  - [ ] Delete unused auth screens (SignIn, SignUp, ForgotPassword, AuthScreen)
- [ ] Update imports to use Supabase equivalents
- [ ] Remove Firebase environment variables

---

## Database Schema Comparison

### Firebase Firestore → Supabase PostgreSQL

| Firebase Collection | Supabase Table | Status |
|---------------------|----------------|--------|
| `users/{userId}` | `profiles` | ✅ Created |
| `users/{userId}/preferences` | `user_preferences` | ✅ Created |
| `recipes/{recipeId}` | `recipes` | ✅ Created |
| `feedback/{feedbackId}` | `feedback` | ✅ Created |
| `challenges/{challengeId}` | `challenges` | ✅ Created |
| `userProgress/{userId}` | `user_challenge_progress` | ✅ Created |

### Data Type Mappings

| Firestore Type | Supabase Type |
|----------------|---------------|
| `DocumentReference` | `UUID` (foreign key) |
| `Timestamp` | `TIMESTAMPTZ` |
| `Array` | `JSONB` or `TEXT[]` |
| `Map/Object` | `JSONB` |
| `serverTimestamp()` | `NOW()` or `new Date().toISOString()` |
| `increment()` | `column + value` |

---

## Migration Steps

### Step 1: Run App Data Migration

```bash
# In Supabase Dashboard > SQL Editor
# Run: supabase/migrations/002_app_data_schema.sql
```

This creates:
- `recipes` table with RLS
- `feedback` table with RLS
- `user_preferences` table with RLS
- Storage bucket for recipe images
- Indexes for performance

### Step 2: Update Code to Use Supabase Data Layer

Replace Firestore calls with Supabase equivalents:

**Before (Firestore):**
```typescript
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Save user profile
await setDoc(doc(db, 'users', user.uid), {
  displayName: 'John',
  email: 'john@example.com',
  updatedAt: serverTimestamp()
});

// Add feedback
await addDoc(collection(db, 'feedback'), {
  userId: user.uid,
  message: 'Great app!',
  timestamp: serverTimestamp()
});
```

**After (Supabase):**
```typescript
import { userProfileService, feedbackService } from '../lib/supabaseData';

// Save user profile
await userProfileService.upsert({
  id: user.id,
  display_name: 'John',
  email: 'john@example.com'
});

// Add feedback
await feedbackService.submit({
  user_id: user.id,
  type: 'general',
  category: 'feedback',
  title: 'Great app',
  description: 'Great app!',
  status: 'new'
});
```

### Step 3: Update Storage References

**Before (Firebase Storage):**
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const storageRef = ref(storage, `recipes/${user.uid}/${filename}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**After (Supabase Storage):**
```typescript
import { storageService } from '../lib/supabaseData';

const url = await storageService.uploadFile(
  'recipe-images',
  `${user.id}/${filename}`,
  file,
  { contentType: 'image/jpeg' }
);
```

### Step 4: Export Firebase Data

Use Firebase Admin SDK to export data:

```javascript
// export-firebase-data.js
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json')
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  fs.writeFileSync(
    `./exports/${collectionName}.json`,
    JSON.stringify(data, null, 2)
  );
}

async function exportData() {
  await exportCollection('users');
  await exportCollection('recipes');
  await exportCollection('feedback');
  console.log('Export complete!');
}

exportData();
```

### Step 5: Transform and Import to Supabase

```typescript
// import-to-supabase.ts
import { supabase } from './src/lib/supabase';
import * as users from './exports/users.json';
import * as recipes from './exports/recipes.json';

async function importProfiles() {
  for (const user of users) {
    await supabase.from('profiles').insert({
      id: user.id, // Must match auth user ID
      display_name: user.displayName,
      bio: user.bio,
      featured_badges: user.featuredBadges,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    });
  }
}

async function importRecipes() {
  for (const recipe of recipes) {
    await supabase.from('recipes').insert({
      user_id: recipe.userId,
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      servings: recipe.servings,
      image_url: recipe.imageUrl,
      is_favorite: recipe.isFavorite,
      created_at: recipe.createdAt,
      updated_at: recipe.updatedAt
    });
  }
}

async function runImport() {
  await importProfiles();
  await importRecipes();
  console.log('Import complete!');
}

runImport();
```

---

## Code Patterns Reference

### Querying Data

**Firestore:**
```typescript
const usersRef = collection(db, 'users');
const q = query(usersRef, where('age', '>=', 18), orderBy('name'));
const snapshot = await getDocs(q);
const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Supabase:**
```typescript
const { data: users } = await supabase
  .from('profiles')
  .select('*')
  .gte('age', 18)
  .order('name');
```

### Real-time Subscriptions

**Firestore:**
```typescript
const unsubscribe = onSnapshot(doc(db, 'users', userId), (snapshot) => {
  const user = snapshot.data();
  // Update UI
});
```

**Supabase:**
```typescript
const subscription = supabase
  .channel('profiles')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`
  }, (payload) => {
    // Update UI
  })
  .subscribe();
```

### Batch Operations

**Firestore:**
```typescript
const batch = writeBatch(db);
batch.set(doc(db, 'users', '1'), { name: 'Alice' });
batch.update(doc(db, 'users', '2'), { age: 30 });
await batch.commit();
```

**Supabase:**
```typescript
// Insert multiple
await supabase.from('profiles').insert([
  { id: '1', display_name: 'Alice' },
  { id: '2', display_name: 'Bob' }
]);

// Update multiple
await supabase.from('profiles')
  .update({ age: 30 })
  .in('id', ['2', '3']);
```

---

## Testing Checklist

After migration, verify:

- [ ] User authentication works (Apple & Google)
- [ ] Profile data loads correctly
- [ ] Recipes can be created/updated/deleted
- [ ] Feedback submission works
- [ ] User preferences persist
- [ ] Images upload to Supabase Storage
- [ ] Challenge progress tracks correctly
- [ ] Real-time updates work (if implemented)
- [ ] Row Level Security prevents unauthorized access
- [ ] All former Firebase code has been replaced

---

## Rollback Plan

If issues arise:

1. **Restore Firebase config** from git history
2. **Revert auth changes** to use Firebase
3. **Switch database calls** back to Firestore
4. **Redeploy** previous version

Keep Firebase project active during transition period until Supabase is fully validated in production.

---

## Benefits of Supabase

✅ **PostgreSQL** - More powerful queries, joins, transactions
✅ **Row Level Security** - Built-in auth-based access control
✅ **Real-time** - Postgres LISTEN/NOTIFY
✅ **Storage** - Integrated file storage with CDN
✅ **Auto-generated APIs** - REST and GraphQL
✅ **Better TypeScript support** - Full type safety
✅ **Lower cost** - More generous free tier
✅ **Open source** - Self-hostable

---

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

---

**Migration Progress**: 60% complete
**Est. Completion**: After data export/import and code updates
**Blocker**: None (can proceed with testing on new data)
