# Quick Start Checklist - Vault Economy

**Use this checklist to get the vault economy running**

---

## ☑️ Development (COMPLETE)

- [x] Create database schema migrations
- [x] Create vault transaction repository
- [x] Migrate vaultService.ts to Supabase
- [x] Implement stock decrement function
- [x] Implement booster activation
- [x] Create migration guide
- [x] Create combined migration script

---

## ☐ Database Setup (TODO - 5 minutes)

- [ ] **Open Supabase Dashboard**
  - Go to https://app.supabase.com
  - Select your project

- [ ] **Run Migration**
  - Click "SQL Editor" → "New query"
  - Open `supabase/RUN_ALL_MIGRATIONS.sql`
  - Copy ALL contents and paste
  - Click "Run" (Cmd/Ctrl + Enter)
  - Wait for "Migration Complete!" message

- [ ] **Verify Tables**
  - Click "Table Editor"
  - Should see 8 new tables:
    - users_profiles
    - user_lesson_progress
    - user_module_progress
    - user_quiz_attempts
    - user_vault_profiles
    - vault_transactions
    - xp_transactions
    - vault_carts

- [ ] **Check Functions**
  - Go to "Database" → "Functions"
  - Should see:
    - decrement_vault_item_stock
    - activate_user_booster
    - check_booster_expiry
    - decrement_booster_uses

---

## ☐ Testing (TODO - 15 minutes)

### Test 1: User Signup
- [ ] Sign up a new test user in the app
- [ ] Check `users_profiles` table → user should appear
- [ ] Check `user_vault_profiles` table → vault profile should appear
- [ ] Verify default values: xp_balance: 0, keys_balance: 0

### Test 2: XP Awarding
- [ ] Complete a lesson or trigger XP award
- [ ] Check `user_vault_profiles` → xp_balance should increase
- [ ] Check `xp_transactions` → transaction should be logged
- [ ] Verify transaction has correct source (e.g., "lesson_complete")

### Test 3: Data Queries
Run these queries in SQL Editor:

```sql
-- Check your user profile
SELECT * FROM users_profiles WHERE email = 'your-email@example.com';

-- Check your vault profile
SELECT * FROM user_vault_profiles WHERE user_id = '<your-user-id>';

-- Check your XP transactions
SELECT * FROM xp_transactions WHERE user_id = '<your-user-id>' ORDER BY created_at DESC;
```

### Test 4: Booster (Optional)
```sql
-- Manually activate a 1.5x XP booster for 24 hours
SELECT activate_user_booster(
  '<your-user-id>'::uuid,
  'xp_multiplier',
  1.5,
  24,
  NULL
);

-- Award some XP and verify it's multiplied
-- Then check xp_transactions for multiplier in metadata
```

---

## ☐ Monitoring (Ongoing)

- [ ] **Check Logs Regularly**
  - Supabase Dashboard → "Logs" → "Postgres Logs"
  - Look for errors or warnings
  - Check "API" logs for client-side errors

- [ ] **Monitor Performance**
  - Dashboard → "Database" → "Usage"
  - Check query performance
  - Watch for slow queries

- [ ] **Review Transactions**
  - Periodically check `vault_transactions` table
  - Verify all transactions have correct data
  - Check for any anomalies

---

## 🐛 Troubleshooting

### Issue: Tables not created
**Check**: Did you run the complete migration script?
**Fix**: Run `RUN_ALL_MIGRATIONS.sql` again

### Issue: User profile not auto-created
**Check**: Is trigger `on_auth_user_created` active?
**Fix**: Check "Database" → "Triggers", re-run migration if missing

### Issue: RLS blocks queries
**Check**: Are you authenticated when querying?
**Fix**: Ensure `auth.uid()` matches the user_id being queried

### Issue: RPC function not found
**Check**: Did you run migration 007?
**Fix**: Run `supabase/migrations/007_vault_rpc_functions.sql`

### Issue: XP not updating
**Check**: Console logs for errors
**Fix**: Verify `vaultTransactionRepo.awardXP()` is being called

---

## 📞 Need Help?

1. **Check Documentation**
   - [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Detailed migration steps
   - [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) - Technical overview
   - [PHASE2_VAULT_MIGRATION_SUMMARY.md](PHASE2_VAULT_MIGRATION_SUMMARY.md) - Migration summary

2. **Check Logs**
   - App console (Chrome DevTools / React Native Debugger)
   - Supabase Logs (Dashboard → Logs)
   - Network tab for API errors

3. **Verify Files**
   - `src/repos/supabase/vaultRepo.ts` - Read operations
   - `src/repos/supabase/vaultTransactionRepo.ts` - Write operations
   - `src/services/vaultService.ts` - Business logic

---

## ✅ Success Criteria

You'll know it's working when:
- ✅ New users get profiles automatically
- ✅ XP awards show up in balances
- ✅ Transactions are logged correctly
- ✅ No Firebase errors in console
- ✅ Supabase logs show successful queries

---

## 🎯 Next Steps After Success

Once everything is tested and working:

1. **Deploy to Production**
   - Run migrations on production Supabase
   - Test with production environment variables
   - Monitor for any issues

2. **Implement Remaining Features**
   - Vault items table and data
   - Monetization items table
   - Stripe real payment integration
   - Admin dashboard

3. **Add Polish**
   - Loading states for vault operations
   - Error messages for users
   - Success animations
   - Analytics tracking

---

**Last Updated**: December 27, 2024
**Status**: Ready for database migration ✅
