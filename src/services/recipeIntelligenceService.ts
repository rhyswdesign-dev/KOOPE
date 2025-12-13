import { FormattedRecipe } from './aiRecipeFormatter';
import { log } from '../lib/logger';

export interface RecipeDifficulty {
  score: number; // 1-5 scale
  level: 'Beginner' | 'Easy' | 'Intermediate' | 'Advanced' | 'Expert';
  factors: string[];
  estimatedTime: string;
  skillsRequired: string[];
}

export interface NutritionInfo {
  calories: number;
  servings: number;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  sodium: string;
  fiber: string;
  alcohol?: string;
  healthScore: number; // 1-10 scale
  dietaryTags: string[]; // 'low-carb', 'high-protein', 'vegan', etc.
}

export interface IngredientSubstitution {
  original: string;
  substitutes: Array<{
    ingredient: string;
    ratio: string;
    notes: string;
    availability: 'common' | 'specialty' | 'rare';
  }>;
  reason: string;
}

export interface CostEstimation {
  totalCost: number;
  costPerServing: number;
  currency: string;
  ingredientCosts: Array<{
    ingredient: string;
    amount: string;
    cost: number;
    priceCategory: 'budget' | 'moderate' | 'premium';
  }>;
  costBreakdown: {
    spirits: number;
    mixers: number;
    garnish: number;
    equipment: number;
  };
  budgetCategory: 'Budget' | 'Moderate' | 'Premium' | 'Luxury';
}

export interface RecipeIntelligence {
  difficulty: RecipeDifficulty;
  nutrition?: NutritionInfo;
  substitutions: IngredientSubstitution[];
  cost: CostEstimation;
  tags: string[];
  recommendations: string[];
}

export class RecipeIntelligenceService {
  private static readonly OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  static async analyzeRecipe(recipe: FormattedRecipe): Promise<RecipeIntelligence> {
    try {
      const [difficulty, nutrition, substitutions, cost] = await Promise.all([
        this.analyzeDifficulty(recipe),
        this.analyzeNutrition(recipe),
        this.generateSubstitutions(recipe),
        this.estimateCost(recipe)
      ]);

      const tags = this.generateTags(recipe, difficulty, nutrition);
      const recommendations = this.generateRecommendations(recipe, difficulty, nutrition, cost);

      return {
        difficulty,
        nutrition,
        substitutions,
        cost,
        tags,
        recommendations
      };
    } catch (error) {
      log.error('RecipeIntelligenceService', 'Recipe intelligence analysis failed', error, {
        recipeTitle: recipe.title
      });
      return this.getFallbackIntelligence(recipe);
    }
  }

  static async analyzeDifficulty(recipe: FormattedRecipe): Promise<RecipeDifficulty> {
    if (!this.OPENAI_API_KEY) {
      return this.getFallbackDifficulty(recipe);
    }

    try {
      const prompt = `Analyze the difficulty of this cocktail recipe and provide a detailed assessment:

Recipe: ${recipe.title}
Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.name}`).join(', ')}
Instructions: ${recipe.instructions.join(' ')}

Provide a JSON response with:
- score (1-5): numerical difficulty rating
- level: difficulty level name
- factors: array of factors affecting difficulty
- estimatedTime: time to make the cocktail
- skillsRequired: array of bartending skills needed

Consider: technique complexity, ingredient rarity, equipment needs, timing precision, garnish complexity.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response structure');
      }

      const analysis = JSON.parse(data.choices[0].message.content);

      return {
        score: analysis.score,
        level: analysis.level,
        factors: analysis.factors,
        estimatedTime: analysis.estimatedTime,
        skillsRequired: analysis.skillsRequired
      };
    } catch (error) {
      log.error('RecipeIntelligenceService', 'Difficulty analysis failed', error, {
        recipeTitle: recipe.title
      });
      return this.getFallbackDifficulty(recipe);
    }
  }

  static async analyzeNutrition(recipe: FormattedRecipe): Promise<NutritionInfo> {
    if (!this.OPENAI_API_KEY) {
      return this.getFallbackNutrition(recipe);
    }

    try {
      const prompt = `Analyze the nutritional content of this cocktail recipe:

Recipe: ${recipe.title}
Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.name}`).join(', ')}

Provide a JSON response with estimated nutritional information:
- calories: total calories per serving
- servings: number of servings
- protein: protein content with unit
- carbs: carbohydrate content with unit
- fat: fat content with unit
- sugar: sugar content with unit
- sodium: sodium content with unit
- fiber: fiber content with unit
- alcohol: alcohol content percentage (if applicable)
- healthScore: health rating 1-10 (10 being healthiest)
- dietaryTags: array of dietary classifications

Consider: alcohol content, mixers, syrups, fruits, garnishes.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response structure');
      }

      const analysis = JSON.parse(data.choices[0].message.content);

      return analysis;
    } catch (error) {
      log.error('RecipeIntelligenceService', 'Nutrition analysis failed', error, {
        recipeTitle: recipe.title
      });
      return this.getFallbackNutrition(recipe);
    }
  }

  static async generateSubstitutions(recipe: FormattedRecipe): Promise<IngredientSubstitution[]> {
    if (!this.OPENAI_API_KEY) {
      return this.getFallbackSubstitutions(recipe);
    }

    try {
      const prompt = `Generate ingredient substitutions for this cocktail recipe:

Recipe: ${recipe.title}
Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.name}`).join(', ')}

For each ingredient that could have substitutes, provide a JSON array with:
- original: original ingredient name
- substitutes: array of alternatives with ingredient, ratio, notes, availability
- reason: why someone might substitute

Focus on: allergies, availability, budget, dietary restrictions, flavor variations.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response structure');
      }

      const substitutions = JSON.parse(data.choices[0].message.content);

      return substitutions;
    } catch (error) {
      log.error('RecipeIntelligenceService', 'Substitution generation failed', error, {
        recipeTitle: recipe.title
      });
      return this.getFallbackSubstitutions(recipe);
    }
  }

  static async estimateCost(recipe: FormattedRecipe): Promise<CostEstimation> {
    if (!this.OPENAI_API_KEY) {
      return this.getFallbackCost(recipe);
    }

    try {
      const prompt = `Estimate the cost to make this cocktail recipe:

Recipe: ${recipe.title}
Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.name}`).join(', ')}

Provide a JSON response with cost analysis:
- totalCost: total cost to make one cocktail
- costPerServing: cost per serving if multiple servings
- currency: "USD"
- ingredientCosts: array with ingredient, amount, cost, priceCategory
- costBreakdown: spirits, mixers, garnish, equipment costs
- budgetCategory: Budget/Moderate/Premium/Luxury

Use average US retail prices. Consider: spirit quality, mixer brands, garnish complexity.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 700,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response structure');
      }

      const costAnalysis = JSON.parse(data.choices[0].message.content);

      return costAnalysis;
    } catch (error) {
      log.error('RecipeIntelligenceService', 'Cost estimation failed', error, {
        recipeTitle: recipe.title
      });
      return this.getFallbackCost(recipe);
    }
  }

  private static getFallbackDifficulty(recipe: FormattedRecipe): RecipeDifficulty {
    const ingredientCount = recipe.ingredients.length;
    const stepCount = recipe.instructions.length;

    let score = 1;
    if (ingredientCount > 5) score += 1;
    if (stepCount > 4) score += 1;
    if (recipe.instructions.some(s => s.toLowerCase().includes('shake') || s.toLowerCase().includes('stir'))) score += 1;
    if (recipe.garnish) score += 1;

    const levels: RecipeDifficulty['level'][] = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];

    return {
      score: Math.min(score, 5),
      level: levels[Math.min(score - 1, 4)],
      factors: ['Ingredient count', 'Step complexity'],
      estimatedTime: '3-5 minutes',
      skillsRequired: ['Basic mixing']
    };
  }

  private static getFallbackNutrition(recipe: FormattedRecipe): NutritionInfo {
    return {
      calories: 150,
      servings: 1,
      protein: '0g',
      carbs: '15g',
      fat: '0g',
      sugar: '12g',
      sodium: '5mg',
      fiber: '0g',
      alcohol: '14%',
      healthScore: 5,
      dietaryTags: ['contains-alcohol']
    };
  }

  private static getFallbackSubstitutions(recipe: FormattedRecipe): IngredientSubstitution[] {
    return recipe.ingredients.slice(0, 2).map(ingredient => ({
      original: ingredient.name,
      substitutes: [
        {
          ingredient: 'Generic alternative',
          ratio: '1:1',
          notes: 'Similar flavor profile',
          availability: 'common' as const
        }
      ],
      reason: 'Availability or preference'
    }));
  }

  private static getFallbackCost(recipe: FormattedRecipe): CostEstimation {
    const baseCost = recipe.ingredients.length * 2.5;

    return {
      totalCost: baseCost,
      costPerServing: baseCost,
      currency: 'USD',
      ingredientCosts: recipe.ingredients.map(ing => ({
        ingredient: ing.name,
        amount: ing.amount,
        cost: 2.5,
        priceCategory: 'moderate' as const
      })),
      costBreakdown: {
        spirits: baseCost * 0.6,
        mixers: baseCost * 0.25,
        garnish: baseCost * 0.1,
        equipment: baseCost * 0.05
      },
      budgetCategory: 'Moderate'
    };
  }

  private static getFallbackIntelligence(recipe: FormattedRecipe): RecipeIntelligence {
    return {
      difficulty: this.getFallbackDifficulty(recipe),
      nutrition: this.getFallbackNutrition(recipe),
      substitutions: this.getFallbackSubstitutions(recipe),
      cost: this.getFallbackCost(recipe),
      tags: ['cocktail', 'mixed-drink'],
      recommendations: ['Great for beginners', 'Perfect for parties']
    };
  }

  private static generateTags(recipe: FormattedRecipe, difficulty: RecipeDifficulty, nutrition?: NutritionInfo): string[] {
    const tags = [];

    // Difficulty tags
    tags.push(difficulty.level.toLowerCase());
    if (difficulty.estimatedTime.includes('quick') || difficulty.score <= 2) {
      tags.push('quick-make');
    }

    // Nutrition tags
    if (nutrition) {
      if (nutrition.calories < 100) tags.push('low-calorie');
      if (nutrition.healthScore >= 7) tags.push('healthy');
      tags.push(...nutrition.dietaryTags);
    }

    // Ingredient-based tags
    const ingredientText = recipe.ingredients.map(i => i.name.toLowerCase()).join(' ');
    if (ingredientText.includes('whiskey') || ingredientText.includes('bourbon')) tags.push('whiskey-based');
    if (ingredientText.includes('vodka')) tags.push('vodka-based');
    if (ingredientText.includes('gin')) tags.push('gin-based');
    if (ingredientText.includes('rum')) tags.push('rum-based');
    if (ingredientText.includes('fruit') || ingredientText.includes('juice')) tags.push('fruity');

    return tags;
  }

  private static generateRecommendations(
    recipe: FormattedRecipe,
    difficulty: RecipeDifficulty,
    nutrition?: NutritionInfo,
    cost?: CostEstimation
  ): string[] {
    const recommendations = [];

    // Difficulty-based recommendations
    if (difficulty.score <= 2) {
      recommendations.push('Perfect for beginners');
    } else if (difficulty.score >= 4) {
      recommendations.push('Challenge for experienced bartenders');
    }

    // Cost-based recommendations
    if (cost) {
      if (cost.budgetCategory === 'Budget') {
        recommendations.push('Great value cocktail');
      } else if (cost.budgetCategory === 'Premium') {
        recommendations.push('Special occasion drink');
      }
    }

    // Nutrition-based recommendations
    if (nutrition) {
      if (nutrition.calories < 120) {
        recommendations.push('Light and refreshing');
      }
      if (nutrition.healthScore >= 7) {
        recommendations.push('Healthier cocktail option');
      }
    }

    return recommendations;
  }
}