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
  validationMode?: 'exact' | 'contains' | 'keywords';
  requiredKeywords?: string[];
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

const normalizeExerciseType = (value: unknown): string => {
  const t = String(value || 'mcq').toLowerCase();
  if (t === 'multiple_choice' || t === 'mcp' || t === 'roleplay') return 'mcq';
  if (t === 'multi_select') return 'checkbox';
  if (t === 'short_answer') return 'short';
  if (t === 'ordering') return 'order';
  if (t === 'matching') return 'match';
  return t;
};

const fallbackPromptByType: Record<string, string> = {
  mcq: 'Choose the best answer.',
  checkbox: 'Select all correct options.',
  order: 'Place the process in order.',
  match: 'Match each item to the best pair.',
  short: 'Enter your answer.',
};

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
    const itemLabels = Array.isArray(data.items) ? data.items.map((v: unknown) => String(v)) : [];
    const optionLabels = Array.isArray(data.options) ? data.options.map((v: unknown) => String(v)) : [];
    const labelsPool = itemLabels.length > 0 ? itemLabels : optionLabels;
    const orderTargetCandidates = [
      data.order_target,
      data.expected_order,
      data.correct_order,
      data.sequence,
      data.correct,
    ];
    let normalizedOrderTarget: string[] = [];
    for (const candidate of orderTargetCandidates) {
      if (!Array.isArray(candidate) || candidate.length === 0) continue;

      if (labelsPool.length > 0 && candidate.every((v: unknown) => typeof v === 'number' || /^\d+$/.test(String(v)))) {
        const mapped = candidate
          .map((v: unknown) => labelsPool[Number(v)])
          .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0);
        if (mapped.length > 0) {
          normalizedOrderTarget = mapped;
          break;
        }
      }

      const labels = candidate.map((v: unknown) => String(v)).filter(Boolean);
      if (labels.length > 0 && labels.every((v) => /^\d+$/.test(v))) {
        continue;
      }
      if (labels.length > 0) {
        normalizedOrderTarget = labels;
        break;
      }
    }
    if (normalizedOrderTarget.length === 0 && labelsPool.length > 0) {
      normalizedOrderTarget = labelsPool;
    }

    const normalizedType = normalizeExerciseType(data.type);
    const resolvedPrompt = [data.prompt, data.question, data.stem]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .find((v) => v.length > 0) || fallbackPromptByType[normalizedType] || 'Answer the question.';
    const normalizedAnswerIndex =
      typeof data.answer_index === 'number'
        ? data.answer_index
        : typeof data.correct === 'number'
          ? data.correct
          : undefined;

    return {
      id: data.id,
      type: normalizedType,
      prompt: resolvedPrompt,
      options: data.options || [],
      answerIndex: normalizedAnswerIndex,
      orderTarget: normalizedOrderTarget,
      answerText: data.answer_text,
      acceptableAnswers: data.acceptable_answers || [],
      validationMode: data.validation_mode === 'exact' || data.validation_mode === 'contains' || data.validation_mode === 'keywords'
        ? data.validation_mode
        : undefined,
      requiredKeywords: data.required_keywords || [],
      correct: data.correct || [],
      pairs: data.pairs,
      roleplay: data.roleplay || (String(data.type || '').toLowerCase() === 'roleplay' ? { mode: 'scenario' } : undefined),
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
