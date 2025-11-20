# Image Update Guide

## Always Follow This Process

### Step 1: Add New Images to Folder
Place new PNG files in `assets/images/cocktails/`

### Step 2: Run Verification Script
**BEFORE** updating cocktails.ts, run:
```bash
npm run images:verify
```

This will show you:
- Which files exist on disk
- Which files are already mapped
- Which files are missing mappings

### Step 3: Update cocktails.ts Mappings
Add new require() statements for unmapped images:

```typescript
'recipe-id': require('./cocktails/Filename.png'),
```

**Important Notes:**
- Use **single quotes** for standard filenames: `require('./cocktails/File.png')`
- Use **double quotes** for filenames with apostrophes: `require("./cocktails/File's Name.png")`
- Match filename EXACTLY including spaces, dashes, and special characters
- Check for trailing spaces in filenames (common issue)

### Step 4: Verify Again
Run verification again to ensure no missing files:
```bash
npm run images:verify
```

You should see:
```
✅ SUCCESS: All mapped files exist!
Safe to commit and deploy.
```

### Step 5: Clear Metro Cache
**ALWAYS** clear Metro cache after updating images:

```bash
# Kill all Metro processes
pkill -f "expo start"

# Clear caches
rm -rf node_modules/.cache .expo

# Start fresh
npx expo start --clear
```

### Step 6: Test in App
1. Reload app (iOS: Cmd+R, Android: R R)
2. Search for recipes with new images
3. Verify no red error screens
4. Check Metro logs for "Unable to resolve module" errors

---

## Common Issues & Solutions

### Issue 1: "Unable to resolve module" Error

**Cause:** Filename in mapping doesn't match actual file

**Solution:**
1. Run `npm run images:verify` to find the mismatch
2. Check exact filename (case-sensitive, spaces, apostrophes)
3. Update mapping to match exact filename
4. Clear Metro cache and restart

### Issue 2: Metro Showing Old Errors

**Cause:** Metro bundler cache not cleared

**Solution:**
```bash
# Nuclear option - kills everything
pkill -f "expo start"
pkill -f "metro"
rm -rf node_modules/.cache .expo /tmp/metro-* /tmp/haste-map-*
watchman watch-del-all
npx expo start --clear
```

### Issue 3: Files with Apostrophes Not Loading

**Cause:** Single quotes in require() conflict with apostrophe in filename

**Solution:** Use double quotes
```typescript
// ❌ WRONG
'horses-neck': require('./cocktails/Horse's Neck.png'),

// ✅ CORRECT
'horses-neck': require("./cocktails/Horse's Neck.png"),
```

### Issue 4: Unicode Apostrophes

**Cause:** Some files have Unicode apostrophe (U+2019 ') instead of ASCII (')

**Examples:**
- Tommy's Margarita.png ← Unicode apostrophe
- Horse's Neck.png ← ASCII apostrophe

**Solution:** Copy exact filename from terminal:
```bash
ls assets/images/cocktails/ | grep "Tommy"
# Output: Tommy's Margarita.png
# Copy-paste this exact string into require()
```

### Issue 5: Trailing Spaces in Filenames

**Cause:** File exported with space before .png extension

**Example:** `Naked and Famous .png` (note space before .png)

**Solution:** Match the exact filename including the space:
```typescript
'naked-and-famous': require('./cocktails/Naked and Famous .png'),
```

---

## File Naming Best Practices

### For Future Images:

1. **No apostrophes** - Use hyphens instead
   - ✅ `Planter-Punch.png`
   - ❌ `Planter's Punch.png`

2. **No trailing spaces**
   - ✅ `Naked-and-Famous.png`
   - ❌ `Naked and Famous .png`

3. **Consistent casing**
   - Use Title Case: `Old Fashioned.png`
   - Not: `old-fashioned.png` or `OLD FASHIONED.png`

4. **No special characters** except:
   - Spaces (acceptable)
   - Hyphens (acceptable)
   - Numbers (acceptable): `Corpse Reviver #2.png`
   - Ampersands (acceptable): `Gin & Tonic.png`

5. **Variation naming:**
   - Only add "Variation" if you have BOTH base and variation images
   - If only one image exists, don't use "Variation" suffix

---

## Quick Reference Commands

```bash
# Verify all mappings are correct
npm run images:verify

# Clear Metro cache and restart
rm -rf node_modules/.cache .expo && npx expo start --clear

# Kill all Metro processes
pkill -f "expo start"; pkill -f "metro"

# Find files with special characters
ls assets/images/cocktails/ | grep "'"

# Check exact filename bytes (for debugging)
ls assets/images/cocktails/*.png | xargs -I {} basename {}
```

---

## Verification Script Details

The `verify-image-mappings.ts` script:
- ✅ Checks all require() statements in cocktails.ts
- ✅ Verifies each mapped file exists on disk
- ✅ Reports missing files (mapped but not on disk)
- ✅ Reports unmapped files (on disk but not mapped)
- ✅ Exits with error code if missing files found

**Always run this before:**
- Committing changes to cocktails.ts
- Deploying to production
- Adding new recipe images

---

## Current Status

**Total images:** 148 PNG files
**Total mapped:** 144 recipe IDs
**Missing files:** 0 ✅
**Unmapped files:** 4 (intentional duplicates)

All critical images correctly mapped and verified!

---

## Troubleshooting Checklist

If you see image errors in the app:

- [ ] Run `npm run images:verify`
- [ ] Check for missing files in verification output
- [ ] Fix any mismatched filenames in cocktails.ts
- [ ] Clear Metro cache: `rm -rf node_modules/.cache .expo`
- [ ] Kill Metro: `pkill -f "expo start"`
- [ ] Restart: `npx expo start --clear`
- [ ] Reload app: iOS (Cmd+R) / Android (R R)
- [ ] Check Metro logs for "Unable to resolve" errors

If errors persist:
- Nuclear option: Delete and reinstall node_modules
- Check file permissions on image files
- Verify image files aren't corrupted

---

**Last updated:** November 19, 2025
**Maintained by:** Development Team
