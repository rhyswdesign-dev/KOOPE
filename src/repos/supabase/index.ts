/**
 * Supabase Repositories
 * Central export for all Supabase data repositories
 */

export { RecipesRepository } from './recipesRepo';
export { CurriculumRepository } from './curriculumRepo';

// Re-export types
export type { Module, Lesson, Item } from './curriculumRepo';
