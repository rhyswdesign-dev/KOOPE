/**
 * Cocktail of the Week Service
 * Randomly selects a featured cocktail that changes weekly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const COTW_KEY = '@cocktail_of_the_week';
const COTW_DATE_KEY = '@cocktail_of_the_week_date';

// Featured cocktails pool (recipe IDs from our database)
const FEATURED_COCKTAILS = [
  'manhattan',
  'old-fashioned',
  'negroni',
  'margarita',
  'martini',
  'espresso-martini',
  'whiskey-sour',
  'mojito',
  'daiquiri',
  'mai-tai',
  'last-word',
  'penicillin',
  'sazerac',
  'aviation',
  'pisco-sour',
  'paper-plane',
  'naked-and-famous',
  'gold-rush',
  'boulevardier',
  'jungle-bird',
  'cosmopolitan',
  'paloma',
  'vesper',
  'french-75',
  'gimlet',
  'corpse-reviver-2',
  'bee-knees',
  'clover-club',
  'southside',
  'bramble',
];

interface CocktailOfTheWeek {
  recipeId: string;
  week: number;
  year: number;
}

/**
 * Get current week number and year
 * Week starts on Monday
 */
function getCurrentWeekYear(): { week: number; year: number } {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now.getTime() - yearStart.getTime()) / 86400000) + yearStart.getDay() + 1) / 7);

  return {
    week: weekNumber,
    year: now.getFullYear(),
  };
}

/**
 * Generate a deterministic random cocktail based on week/year
 */
function selectCocktailForWeek(week: number, year: number): string {
  // Use week + year as seed for consistent selection
  // Add some variation to make it more random across years
  const seed = (year * 53) + week;
  const index = seed % FEATURED_COCKTAILS.length;
  return FEATURED_COCKTAILS[index];
}

/**
 * Get the cocktail of the week
 * Returns cached value if still current week, otherwise selects new one
 */
export async function getCocktailOfTheMonth(): Promise<string> {
  try {
    const { week, year } = getCurrentWeekYear();

    // Check if we have a cached cocktail
    const [cachedCocktail, cachedDate] = await Promise.all([
      AsyncStorage.getItem(COTW_KEY),
      AsyncStorage.getItem(COTW_DATE_KEY),
    ]);

    if (cachedCocktail && cachedDate) {
      const cached: CocktailOfTheWeek = JSON.parse(cachedDate);

      // Check if it's still the same week
      if (cached.week === week && cached.year === year) {
        return cachedCocktail;
      }
    }

    // Select new cocktail for current week
    const selectedCocktail = selectCocktailForWeek(week, year);

    // Cache the selection
    await Promise.all([
      AsyncStorage.setItem(COTW_KEY, selectedCocktail),
      AsyncStorage.setItem(COTW_DATE_KEY, JSON.stringify({ week, year, recipeId: selectedCocktail })),
    ]);

    console.log(`🍸 Cocktail of the Week (Week ${week}, ${year}): ${selectedCocktail}`);

    return selectedCocktail;
  } catch (error) {
    console.error('Error getting cocktail of the week:', error);
    // Fallback to first cocktail if error
    return FEATURED_COCKTAILS[0];
  }
}

/**
 * Force refresh the cocktail of the week (for testing)
 */
export async function refreshCocktailOfTheMonth(): Promise<string> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(COTW_KEY),
      AsyncStorage.removeItem(COTW_DATE_KEY),
    ]);
    return await getCocktailOfTheMonth();
  } catch (error) {
    console.error('Error refreshing cocktail of the week:', error);
    return FEATURED_COCKTAILS[0];
  }
}

/**
 * Get the current month name for display
 */
export function getCurrentMonthName(): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const now = new Date();
  return months[now.getMonth()];
}

/**
 * Get week date range for display
 */
export function getWeekDateRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (date: Date) => {
    const month = date.toLocaleString('default', { month: 'short' });
    return `${month} ${date.getDate()}`;
  };

  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}
