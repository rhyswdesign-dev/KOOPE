# Recipe Card Editing Guide

This guide explains how to edit your recipe cards (cocktails) in the database smoothly.

## The Problem

You have 89+ cocktail recipes in `src/data/cocktails.ts` and manually editing glassware, difficulty, and other fields in the TypeScript file is tedious and error-prone.

## The Solution

I've created **two tools** to make editing recipe cards much easier:

### 1. Interactive Command-Line Editor (Recommended)

**Best for:** Quick edits, fixing missing glassware, batch updates

**Usage:**
```bash
npx tsx scripts/edit-recipes-interactive.ts
```

**Features:**
- List all recipes or filter by glassware type
- Search recipes by name
- Edit individual recipes interactively
- Fix all missing glassware in one session
- Real-time updates to cocktails.ts

**Commands:**
```
list [filter]    - List recipes
                   Examples:
                   - list all
                   - list missing
                   - list "Coupe Glass"
                   - list "Rocks Glass"

search <name>    - Search by name
                   Example: search negroni

edit <id>        - Edit a specific recipe
                   Example: edit blue-hawaiian

fix-missing      - Interactively fix all recipes missing glassware
                   (walks you through each one)

exit             - Exit the editor
```

**Example Session:**
```
$ npx tsx scripts/edit-recipes-interactive.ts

🍸 Recipe Card Editor

Found 89 recipes
❌ 3 recipes missing glassware

Commands:
  list [filter] - List recipes
  edit <id>     - Edit a recipe by ID
  search <name> - Search recipes by name
  fix-missing   - Fix all missing glassware
  exit          - Exit

> search blue
Found 1 matches:
  1. Blue Hawaiian    | Hurricane Glass | blue-hawaiian

> edit blue-hawaiian
Editing: Blue Hawaiian
Current glassware: Hurricane Glass

Available glassware:
  1. Coupe Glass
  2. Rocks Glass
  3. Highball Glass
  4. Collins Glass
  ...

Select glassware (number or name): 6

✅ Updated Blue Hawaiian → Hurricane Glass
```

### 2. Web-Based Visual Editor

**Best for:** Visual overview, seeing all recipes at once

**Usage:**
1. Open `scripts/recipe-editor.html` in your browser
2. The interface shows all recipes in a grid
3. Click "Edit" on any card
4. Make changes and save

**Features:**
- Visual card grid interface
- Filter by glassware type or missing glassware
- Search functionality
- Edit modal with dropdowns
- Export changes as JSON

## Current Status

✅ **89 recipes found**
❌ **3 recipes missing glassware:**
   - Simple Syrup
   - Honey Syrup
   - Rosemary Syrup

Note: These 3 are actually syrups/ingredients, not cocktails, so they may not need glassware.

## Common Tasks

### Fix Glassware Issues

**Quick fix for all missing:**
```bash
npx tsx scripts/edit-recipes-interactive.ts
> fix-missing
```

**Fix a specific recipe:**
```bash
npx tsx scripts/edit-recipes-interactive.ts
> search <recipe name>
> edit <recipe-id>
```

**Audit all glassware:**
```bash
npx tsx scripts/complete-glassware-audit.ts
```

### Update Multiple Recipes

**Change all "Martini Glass" to "Coupe Glass":**
```bash
# Use the apply-glassware-corrections script
# Edit CORRECT_GLASSWARE object to map recipes to new glassware
npx tsx scripts/apply-glassware-corrections.ts
```

### Verify Changes

After making edits:
1. Metro bundler will auto-reload (if running)
2. Clear app cache to see changes immediately:
   ```bash
   rm -rf node_modules/.cache .expo
   npx expo start --clear
   ```

## Available Glassware Options

- Coupe Glass
- Rocks Glass
- Highball Glass
- Collins Glass
- Martini Glass
- Hurricane Glass
- Wine Glass
- Champagne Flute
- Copper Mug
- Margarita Glass
- Shot Glass
- Punch Bowl
- Nick & Nora Glass
- Snifter
- Irish Coffee Glass
- Heatproof Mug

## Tips

1. **Always use the interactive editor** - It's faster than manually editing cocktails.ts
2. **Search before editing** - Use `search` to find the exact recipe ID
3. **Use filters** - `list missing` shows only recipes that need attention
4. **Batch operations** - Use `fix-missing` to handle multiple recipes at once

## Troubleshooting

**Changes not showing in app?**
- Clear Metro cache: `rm -rf node_modules/.cache .expo && npx expo start --clear`
- Force reload in app: Shake device → Reload

**Can't find a recipe?**
- Use `search` command
- Use `list all` to see all recipes

**Editor showing wrong count?**
- Restart the editor
- Check if cocktails.ts was modified outside the editor

## Advanced: Bulk Edits with Scripts

For complex bulk operations, you can:

1. **Use apply-glassware-corrections.ts:**
   ```typescript
   const CORRECT_GLASSWARE = {
     'recipe-id': 'New Glassware Type',
     // ... more mappings
   };
   ```

2. **Write custom scripts:**
   - See existing scripts in `/scripts/` for examples
   - Use regex patterns to find/replace specific fields

## Recipe Data Structure

Each recipe in cocktails.ts has this structure:
```typescript
{
  id: 'unique-slug',
  name: 'Display Name',
  subtitle: 'Brief description',
  description: 'Full description',
  ingredients: ['...'],
  instructions: ['...'],
  difficulty: 'Easy' | 'Medium' | 'Medium-Hard' | 'Hard',
  time: '3 min',
  rating: 4.5,
  image: 'url-or-local-reference',
  era: 'classic' | 'tiki' | 'pre-prohibition',
  base: 'gin' | 'rum' | 'vodka' | 'whiskey' | 'tequila',
  glassware: 'Coupe Glass', // ← What we're editing
}
```

## Summary

**For quick glassware fixes:** Use the interactive editor
```bash
npx tsx scripts/edit-recipes-interactive.ts
```

**For visual browsing:** Open `recipe-editor.html` in browser

**For bulk updates:** Edit and run `apply-glassware-corrections.ts`

The editing process is now **much smoother** than manually editing the TypeScript file!
