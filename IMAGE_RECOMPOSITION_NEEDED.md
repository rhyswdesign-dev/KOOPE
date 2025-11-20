# Image Recomposition Needed

## Images to Update

### 1. Simple Syrup.png
**Current:** 352 x 470 pixels
**Issue:** Composition may be too zoomed in (verify if full bottle is visible)
**Required:** Match Rosemary Syrup composition

### 2. Mai Tai.png
**Current:** 352 x 352 pixels (square)
**Issue:** Wrong aspect ratio - needs to be portrait format
**Required:** Re-export as 352 x 470 pixels portrait

---

## Reference Image: Rosemary Syrup.png ✅

**Dimensions:** 352 x 470 pixels (0.75:1 portrait)

**Composition Guidelines:**
```
┌─────────────────────────┐
│    [margin: ~35px]      │  ← Top breathing room (10%)
│                         │
│   [garnish/ingredient]  │  ← Foreground element
│                         │
│  ┌─────────────────┐   │
│  │  ROSEMARY SYRUP │   │  ← Bottle label
│  │                 │   │
│  │   [full bottle] │   │  ← Main subject (280px)
│  │                 │   │     ENTIRE bottle visible
│  │                 │   │     from base to cap
│  └─────────────────┘   │
│                         │
│  [rosemary sprigs]      │  ← Background element
│                         │
│    [margin: ~35px]      │  ← Bottom breathing room (10%)
└─────────────────────────┘
     352 x 470 pixels
```

---

## Simple Syrup - Recomposition Checklist

- [ ] Canvas: 352 x 470 pixels
- [ ] Full bottle visible (base to cap)
- [ ] 10-15% margin on all sides
- [ ] Show sugar crystals or ingredients
- [ ] Clear, clean composition
- [ ] Bottle occupies ~60% of height
- [ ] Label clearly readable

**Composition:**
- Top: Sugar crystals or simple syrup in glass
- Center: Full syrup bottle with label
- Bottom: Raw sugar or ingredients
- Background: Clean, neutral

---

## Mai Tai - Recomposition Checklist

- [ ] **NEW aspect ratio:** 352 x 470 pixels (portrait)
- [ ] Full cocktail glass visible
- [ ] Garnishes (mint, pineapple, cherry) in frame
- [ ] 10-15% margin on all sides
- [ ] Glass occupies ~60% of height
- [ ] Show full drink presentation

**Composition:**
```
┌─────────────────────────┐
│       [margin]          │
│                         │
│    [mint garnish]       │  ← Top garnish visible
│  ┌─────────────────┐   │
│  │   [pineapple]   │   │  ← Garnishes
│  │   [mai tai]     │   │  ← Full drink
│  │   [in glass]    │   │  ← Glass visible
│  │   [with ice]    │   │  ← Ice/liquid
│  └─────────────────┘   │  ← Base of glass
│                         │
│   [ingredients nearby]  │  ← Optional: lime, rum bottle
│       [margin]          │
└─────────────────────────┘
```

---

## Export Settings

### For Both Images:

**Format:** PNG
- Color mode: RGBA
- Bit depth: 8-bit per channel
- Compression: PNG-24
- Target file size: < 500KB

**Dimensions:** 352 x 470 pixels
- Width: 352px
- Height: 470px
- Aspect ratio: 0.75:1 (portrait)
- DPI: 72 (web standard)

**Photography/Design:**
- Lighting: Even, professional
- Background: Clean, neutral, or complementary
- Focus: Sharp on main subject
- Framing: Rule of thirds or centered

---

## Verification After Export

### Check Image:
```bash
# Check dimensions
sips -g pixelWidth -g pixelHeight "Simple Syrup.png"
# Should show: pixelWidth: 352, pixelHeight: 470

sips -g pixelWidth -g pixelHeight "Mai Tai.png"
# Should show: pixelWidth: 352, pixelHeight: 470
```

### Visual Check:
- [ ] Full bottle/glass visible (no cropping at top or bottom)
- [ ] 10-15% margin visible on all edges
- [ ] Label/garnishes clearly readable
- [ ] Composition matches Rosemary Syrup style
- [ ] File size < 500KB

---

## Where to Place Updated Files

1. **Location:** `assets/images/cocktails/`
2. **Filenames:**
   - `Simple Syrup.png` (replace existing)
   - `Mai Tai.png` (replace existing)

3. **After updating:**
```bash
# Run auto-fix (should find no issues)
npm run images:fix

# Verify mappings (should pass)
npm run images:verify

# Clear cache and restart
rm -rf node_modules/.cache .expo
npx expo start --clear
```

---

## Current vs. Ideal Comparison

### Simple Syrup:
```
Current (may be too close):    Ideal (zoomed out):
┌─────────────┐               ┌─────────────────┐
│             │               │                 │
│  ┌───────┐  │               │  [sugar]        │
│  │ LABEL │  │               │  ┌───────────┐  │
│  │ only  │  │      →        │  │  BOTTLE   │  │
│  │       │  │               │  │  + LABEL  │  │
│  └───────┘  │               │  └───────────┘  │
│             │               │  [ingredients]  │
└─────────────┘               └─────────────────┘
```

### Mai Tai:
```
Current (square crop):         Ideal (portrait):
┌─────────────┐               ┌─────────────────┐
│             │               │                 │
│   [drink]   │               │  [garnishes]    │
│   [glass]   │      →        │  ┌───────────┐  │
│             │               │  │   drink   │  │
│             │               │  │   glass   │  │
└─────────────┘               │  └───────────┘  │
 352x352 (1:1)                │                 │
                               └─────────────────┘
                                352x470 (0.75:1)
```

---

## Priority

**High Priority:**
1. **Mai Tai** - Wrong aspect ratio, must be re-exported
2. **Simple Syrup** - Verify composition, may need re-export

---

**Reference standard:** Rosemary Syrup.png (352 x 470 pixels)
**Date needed:** As soon as possible
**Impact:** Better visual consistency across all recipe cards
