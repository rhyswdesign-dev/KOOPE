# 🚀 Image Mapping Quick Fix

## When You See Image Errors

Run these 3 commands in order:

### 1. Auto-Fix Issues
```bash
npm run images:fix
```
Automatically fixes:
- Unicode apostrophes causing syntax errors
- Filename mismatches
- Missing mappings

### 2. Verify All Fixed
```bash
npm run images:verify
```
Should show: `✅ SUCCESS: All mapped files exist!`

### 3. Clean Restart
```bash
pkill -f "expo start" && rm -rf node_modules/.cache .expo && npx expo start --clear
```

### 4. Reload App
- iOS: `Cmd + R`
- Android: Press `R` twice

---

## ⚠️ Common Errors & Fixes

### Error: "Unexpected token, expected `,`"
**Cause:** Unicode apostrophe (') in single-quoted string

**Auto-Fix:**
```bash
npm run images:fix
```

**Manual Fix:**
Change single quotes to double quotes:
```typescript
// ❌ WRONG - Syntax Error
'tommy-margarita': require('./cocktails/Tommy's Margarita.png'),

// ✅ CORRECT
'tommy-margarita': require("./cocktails/Tommy's Margarita.png"),
```

### Error: "Unable to resolve module ./cocktails/..."
**Cause:** Filename in mapping doesn't match actual file

**Auto-Fix:**
```bash
npm run images:fix
npm run images:verify
```

**Manual Fix:**
1. Check exact filename: `ls assets/images/cocktails/ | grep "filename"`
2. Copy exact filename (including spaces, apostrophes)
3. Update mapping to match exactly

---

## 📋 Prevention Checklist

Before committing image changes:

- [ ] Run `npm run images:fix`
- [ ] Run `npm run images:verify` (must pass)
- [ ] Clear cache and restart Metro
- [ ] Test app reload without errors
- [ ] Check Metro logs for "Unable to resolve" errors

---

## 🆘 Nuclear Option

If errors persist after auto-fix:

```bash
# Kill everything
pkill -9 -f "expo"
pkill -9 -f "metro"

# Delete all caches
rm -rf node_modules/.cache
rm -rf .expo
rm -rf /tmp/metro-*
rm -rf /tmp/haste-map-*

# Clear watchman
watchman watch-del-all

# Restart fresh
npx expo start --clear
```

---

## 📖 Full Documentation

See [IMAGE_UPDATE_GUIDE.md](IMAGE_UPDATE_GUIDE.md) for complete details.

---

**Key Point:** ALWAYS run `npm run images:fix` and `npm run images:verify` before committing image changes!
