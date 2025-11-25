#!/bin/bash

# Script to optimize game images for mobile app
# Target: 360x540 pixels (2x retina for 180px height display)
# Output: Optimized PNGs with reduced file size

GAMES_DIR="../assets/images/games"
BACKUP_DIR="../assets/images/games_backup"

echo "🎮 Game Image Optimization Script"
echo "=================================="

# Create backup directory
if [ ! -d "$BACKUP_DIR" ]; then
  echo "📦 Creating backup directory..."
  mkdir -p "$BACKUP_DIR"
fi

# Backup original images (only if not already backed up)
if [ -z "$(ls -A $BACKUP_DIR)" ]; then
  echo "💾 Backing up original images..."
  cp "$GAMES_DIR"/*.png "$BACKUP_DIR/"
  echo "✅ Backup complete!"
else
  echo "ℹ️  Backup already exists, skipping..."
fi

echo ""
echo "🔧 Optimizing images..."
echo ""

# Counter
count=0
total=$(ls "$GAMES_DIR"/*.png 2>/dev/null | wc -l)

# Process each PNG file
for img in "$GAMES_DIR"/*.png; do
  if [ -f "$img" ]; then
    count=$((count + 1))
    filename=$(basename "$img")

    # Get original size
    original_size=$(ls -lh "$img" | awk '{print $5}')

    echo "[$count/$total] Processing: $filename"
    echo "  Original size: $original_size"

    # Resize to 360x540 (maintaining aspect ratio, portrait orientation)
    sips -Z 540 "$img" --out "$img" > /dev/null 2>&1

    # Get new size
    new_size=$(ls -lh "$img" | awk '{print $5}')
    echo "  New size: $new_size"
    echo "  ✅ Optimized!"
    echo ""
  fi
done

echo "=================================="
echo "🎉 Optimization Complete!"
echo ""
echo "📊 Summary:"
echo "  • Processed: $count images"
echo "  • Target dimensions: 360x540 pixels"
echo "  • Backup location: $BACKUP_DIR"
echo ""
echo "💡 Next steps:"
echo "  1. Test the app to ensure images look good"
echo "  2. If satisfied, you can delete the backup"
echo "  3. Clear Metro cache: npm run start -- --reset-cache"
