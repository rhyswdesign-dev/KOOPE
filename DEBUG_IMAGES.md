# Debugging Local Images Not Showing

## Quick Checklist:

1. **Clear Metro Cache** (IMPORTANT!)
   ```bash
   # Stop the app completely
   # Then run:
   rm -rf node_modules/.cache
   npx expo start --clear
   ```

2. **Force Reload in App**
   - iOS: Shake device → "Reload"
   - Android: Press R R (double tap R)
   - Or: CMD+R (iOS Simulator) / R R (Android Emulator)

3. **Check Console for Errors**
   - Look for "Unable to resolve module" errors
   - Look for image loading errors

## What Should Be Working:

### Recipes WITH Local Images (42 total):
- negroni
- mojito
- espresso-martini
- margarita
- mimosa
- pina-colada
- aperol-spritz
- dark-stormy
- boulevardier
- black-russian
- brandy-alexander
- brandy-crusta
- brandy-milk-punch
- brooklyn
- caipirinha
- corpse-reviver-1
- dry-martini
- fog-cutter
- french-75
- gimlet
- gin-rickey
- golden-cadillac
- grasshopper
- hanky-panky
- hemingway-daiquiri
- highball
- hugo
- hurricane
- john-collins
- jungle-bird
- kentucky-mule
- martinez
- missionary-downfall
- mudslide
- navy-grog
- negroni-sbagliato
- old-fashioned-classic
- painkiller
- paper-plane
- pearl-diver
- pink-squirrel
- ramos-gin-fizz

### Recipes WITHOUT Local Images (will show Unsplash):
- manhattan
- moscow-mule
- whiskey-sour
- cosmopolitan
- ... (all others)

## If Images Still Don't Show:

### Add Debug Logging:

Add this to `RecipeCard.tsx` line 83:

```typescript
<Image
  source={(() => {
    const imageSource = typeof recipe.image === 'string' ? { uri: recipe.image } : recipe.image;
    console.log('RecipeCard image for', recipe.id || recipe.name, ':', imageSource);
    return imageSource;
  })()}
  style={styles.cocktailImage}
/>
```

Then check your console - you should see local image objects (numbers) for negroni, mojito, etc., and `{uri: "https://..."}` for others.

## Still Not Working?

The issue might be:
1. **Cached data** - Clear AsyncStorage: In app, go to Settings → Clear Cache
2. **Bundle not updated** - Delete app and reinstall
3. **Wrong screen** - Make sure you're on RecipesScreen or CocktailListScreen, not a hardcoded cocktails list

## Expected Behavior:

When you view the Negroni recipe:
1. Database has: `image_url: "https://images.unsplash.com/..."`
2. `recipesRepo.ts:405` calls: `getCocktailImage("negroni", "https://...")`
3. `getCocktailImage` returns: `require('./cocktails/negroni.png')` (a number)
4. `RecipeCard` receives: `recipe.image = 1234` (number from require)
5. `RecipeCard` renders: `<Image source={1234} />` (local image)
6. **You see**: Local negroni.png image

If you're seeing Unsplash images instead, the chain is broken somewhere.
