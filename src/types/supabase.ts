/**
 * Supabase Table Types
 * Auto-generated types for Supabase tables
 */

export interface Cocktail {
  id: string;
  name: string;
  ingredients: string; // Comma-separated list of ingredients
  // Structured mirror of `ingredients` (name/amount/unit), populated for
  // AI-generated recipes from migration 034 onward. NULL for curated rows
  // and anything generated before that migration.
  ingredients_structured?: { name: string; amount: string; unit?: string }[] | null;
  instructions?: string;
  category?: string;
  glass_type?: string;
  garnish?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  // AI Recipe Generation fields
  is_ai_generated?: boolean;
  generated_by_user_id?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'expert';
  generation_prompt?: string;
  inventory_snapshot?: any[];
  ai_model?: string;
  generation_timestamp?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}
