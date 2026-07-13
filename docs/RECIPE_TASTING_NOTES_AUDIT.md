# Recipe Tasting Notes Audit

## Coverage Snapshot

- Main cocktail dataset (src/data/cocktails.ts): 99 recipes, explicit 'tastingNote' field on 0 recipes.
- Priority weak/unclear descriptions needing authored tasting notes first: 15 recipes.
- Weekly drops already include `tastingNote` on all recipes.
- Collectible recipe cards: 1 card has `tastingNote`, 1 is missing it.
- Supabase recipe model currently has no `tasting_note` field mapped into `Recipe`.

## Priority List (Need Authored Notes First)

- simple-syrup — Simple Syrup
- rosemary-syrup — Rosemary Syrup
- grenadine — Homemade Grenadine
- demerara-syrup — Demerara Syrup
- stirred-house-martini — Stirred House Martini
- bramble — Bramble
- dry-martini — Dry Martini
- house-daiquiri-spec — House Daiquiri Spec
- cosmopolitan — Cosmopolitan
- clover-club — Clover Club
- moscow-mule — Moscow Mule
- party-negroni-batch — Party Negroni Batch
- aperitivo-spritz-variant — Aperitivo Spritz Variant
- hugo — Hugo
- ginger-mint-sparkler — Ginger Mint Sparkler

## Full Main Dataset List (Missing Explicit `tastingNote`)

- simple-syrup — Simple Syrup
- honey-syrup — Honey Syrup
- rosemary-syrup — Rosemary Syrup
- grenadine — Homemade Grenadine
- demerara-syrup — Demerara Syrup
- stirred-house-martini — Stirred House Martini
- boulevardier — Boulevardier
- negroni — Negroni
- manhattan — Manhattan
- sazerac — Sazerac
- vieux-carre — Vieux Carré
- brooklyn — Brooklyn
- hanky-panky — Hanky Panky
- old-fashioned-classic — Old Fashioned
- barrel-driven-old-fashioned — Barrel-Driven Old Fashioned
- mojito — Mojito
- martinez — Martinez
- corpse-reviver-2 — Corpse Reviver #2
- aviation — Aviation
- last-word — Last Word
- mint-julep — Mint Julep
- whiskey-smash — Whiskey Smash
- bramble — Bramble
- bee-knees — bee-knees
- southside — Southside
- french-75 — French 75
- ramos-gin-fizz — Ramos Gin Fizz
- vesper — Vesper
- dry-martini — Dry Martini
- gin-rickey — Gin Rickey
- tom-collins — Tom Collins
- john-collins — John Collins
- paper-plane — Paper Plane
- penicillin — Penicillin
- margarita — Margarita
- daiquiri — Daiquiri
- house-daiquiri-spec — House Daiquiri Spec
- whiskey-sour — Whiskey Sour
- gimlet — Gimlet
- sidecar — Sidecar
- cosmopolitan — Cosmopolitan
- amaretto-sour — Amaretto Sour
- pisco-sour — Pisco Sour
- caipirinha — Caipirinha
- tommy-margarita — tommy-margarita
- paloma — Paloma
- clover-club — Clover Club
- moscow-mule — Moscow Mule
- dark-stormy — Dark \
- kentucky-mule — Kentucky Mule
- bee-sting — Bee Sting
- corpse-reviver-1 — Corpse Reviver #1
- hemingway-daiquiri — Hemingway Daiquiri
- south-side-fizz — South Side Fizz
- ward-8 — Ward 8
- mai-tai — Mai Tai
- zombie — Zombie
- hurricane — Hurricane
- blue-hawaiian — Blue Hawaiian
- painkiller — Painkiller
- jungle-bird — Jungle Bird
- fog-cutter — Fog Cutter
- navy-grog — Navy Grog
- test-pilot — Test Pilot
- saturn — Saturn
- trader-vics-grog — trader-vics-grog
- pearl-diver — Pearl Diver
- missionary-downfall — missionary-downfall
- three-dots-dash — Three Dots and a Dash
- party-negroni-batch — Party Negroni Batch
- french-75 — French 75
- aperol-spritz — Aperol Spritz
- aperitivo-spritz-variant — Aperitivo Spritz Variant
- hugo — Hugo
- gin-tonic — Gin & Tonic
- tom-collins-house-spec — Tom Collins House Spec
- salted-citrus-highball — Salted Citrus Highball
- tea-citrus-cooler — Tea Citrus Cooler
- ginger-mint-sparkler — Ginger Mint Sparkler
- vodka-soda — Vodka Soda
- ranch-water — Ranch Water
- highball — Highball
- americano — Americano
- negroni-sbagliato — Negroni Sbagliato
- spritz-veneziano — Spritz Veneziano
- espresso-martini — Espresso Martini
- white-russian — White Russian
- black-russian — Black Russian
- brandy-alexander — Brandy Alexander
- grasshopper — Grasshopper
- mudslide — Mudslide
- golden-cadillac — Golden Cadillac
- pink-squirrel — Pink Squirrel
- revolver — Revolver
- porto-flip — Porto Flip
- brandy-milk-punch — Brandy Milk Punch
- stinger — Stinger
- brandy-crusta — Brandy Crusta
- alexander — Alexander

## Recommended Implementation

- Add `tastingNote?: string` to recipe content model (`src/types/recipe.ts`) and to Supabase mapping in `src/repos/supabase/recipesRepo.ts`.
- Keep current fallback logic in `CocktailDetailScreen` as safety, but prefer authored notes when present.
- Add a second field for guidance clarity, e.g. `bestFor?: string` (who this drink suits) to support explicit user direction.
- In UI, show a “Taste & Fit” block with:
  - `Tasting Note`: what it tastes like
  - `Best For`: who should choose it / mood / palate
  - Optional chips from `flavorProfiles` (bright, bitter, spirit-forward, sweet).
- Author in phases:
  1. Fill the priority 15 recipes above.
  2. Fill top-traffic classics (Negroni, Margarita, Daiquiri, Old Fashioned, etc.) with a consistent voice.
  3. Backfill the remaining catalog and import into Supabase where applicable.

## Writing Template

- `tastingNote`: “Primary flavor up front, middle-palate character, and finish.” (1 sentence)
- `bestFor`: “Best for drinkers who like X and want Y.” (1 sentence)
