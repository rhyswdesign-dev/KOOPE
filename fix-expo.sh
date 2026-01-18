#!/bin/bash

# KOOPE Expo Fix Script
# Fixes common Metro bundler and Expo startup issues
# Run this whenever Expo gets stuck on "Loading" or "Starting"

echo "🔧 KOOPE Expo Fix Script"
echo "========================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Kill all Metro/Expo/Node processes
echo "Step 1: Killing existing Metro/Expo/Node processes..."
pkill -f "expo start" 2>/dev/null
pkill -f "react-native" 2>/dev/null
pkill -f "metro" 2>/dev/null
pkill -f "node.*watchman" 2>/dev/null
killall node 2>/dev/null
sleep 2
print_status "Processes killed"
echo ""

# Step 2: Clear Metro bundler cache
echo "Step 2: Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf $TMPDIR/react-* 2>/dev/null
print_status "Metro cache cleared"
echo ""

# Step 3: Clear Expo cache
echo "Step 3: Clearing Expo cache..."
rm -rf ~/.expo/cache 2>/dev/null
rm -rf .expo 2>/dev/null
print_status "Expo cache cleared"
echo ""

# Step 4: Clear Watchman cache (if installed)
echo "Step 4: Clearing Watchman cache..."
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null
    print_status "Watchman cache cleared"
else
    print_warning "Watchman not installed (optional)"
fi
echo ""

# Step 5: Clear node_modules and reinstall
echo "Step 5: Do you want to clear node_modules and reinstall? (y/n)"
echo "   This takes longer but fixes deeper issues."
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "   Removing node_modules..."
    rm -rf node_modules
    print_status "node_modules removed"

    echo "   Reinstalling dependencies (this may take 2-3 minutes)..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies reinstalled"
    else
        print_error "npm install failed - check errors above"
        exit 1
    fi
else
    print_warning "Skipping node_modules reinstall"
fi
echo ""

# Step 6: Clear iOS build cache (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Step 6: Clearing iOS build cache..."
    rm -rf ~/Library/Developer/Xcode/DerivedData 2>/dev/null
    rm -rf ios/build 2>/dev/null
    rm -rf ios/Pods 2>/dev/null
    print_status "iOS cache cleared"
    echo ""
fi

# Step 7: Reset Metro port (in case port 8081 is stuck)
echo "Step 7: Checking if Metro port (8081) is in use..."
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    print_warning "Port 8081 is in use. Killing process..."
    lsof -ti:8081 | xargs kill -9 2>/dev/null
    sleep 1
    print_status "Port 8081 freed"
else
    print_status "Port 8081 is available"
fi
echo ""

# Step 8: Verify project structure
echo "Step 8: Verifying project structure..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found! Are you in the project directory?"
    exit 1
fi

if [ ! -f "app.json" ] && [ ! -f "app.config.js" ]; then
    print_error "No Expo config file found!"
    exit 1
fi

print_status "Project structure looks good"
echo ""

# Final step
echo "✅ Expo fix complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm start"
echo "  2. Press 'i' for iOS simulator"
echo "  3. Press 'a' for Android emulator"
echo ""
echo "If issues persist, try:"
echo "  - Restart your computer"
echo "  - Update Expo: npm install expo@latest"
echo "  - Check for macOS updates"
echo ""
