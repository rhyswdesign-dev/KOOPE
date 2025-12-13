/**
 * Curriculum Repository - Supabase
 * Fetches learning curriculum from Supabase
 */

import { supabase } from '../../lib/supabase';
import { log } from '../../lib/logger';

export interface Module {
  id: string;
  title: string;
  chapterIndex: number;
  description?: string;
  prerequisiteIds: string[];
  estimatedMinutes: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  itemIds: string[];
  estimatedMinutes: number;
  prerequisiteIds: string[];
  types: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  answerIndex?: number;
  orderTarget?: string[];
  answerText?: string;
  acceptableAnswers?: string[];
  correct?: string[];
  pairs?: any;
  roleplay?: any;
  tags: string[];
  conceptId?: string;
  difficulty?: number;
  xpAward: number;
  reviewWeight?: number;
  createdAt: string;
  updatedAt: string;
}

export class CurriculumRepository {
  /**
   * Get all modules
   */
  static async getAllModules(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('chapter_index');

    if (error) {
      log.error('CurriculumRepo', 'Error fetching modules', error);
      return [];
    }

    return (data || []).map(this.mapModuleFromDatabase);
  }

  /**
   * Get module by ID
   */
  static async getModuleById(id: string): Promise<Module | null> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      log.error('CurriculumRepo', 'Error fetching module', error);
      return null;
    }

    return data ? this.mapModuleFromDatabase(data) : null;
  }

  /**
   * Get lessons for a module
   */
  static async getLessonsByModuleId(moduleId: string): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at');

    if (error) {
      log.error('CurriculumRepo', 'Error fetching lessons', error);
      return [];
    }

    return (data || []).map(this.mapLessonFromDatabase);
  }

  /**
   * Get lesson by ID
   */
  static async getLessonById(id: string): Promise<Lesson | null> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      log.error('CurriculumRepo', 'Error fetching lesson', error);
      return null;
    }

    return data ? this.mapLessonFromDatabase(data) : null;
  }

  /**
   * Get items by IDs
   */
  static async getItemsByIds(itemIds: string[]): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('id', itemIds);

    if (error) {
      log.error('CurriculumRepo', 'Error fetching items', error);
      return [];
    }

    // Maintain order of itemIds
    const itemMap = new Map((data || []).map(item => [item.id, this.mapItemFromDatabase(item)]));
    return itemIds.map(id => itemMap.get(id)).filter(Boolean) as Item[];
  }

  /**
   * Map database module
   */
  private static mapModuleFromDatabase(data: any): Module {
    return {
      id: data.id,
      title: data.title,
      chapterIndex: data.chapter_index,
      description: data.description,
      prerequisiteIds: data.prerequisite_ids || [],
      estimatedMinutes: data.estimated_minutes,
      tags: data.tags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Map database lesson
   */
  private static mapLessonFromDatabase(data: any): Lesson {
    return {
      id: data.id,
      moduleId: data.module_id,
      title: data.title,
      itemIds: data.item_ids || [],
      estimatedMinutes: data.estimated_minutes,
      prerequisiteIds: data.prerequisite_ids || [],
      types: data.types || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Map database item
   */
  private static mapItemFromDatabase(data: any): Item {
    return {
      id: data.id,
      type: data.type,
      prompt: data.prompt,
      options: data.options || [],
      answerIndex: data.answer_index,
      orderTarget: data.order_target || [],
      answerText: data.answer_text,
      acceptableAnswers: data.acceptable_answers || [],
      correct: data.correct || [],
      pairs: data.pairs,
      roleplay: data.roleplay,
      tags: data.tags || [],
      conceptId: data.concept_id,
      difficulty: data.difficulty ? parseFloat(data.difficulty) : undefined,
      xpAward: data.xp_award,
      reviewWeight: data.review_weight ? parseFloat(data.review_weight) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
