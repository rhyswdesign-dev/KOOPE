// @ts-nocheck
/**
 * Weekly Rotation Utility
 *
 * Provides a deterministic weekly rotation of classic cocktails
 * Each week shows different cocktails in a randomized order
 */

import { ALL_COCKTAILS } from '../data/cocktails';

/**
 * Get the current ISO week number
 * This ensures all users see the same cocktails each week
 */
function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Seeded random number generator
 * Same seed = same sequence of "random" numbers
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Shuffle array using seeded random
 * Same seed = same shuffle order
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentIndex = shuffled.length;

  while (currentIndex > 0) {
    const randomIndex = Math.floor(seededRandom(seed++) * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }

  return shuffled;
}

/**
 * Get all classic cocktails
 */
function getAllClassicCocktails() {
  return ALL_COCKTAILS.filter(cocktail =>
    // Filter out syrups
    cocktail.category !== 'Syrups' &&
    !cocktail.id.includes('syrup')
  );
}

/**
 * Get cocktails of the week
 * Returns a deterministic set of cocktails based on the current week
 *
 * @param count Number of cocktails to return (default: 4)
 * @param weekOffset Offset from current week (0 = this week, 1 = next week, -1 = last week)
 */
export function getCocktailsOfTheWeek(count: number = 4, weekOffset: number = 0) {
  const allCocktails = getAllClassicCocktails();
  const weekNumber = getWeekNumber() + weekOffset;

  // Use week number as seed for deterministic randomization
  const shuffled = seededShuffle(allCocktails, weekNumber);

  // Take the first N cocktails
  return shuffled.slice(0, count).map(cocktail => ({
    id: cocktail.id,
    title: cocktail.name,
    subtitle: `${cocktail.era || 'Classic'} • ${cocktail.base}-based`,
    description: cocktail.description,
    img: cocktail.image,
    difficulty: cocktail.difficulty,
    time: cocktail.time,
    ingredients: cocktail.ingredients,
  }));
}

/**
 * Get the total number of classic cocktails in rotation
 */
export function getTotalCocktailsInRotation(): number {
  return getAllClassicCocktails().length;
}

/**
 * Preview next week's cocktails (useful for testing)
 */
export function getNextWeeksCocktails(count: number = 4) {
  return getCocktailsOfTheWeek(count, 1);
}

/**
 * Preview last week's cocktails (useful for testing)
 */
export function getLastWeeksCocktails(count: number = 4) {
  return getCocktailsOfTheWeek(count, -1);
}
