# Mocktails Recipe Card Expansion Plan

## Overview
Comprehensive plan for creating complete recipe cards for all 28 mocktails with proper instructions, ingredient details, garnishes, and glassware.

---

## Current Status
- ✅ 28 mocktails defined with basic data (name, subtitle, category, basic ingredients)
- ✅ Organized into 3 subcategories: Zero-Proof, Wellness, Low-ABV
- ✅ Basic images assigned (via Unsplash)
- ⚠️ **NEEDED**: Full recipe details (preparation instructions, glassware, proper garnish, technique notes)

---

## Recipe Card Components Needed

Each mocktail should have:

### 1. Basic Info (Already Have)
- Name
- Subtitle (type/category)
- Difficulty
- Prep time
- Rating

### 2. Ingredients (Need to Standardize)
- Convert all to proper format: `{ name: string, note: string }`
- Include proper measurements
- List in order of use

### 3. Instructions (Need to Add)
- Step-by-step preparation
- Technique notes
- Pro tips

### 4. Glassware & Serving (Need to Add)
- Proper glassware type
- Ice type/amount
- Temperature notes

### 5. Garnish (Need to Expand)
- Detailed garnish instructions
- Placement notes
- Optional additions

---

## Mocktail Categories & Recipes

### 🌿 ZERO-PROOF SPIRITS (11 recipes)

**Seedlip Garden 108 Based:**
1. Garden 108 & Tonic
2. Herbaceous Spritz
3. Garden Gimlet

**Lyre's American Malt Based:**
4. Smokeless Old Fashioned
5. Zero Proof Manhattan
6. Maple Whiskey Sour

**Other Zero-Proof:**
7. Zero Proof Gin & Tonic (Monday Gin)
8. Ghia Spritz
9. Zero Proof Negroni (Ritual + Seedlip Spice)
10. Garden Martini (Ritual Gin Alternative)
11. Forest Floor (Wilderton Earthen)

---

### 💚 WELLNESS DRINKS (11 recipes)

**Kombucha Based:**
1. Ginger Kombucha Mule (GT's Gingerade)
2. Ginger Lemon Mule (Health-Ade)
3. Wellness Spritzer (Health-Ade)

**Hemp/CBD Based:**
4. Zen Garden Spritz (Recess)
5. Hemp Citrus Cooler (Recess)

**Functional Beverages:**
6. Coffee Spritz (Athletic Cold Brew)
7. Espresso Martini Zero (Athletic Cold Brew)

**Adaptogenic:**
8. Golden Hour Latte (REBBL Ashwagandha)
9. Spiced Chai Fizz (REBBL Ashwagandha)

**Classic:**
10. Virgin Mojito

---

### 🍊 LOW-ABV OPTIONS (6 recipes)

**Aperitif Style:**
1. High Rhode Spritz (Kin - contains <0.5% ABV)
2. Curious Spritz (Curious Elixir)

**Seedlip Spice 94:**
3. Spiced Mule
4. Spice Route

**Lyre's Italian Orange:**
5. Zero Proof Aperol Spritz
6. Italian Sunset

---

## Next Steps

### Phase 1: Standardize Data Structure ✅
- [x] Review all 28 recipes
- [x] Identify which need ingredient format updates
- [x] Categorize by type

### Phase 2: Expand Recipe Details (CURRENT)
For each recipe, add:
- [ ] Full ingredient list with measurements
- [ ] Step-by-step instructions (3-5 steps)
- [ ] Glassware specification
- [ ] Proper garnish details
- [ ] Technique notes (shake, stir, build, etc.)
- [ ] Pro tips/variations

### Phase 3: Image Strategy
- [ ] Identify which mocktails need unique images
- [ ] Create image sourcing plan (Unsplash queries)
- [ ] Assign unique thumbnails to reduce repetition

### Phase 4: Implementation
- [ ] Update RecipesScreen.tsx with complete recipe objects
- [ ] Ensure all recipes work with CocktailDetail screen
- [ ] Test grocery list functionality
- [ ] Verify all instructions display correctly

---

## Sample Complete Recipe Card Format

```typescript
{
  id: 'garden-gimlet',
  name: 'Garden Gimlet',
  title: 'Garden Gimlet',
  subtitle: 'Zero-Proof • Classic Style',
  category: 'Mocktails',
  image: 'https://images.unsplash.com/photo-...',
  img: 'https://images.unsplash.com/photo-...',
  difficulty: 'Easy',
  time: '3 min',
  rating: 4.7,
  glass: 'Nick & Nora or Coupe',
  ice: 'Served up (no ice)',
  method: 'Shake',
  ingredients: [
    { name: 'Seedlip Garden 108', note: '2 oz' },
    { name: 'Fresh Lime Juice', note: '0.75 oz freshly squeezed' },
    { name: 'Simple Syrup', note: '0.75 oz (1:1 ratio)' },
    { name: 'Cucumber Wheel', note: 'for garnish' },
    { name: 'Fresh Basil', note: '1 leaf for garnish' },
  ],
  instructions: [
    'Add Seedlip Garden 108, lime juice, and simple syrup to a cocktail shaker',
    'Fill shaker with ice and shake vigorously for 10-15 seconds',
    'Fine strain into a chilled Nick & Nora or coupe glass',
    'Garnish with a cucumber wheel and fresh basil leaf',
  ],
  description: 'Zero-proof take on the classic gimlet with herbaceous Garden 108.',
  tips: [
    'Use fresh lime juice for best flavor',
    'Chill your glass in the freezer for 10 minutes before serving',
    'Slap the basil leaf between your hands before garnishing to release aromatics',
  ],
}
```

---

## Notes

- All "Zero-Proof" drinks contain 0.0% ABV
- "Low-ABV" drinks contain <0.5% ABV (legally non-alcoholic)
- "Wellness" category includes functional ingredients (probiotics, adaptogens, CBD, etc.)
- Keep ingredient format consistent with existing cocktail recipes
- Ensure all measurements use standard bar measurements (oz, dashes, etc.)

---

## Recipe Expansion Priority

**High Priority (Popular/Iconic):**
1. Virgin Mojito
2. Garden Gimlet
3. Smokeless Old Fashioned
4. Espresso Martini Zero
5. Zero Proof Negroni

**Medium Priority (Wellness Focus):**
6. Ginger Kombucha Mule
7. Zen Garden Spritz
8. Coffee Spritz
9. High Rhode Spritz
10. Golden Hour Latte

**Standard Priority (Complete the collection):**
- All remaining recipes (fill out with complete details)
