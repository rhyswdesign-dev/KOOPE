# Expo Troubleshooting Guide

## The "Loading Forever" Problem

When Expo gets stuck on "Loading" or "Starting project", it's usually caused by:
1. **Stale Metro bundler cache**
2. **Port 8081 already in use**
3. **Corrupted Watchman cache**
4. **Orphaned Node processes**
5. **Xcode/iOS build cache issues**

---

## Quick Fix (Use This First)

### Option 1: One-Command Fix
```bash
chmod +x fix-expo.sh && ./fix-expo.sh
```

This script automatically:
- Kills all Metro/Node processes
- Clears all caches
- Frees up port 8081
- Optionally reinstalls dependencies

---

## Manual Fix Steps (If Script Doesn't Work)

### Step 1: Kill All Processes
```bash
# Kill Metro bundler
pkill -f "expo start"
pkill -f "react-native"
pkill -f "metro"

# Kill all Node processes
killall node

# Kill Watchman
pkill -f watchman
```

### Step 2: Clear Metro Cache
```bash
# Clear Metro bundler cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
rm -rf $TMPDIR/react-*
```

### Step 3: Clear Expo Cache
```bash
# Clear Expo cache
rm -rf ~/.expo/cache
rm -rf .expo
```

### Step 4: Clear Watchman (if installed)
```bash
watchman watch-del-all
```

### Step 5: Free Port 8081
```bash
# Check what's using port 8081
lsof -i :8081

# Kill the process
lsof -ti:8081 | xargs kill -9
```

### Step 6: Start Fresh
```bash
# Start Expo with cache cleared
npm start -- --clear

# Or use Expo CLI directly
npx expo start -c
```

---

## Deep Clean (Nuclear Option)

If the above doesn't work, do a complete reset:

```bash
# 1. Kill everything
killall node
pkill -f expo
pkill -f metro

# 2. Clear ALL caches
rm -rf node_modules
rm -rf ~/.expo
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
rm -rf $TMPDIR/react-*

# 3. Clear iOS build cache (macOS only)
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ios/build
rm -rf ios/Pods

# 4. Reinstall everything
npm install

# 5. Reinstall iOS pods (macOS only)
cd ios && pod install && cd ..

# 6. Start fresh
npm start -- --clear
```

---

## Prevention Tips

### 1. Always Exit Properly
**DON'T**: Just close the terminal
**DO**: Press `Ctrl+C` to stop Expo before closing

### 2. Use the Fix Script Regularly
Run `./fix-expo.sh` whenever you:
- Haven't used the app in a few days
- Updated dependencies
- Switched git branches
- Get weird errors

### 3. Restart Regularly
**Before each work session**:
```bash
./fix-expo.sh
npm start
```

### 4. Keep Dependencies Updated
```bash
# Update Expo CLI
npm install -g expo-cli@latest

# Update project dependencies
npm update
```

### 5. Monitor Your Processes
```bash
# Check what's running
ps aux | grep node
ps aux | grep metro
ps aux | grep watchman

# Check port usage
lsof -i :8081
```

---

## Common Error Messages

### "Something is already running on port 8081"
**Fix**:
```bash
lsof -ti:8081 | xargs kill -9
npm start
```

### "Metro bundler has encountered an error"
**Fix**:
```bash
rm -rf $TMPDIR/metro-*
npm start -- --clear
```

### "Unable to resolve module"
**Fix**:
```bash
rm -rf node_modules
npm install
npm start -- --clear
```

### "Watchman crawl failed"
**Fix**:
```bash
watchman watch-del-all
npm start
```

### "Expo manifest is not available"
**Fix**:
```bash
rm -rf ~/.expo/cache
rm -rf .expo
npm start
```

---

## When to Use Each Fix

### Quick Issues (30 seconds)
```bash
pkill -f metro && npm start -- --clear
```
Use when: Expo just froze or you closed terminal improperly

### Medium Issues (1-2 minutes)
```bash
./fix-expo.sh
```
Use when: Quick fix doesn't work, or starting new work session

### Deep Issues (5-10 minutes)
```bash
# Full reset
rm -rf node_modules
npm install
./fix-expo.sh
npm start
```
Use when: Updated dependencies, switched branches, or persistent issues

---

## Debugging Checklist

When Expo won't start, check these in order:

- [ ] Is another Metro bundler running? (`ps aux | grep metro`)
- [ ] Is port 8081 free? (`lsof -i :8081`)
- [ ] Is Watchman running properly? (`watchman version`)
- [ ] Are there orphaned Node processes? (`ps aux | grep node`)
- [ ] Is the cache corrupted? (Run `./fix-expo.sh`)
- [ ] Did you update dependencies? (Reinstall `node_modules`)
- [ ] Is Xcode cache stale? (Clear DerivedData on macOS)

---

## Advanced: Create Alias for Quick Fix

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Quick Expo fix
alias expo-fix='cd ~/Documents/test-project/HomeGameAdvantage && ./fix-expo.sh'

# Quick Expo start with cache clear
alias expo-start='npm start -- --clear'

# Quick Expo reset (nuclear)
alias expo-reset='killall node; rm -rf node_modules; npm install; npm start -- --clear'
```

Then reload:
```bash
source ~/.zshrc
```

Now you can run:
```bash
expo-fix      # Run fix script
expo-start    # Start with cache clear
expo-reset    # Nuclear option
```

---

## Still Not Working?

### Last Resort Fixes

1. **Restart your computer**
   - Sometimes macOS has stale processes

2. **Update macOS**
   ```bash
   # Check for updates
   softwareupdate --list
   ```

3. **Update Node.js**
   ```bash
   # Check Node version (should be 18.x or 20.x)
   node --version

   # Update via nvm
   nvm install 20
   nvm use 20
   ```

4. **Reinstall Expo CLI**
   ```bash
   npm uninstall -g expo-cli
   npm install -g expo-cli@latest
   ```

5. **Check for conflicting software**
   - VPNs
   - Proxies
   - Antivirus
   - Docker (can occupy ports)

---

## Performance Tips

### Speed Up Metro Bundler

1. **Enable Metro caching** (add to `metro.config.js`):
```javascript
module.exports = {
  resetCache: false,
  // ... other config
};
```

2. **Exclude unnecessary files**:
```javascript
// metro.config.js
module.exports = {
  resolver: {
    blockList: [
      /node_modules\/.*\/node_modules\/.*/,
    ],
  },
};
```

3. **Use Watchman** (install if not already):
```bash
brew install watchman
```

---

## When to Ask for Help

If you've tried everything above and still stuck:

1. **Capture the error**:
   ```bash
   npm start 2>&1 | tee expo-error.log
   ```

2. **Check system info**:
   ```bash
   node --version
   npm --version
   expo --version
   watchman version
   ```

3. **Share**:
   - The error log
   - Your system info
   - What you've already tried

---

**Quick Reference Card**

```bash
# Daily use
./fix-expo.sh && npm start

# Quick restart
pkill -f metro && npm start -- --clear

# Nuclear option
rm -rf node_modules && npm install && npm start

# Check what's running
lsof -i :8081
ps aux | grep node
```

---

**Last Updated**: 2026-01-13
**Works With**: Expo SDK 50+, React Native 0.73+
