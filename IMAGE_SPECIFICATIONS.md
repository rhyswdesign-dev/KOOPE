# Recipe Card Image Specifications

## ✅ Task 1 Complete: Grenadine Mapping Updated
Changed from `Homemade Grenadine.png` → `Grenadine.png` in [cocktails.ts:129](assets/images/cocktails.ts#L129)

---

## Current Image Analysis

### Existing Dimensions:
- **Syrups (new):** 352 x 470 pixels (portrait, aspect ratio 0.75:1)
- **Cocktails (square):** 346 x 346 pixels (square, aspect ratio 1:1)
- **Cocktails (portrait):** 352 x 532-574 pixels (portrait, aspect ratio 0.66:1)

### How Images Are Displayed:

#### 1. RecipeCard Thumbnail
**File:** [src/components/RecipeCard.tsx:163-168](src/components/RecipeCard.tsx#L163)
```typescript
cocktailImage: {
  width: '100%',        // Full card width
  height: 180,          // Fixed height in pixels
  resizeMode: 'cover',  // Crops to fill space
  backgroundColor: colors.card,
}
```

**Card Width Calculation:**
- Screen width minus padding: `(screenWidth - 32px - 12px) / 2`
- iPhone 15 Pro (393px): ~170px width
- iPhone 15 Pro Max (430px): ~189px width
- Typical card: **~170-190px wide × 180px tall**

#### 2. Featured Card (Cocktail of the Week)
**File:** [src/components/CocktailOfTheMonthCard.tsx:112](src/components/CocktailOfTheMonthCard.tsx#L112)
```typescript
card: {
  width: CARD_WIDTH,    // Screen width - 32px
  height: 320,          // Fixed height
  resizeMode: 'cover',
}
```

#### 3. Detail Screen Hero Image
**Typical height:** 300px
**Width:** Full screen width
**Resize mode:** cover

---

## Recommended Image Dimensions

### Option 1: Portrait Format (RECOMMENDED)
**Dimensions:** **700 x 940 pixels** (0.75:1 aspect ratio)

**Why this works:**
- ✅ Matches your current syrup images (352x470 scaled 2x)
- ✅ Portrait orientation shows full bottles + ingredients
- ✅ Works perfectly with `resizeMode: 'cover'`
- ✅ High enough resolution for retina displays (2x-3x scale)
- ✅ Allows proper framing with breathing room

**Display results:**
- Thumbnail (180px tall): Shows centered portion, bottles visible
- Featured card (320px tall): Shows most of image, excellent composition
- Detail screen: Full image visible with proper aspect ratio

### Option 2: Wider Portrait (Alternative)
**Dimensions:** **800 x 1000 pixels** (0.8:1 aspect ratio)

**Why this works:**
- ✅ Slightly wider for more horizontal composition
- ✅ Still portrait to show full bottles
- ✅ Better for side-by-side ingredient shots

---

## Composition Guidelines

### For Syrup Bottles:
1. **Main Subject:** Syrup bottle centered or slightly offset
2. **Supporting Elements:**
   - Raw ingredients (ginger root, cinnamon sticks, etc.)
   - Small pour shot or glass showing color
   - Complementary garnishes
3. **Framing:**
   - Leave 10-15% margin on all sides
   - Bottle should occupy 50-60% of height
   - Ingredients in foreground/background for depth
4. **Zoom Level:**
   - Full bottle visible from base to top
   - Ingredients clearly identifiable
   - Label readable at thumbnail size

### Example Composition (700x940px):
```
┌─────────────────────────┐
│    [margin: 70px]       │  ← Top breathing room
│                         │
│   [ingredient: ginger]  │  ← Foreground element
│                         │
│  ┌─────────────────┐   │
│  │   GINGER SYRUP  │   │  ← Bottle label
│  │                 │   │
│  │   [bottle]      │   │  ← Main subject (560px)
│  │                 │   │
│  └─────────────────┘   │
│                         │
│  [cinnamon sticks]      │  ← Background element
│                         │
│    [margin: 70px]       │  ← Bottom breathing room
└─────────────────────────┘
```

---

## File Naming Convention

**Format:** `[Name] Syrup.png`

**Examples:**
- ✅ `Ginger Syrup.png`
- ✅ `Cinnamon Syrup.png`
- ✅ `Simple Syrup.png`
- ❌ `ginger-syrup.png` (use proper case)
- ❌ `Ginger_Syrup.png` (use space, not underscore)

---

## Technical Specifications

### File Format: PNG
- **Color Mode:** RGBA (with transparency support)
- **Bit Depth:** 8-bit per channel
- **Compression:** PNG-8 or PNG-24
- **Max File Size:** ~500KB per image (aim for 200-300KB)

### Resolution:
- **Minimum:** 700 x 940 pixels (1x)
- **Recommended:** 1400 x 1880 pixels (2x for retina)
- **Maximum:** 2100 x 2820 pixels (3x, may be overkill)

### For Current 352x470 Images:
- **Action needed:** Zoom out composition to show more context
- **Scale up:** 2x to 704x940 or keep at 352x470 if composition is correct
- **Re-crop:** Ensure full bottles + ingredients are visible

---

## Images to Create/Update

### 12 Syrup Images Needed:

1. **Ginger Syrup** - Already exists (352x470) → Verify composition
2. **Cinnamon Syrup** - Already exists (352x470) → Verify composition
3. **Cardamom Syrup** - Already exists (352x470) → Verify composition
4. **Vanilla Syrup** - Already exists (352x470) → Verify composition
5. **Orgeat** - Already exists (352x470) → Verify composition
6. **Passionfruit Syrup** - Already exists (352x470) → Verify composition
7. **Strawberry Syrup** - Already exists (352x470) → Verify composition
8. **Blackberry Syrup** - Already exists (352x470) → Verify composition
9. **Pineapple Syrup** - Already exists (352x470) → Verify composition
10. **Chili Syrup** - Already exists (352x470) → Verify composition
11. **Mint Syrup** - Already exists (352x470) → Verify composition
12. **Lavender Syrup** - Already exists (352x470) → Verify composition

**Status:** All images exist, may need re-composition if zoomed too close

---

## Checklist for Image Creation

### Before Creating Images:
- [ ] Set canvas to 700x940px (or 1400x1880px for 2x)
- [ ] Plan composition with bottle + 2-3 ingredients
- [ ] Check lighting is even and professional
- [ ] Ensure background is clean/neutral

### During Photography/Design:
- [ ] Center bottle or use rule of thirds
- [ ] Include characteristic ingredients (visible and identifiable)
- [ ] Leave 10-15% margin on all edges
- [ ] Ensure label is readable
- [ ] Add depth with foreground/background elements

### After Creation:
- [ ] Export as PNG, RGBA, 8-bit
- [ ] Verify file size < 500KB
- [ ] Check image at 180px height (thumbnail preview)
- [ ] Test in app at multiple screen sizes
- [ ] Ensure no important elements are cropped

---

## Current vs Ideal

### Current Syrup Images:
- **Dimensions:** 352 x 470 pixels ✅ (good aspect ratio)
- **Composition:** May be zoomed too close ⚠️
- **Action:** Check if full bottles + ingredients are visible
  - If cropped too tight → Re-export with wider frame
  - If composition good → Keep as is

### Ideal Composition:
```
Current (too close):        Ideal (zoomed out):
┌─────────────┐            ┌─────────────────┐
│             │            │                 │
│  ┌───────┐  │            │  [ingredient]   │
│  │BOTTLE │  │            │  ┌───────────┐  │
│  │       │  │     →      │  │  BOTTLE   │  │
│  │       │  │            │  │           │  │
│  └───────┘  │            │  └───────────┘  │
│             │            │  [ingredient]   │
└─────────────┘            └─────────────────┘
  (cropped)                  (full context)
```

---

## Next Steps

1. ✅ **Grenadine mapping updated** to use `Grenadine.png`
2. 📸 **Create/update images** at 700x940px with zoomed-out composition
3. 💾 **Replace files** in `assets/images/cocktails/` folder
4. 🔄 **Reload app** to see changes (Metro auto-rebuilds)
5. ✅ **Verify** thumbnails show full bottles + ingredients

---

## Summary

**Recommended Dimensions:** **700 x 940 pixels** (0.75:1 portrait)

**Key Points:**
- Portrait orientation to show full bottles
- 10-15% margin on all sides
- Include bottle + 2-3 characteristic ingredients
- Ensure composition works at 180px thumbnail height
- Current 352x470 images have correct aspect, may just need re-cropping

**Result:** Professional syrup images that look great at all sizes, from 180px thumbnails to full-screen detail views.
