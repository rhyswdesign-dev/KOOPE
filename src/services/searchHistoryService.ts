/**
 * SEARCH HISTORY SERVICE
 * Manages search history with persistence, trending searches, and suggestions
 * Provides intelligent search recommendations based on user behavior
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  category?: string;
  resultCount?: number;
  clicked?: boolean; // Whether user clicked on a result
}

export interface TrendingSearch {
  query: string;
  count: number;
  category?: string;
  lastSearched: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'history' | 'trending' | 'autocomplete';
  category?: string;
  frequency?: number;
}

// Storage keys
const STORAGE_KEYS = {
  SEARCH_HISTORY: 'search_history',
  TRENDING_SEARCHES: 'trending_searches',
  SEARCH_PREFERENCES: 'search_preferences',
} as const;

// Search suggestions based on cocktail knowledge
const COCKTAIL_SUGGESTIONS = [
  // Classic cocktails
  'Old Fashioned', 'Manhattan', 'Whiskey Sour', 'Negroni', 'Martini',
  'Daiquiri', 'Mai Tai', 'Mint Julep', 'Sazerac', 'Boulevardier',

  // Popular modern cocktails
  'Espresso Martini', 'Paper Plane', 'Bee\'s Knees', 'Gold Rush',
  'Amaretto Sour', 'Penicillin', 'Last Word', 'Aviation',

  // By spirit
  'Whiskey cocktails', 'Gin cocktails', 'Vodka cocktails', 'Rum cocktails',
  'Tequila cocktails', 'Mezcal cocktails', 'Bourbon cocktails',

  // By difficulty
  'Easy cocktails', 'Simple cocktails', 'Advanced cocktails',
  'Beginner cocktails', 'Professional cocktails',

  // By occasion
  'Summer cocktails', 'Winter cocktails', 'Party cocktails',
  'Brunch cocktails', 'After dinner cocktails', 'Aperitif cocktails',

  // By style
  'Shaken cocktails', 'Stirred cocktails', 'Built cocktails',
  'Layered cocktails', 'Frozen cocktails', 'Hot cocktails',

  // By flavor profile
  'Sweet cocktails', 'Sour cocktails', 'Bitter cocktails',
  'Smoky cocktails', 'Spicy cocktails', 'Fruity cocktails',
];

class SearchHistoryService {
  private static instance: SearchHistoryService;
  private searchHistory: SearchHistoryItem[] = [];
  private trendingSearches: TrendingSearch[] = [];
  private maxHistoryItems = 100;
  private maxTrendingItems = 20;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): SearchHistoryService {
    if (!SearchHistoryService.instance) {
      SearchHistoryService.instance = new SearchHistoryService();
    }
    return SearchHistoryService.instance;
  }

  /**
   * Add a search to history
   */
  public async addSearch(
    query: string,
    category?: string,
    resultCount?: number
  ): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const searchItem: SearchHistoryItem = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: trimmedQuery,
      timestamp: Date.now(),
      category,
      resultCount,
      clicked: false,
    };

    // Remove any existing search with the same query
    this.searchHistory = this.searchHistory.filter(
      item => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
    );

    // Add to beginning of history
    this.searchHistory.unshift(searchItem);

    // Limit history size
    if (this.searchHistory.length > this.maxHistoryItems) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
    }

    // Update trending searches
    this.updateTrendingSearches(trimmedQuery, category);

    // Save to storage
    await this.saveToStorage();
  }

  /**
   * Mark a search as clicked (user clicked on a result)
   */
  public async markSearchClicked(searchId: string): Promise<void> {
    const searchItem = this.searchHistory.find(item => item.id === searchId);
    if (searchItem) {
      searchItem.clicked = true;
      await this.saveToStorage();
    }
  }

  /**
   * Get search history
   */
  public getSearchHistory(limit?: number): SearchHistoryItem[] {
    const history = this.searchHistory.slice(0, limit);
    // Sort by timestamp (most recent first)
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get recent searches (last 10)
   */
  public getRecentSearches(): string[] {
    return this.searchHistory
      .slice(0, 10)
      .map(item => item.query);
  }

  /**
   * Get trending searches
   */
  public getTrendingSearches(): TrendingSearch[] {
    return this.trendingSearches
      .sort((a, b) => b.count - a.count)
      .slice(0, this.maxTrendingItems);
  }

  /**
   * Get search suggestions based on query
   */
  public getSearchSuggestions(query: string): SearchSuggestion[] {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return this.getDefaultSuggestions();
    }

    const suggestions: SearchSuggestion[] = [];

    // History-based suggestions
    const historySuggestions = this.searchHistory
      .filter(item =>
        item.query.toLowerCase().includes(trimmedQuery) &&
        item.query.toLowerCase() !== trimmedQuery
      )
      .slice(0, 3)
      .map(item => ({
        text: item.query,
        type: 'history' as const,
        category: item.category,
        frequency: 1,
      }));

    suggestions.push(...historySuggestions);

    // Trending suggestions
    const trendingSuggestions = this.trendingSearches
      .filter(item =>
        item.query.toLowerCase().includes(trimmedQuery) &&
        item.query.toLowerCase() !== trimmedQuery
      )
      .slice(0, 2)
      .map(item => ({
        text: item.query,
        type: 'trending' as const,
        category: item.category,
        frequency: item.count,
      }));

    suggestions.push(...trendingSuggestions);

    // Autocomplete suggestions from cocktail knowledge
    const autocompleteSuggestions = COCKTAIL_SUGGESTIONS
      .filter(suggestion =>
        suggestion.toLowerCase().includes(trimmedQuery) &&
        suggestion.toLowerCase() !== trimmedQuery
      )
      .slice(0, 5)
      .map(suggestion => ({
        text: suggestion,
        type: 'autocomplete' as const,
      }));

    suggestions.push(...autocompleteSuggestions);

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
    );

    return uniqueSuggestions
      .sort((a, b) => {
        // Prioritize history, then trending, then autocomplete
        const typeOrder = { history: 0, trending: 1, autocomplete: 2 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }

        // Within same type, sort by frequency or relevance
        if (a.frequency && b.frequency) {
          return b.frequency - a.frequency;
        }

        return 0;
      })
      .slice(0, 8); // Limit to 8 suggestions
  }

  /**
   * Get default suggestions when no query
   */
  public getDefaultSuggestions(): SearchSuggestion[] {
    const recentSearches = this.getRecentSearches().slice(0, 3).map(query => ({
      text: query,
      type: 'history' as const,
    }));

    const trending = this.getTrendingSearches().slice(0, 3).map(trend => ({
      text: trend.query,
      type: 'trending' as const,
      frequency: trend.count,
    }));

    const popular = [
      'Old Fashioned', 'Whiskey Sour', 'Gin & Tonic', 'Margarita',
    ].map(query => ({
      text: query,
      type: 'autocomplete' as const,
    }));

    return [...recentSearches, ...trending, ...popular].slice(0, 8);
  }

  /**
   * Clear search history
   */
  public async clearHistory(): Promise<void> {
    this.searchHistory = [];
    await this.saveToStorage();
  }

  /**
   * Remove specific search from history
   */
  public async removeSearch(searchId: string): Promise<void> {
    this.searchHistory = this.searchHistory.filter(item => item.id !== searchId);
    await this.saveToStorage();
  }

  /**
   * Get search analytics
   */
  public getSearchAnalytics(): {
    totalSearches: number;
    uniqueQueries: number;
    averageResultsPerSearch: number;
    topCategories: { category: string; count: number }[];
    searchFrequency: { query: string; count: number }[];
  } {
    const totalSearches = this.searchHistory.length;
    const uniqueQueries = new Set(this.searchHistory.map(item => item.query.toLowerCase())).size;

    const searchesWithResults = this.searchHistory.filter(item => item.resultCount !== undefined);
    const averageResultsPerSearch = searchesWithResults.length > 0
      ? searchesWithResults.reduce((sum, item) => sum + (item.resultCount || 0), 0) / searchesWithResults.length
      : 0;

    // Category analysis
    const categoryCount: Record<string, number> = {};
    this.searchHistory.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Search frequency
    const queryCount: Record<string, number> = {};
    this.searchHistory.forEach(item => {
      const query = item.query.toLowerCase();
      queryCount[query] = (queryCount[query] || 0) + 1;
    });

    const searchFrequency = Object.entries(queryCount)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSearches,
      uniqueQueries,
      averageResultsPerSearch,
      topCategories,
      searchFrequency,
    };
  }

  /**
   * Update trending searches
   */
  private updateTrendingSearches(query: string, category?: string): void {
    const existingTrend = this.trendingSearches.find(
      trend => trend.query.toLowerCase() === query.toLowerCase()
    );

    if (existingTrend) {
      existingTrend.count++;
      existingTrend.lastSearched = Date.now();
    } else {
      this.trendingSearches.push({
        query,
        count: 1,
        category,
        lastSearched: Date.now(),
      });
    }

    // Remove old trending searches (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.trendingSearches = this.trendingSearches.filter(
      trend => trend.lastSearched > thirtyDaysAgo
    );

    // Limit trending searches
    if (this.trendingSearches.length > this.maxTrendingItems) {
      this.trendingSearches = this.trendingSearches
        .sort((a, b) => b.count - a.count)
        .slice(0, this.maxTrendingItems);
    }
  }

  /**
   * Load data from storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const [historyData, trendingData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.TRENDING_SEARCHES),
      ]);

      if (historyData) {
        this.searchHistory = JSON.parse(historyData);
      }

      if (trendingData) {
        this.trendingSearches = JSON.parse(trendingData);
      }
    } catch (error) {
      log.error('SearchHistoryService', 'Failed to load search history from storage', error);
    }
  }

  /**
   * Save data to storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(this.searchHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.TRENDING_SEARCHES, JSON.stringify(this.trendingSearches)),
      ]);
    } catch (error) {
      log.error('SearchHistoryService', 'Failed to save search history to storage', error);
    }
  }
}

// Export singleton instance
export const searchHistoryService = SearchHistoryService.getInstance();