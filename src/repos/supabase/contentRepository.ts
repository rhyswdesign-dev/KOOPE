/**
 * Supabase Content Repository
 * Fetches curriculum data from Supabase database
 */

import { ContentRepository } from '../interfaces';
import { Module, Lesson, Item, ExerciseType } from '../../types/domain';
import { supabase } from '../../lib/supabase';
import { log } from '../../lib/logger';

interface SupabaseModule {
  id: string;
  title: string;
  chapter_index: number;
  description: string | null;
  prerequisite_ids: string[];
  estimated_minutes: number | null;
  tags: string[];
}

interface SupabaseLesson {
  id: string;
  module_id: string;
  title: string;
  item_ids: string[];
  estimated_minutes: number | null;
  prerequisite_ids: string[];
  types: string[];
}

interface SupabaseItem {
  id: string;
  type: string;
  prompt?: string | null;
  question?: string | null;
  stem?: string | null;
  options: string[];
  answer_index: number | null;
  order_target: string[] | null;
  expected_order?: string[] | null;
  correct_order?: string[] | null;
  items?: string[] | null;
  sequence?: string[] | null;
  answer_text: string | null;
  acceptable_answers: string[];
  validation_mode?: string | null;
  required_keywords?: string[] | null;
  correct: string[];
  pairs: any;
  roleplay: any;
  tags: string[];
  concept_id: string | null;
  difficulty: number | null;
  xp_award: number;
  review_weight: number | null;
}

const normalizeExerciseType = (value: unknown): ExerciseType => {
  const t = String(value || 'mcq').toLowerCase();
  if (t === 'multiple_choice' || t === 'mcp' || t === 'roleplay') return 'mcq';
  if (t === 'multi_select') return 'checkbox';
  if (t === 'short_answer') return 'short';
  if (t === 'ordering') return 'order';
  if (t === 'matching') return 'match';
  if (t === 'mcq' || t === 'checkbox' || t === 'short' || t === 'order' || t === 'match') return t;
  return 'mcq';
};

const fallbackPromptByType: Record<ExerciseType, string> = {
  mcq: 'Choose the best answer.',
  checkbox: 'Select all correct options.',
  order: 'Place the process in order.',
  match: 'Match each item to the best pair.',
  short: 'Enter your answer.',
};

function resolvePrompt(raw: SupabaseItem): string {
  const candidate = [raw.prompt, raw.question, raw.stem]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find((v) => v.length > 0);
  if (candidate) return candidate;
  return fallbackPromptByType[normalizeExerciseType(raw.type)];
}

function normalizeOrderTargetFromRaw(raw: SupabaseItem): string[] {
  const itemLabels = Array.isArray(raw.items) ? raw.items.map((v) => String(v)) : [];
  const optionLabels = Array.isArray(raw.options) ? raw.options.map((v) => String(v)) : [];
  const labelsPool = itemLabels.length > 0 ? itemLabels : optionLabels;
  const candidates = [
    raw.order_target,
    raw.expected_order,
    raw.correct_order,
    raw.sequence,
    raw.correct,
  ];
  for (const value of candidates) {
    if (!Array.isArray(value) || value.length === 0) continue;

    // Convert index-based order arrays like [0,1,2,3] into actual labels.
    if (labelsPool.length > 0 && value.every((v) => typeof v === 'number' || /^\d+$/.test(String(v)))) {
      const mapped = value
        .map((v) => labelsPool[Number(v)])
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (mapped.length > 0) return mapped;
    }

    const labels = value.map((v) => String(v)).filter(Boolean);
    // Skip invalid numeric-only labels when we cannot map them to items.
    if (labels.length > 0 && labels.every((v) => /^\d+$/.test(v))) continue;
    if (labels.length > 0) return labels;
  }
  if (labelsPool.length > 0) return labelsPool;
  return [];
}

export class SupabaseContentRepository implements ContentRepository {
  private moduleCache: Map<string, Module> = new Map();
  private lessonCache: Map<string, Lesson> = new Map();
  private itemCache: Map<string, Item> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastFetch: number = 0;

  constructor() {
    log.info('SupabaseContentRepository', 'Repository initialized');
  }

  private async ensureCacheLoaded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < this.cacheExpiry && this.moduleCache.size > 0) {
      return; // Cache is still valid
    }

    log.info('SupabaseContentRepository', 'Loading curriculum data from Supabase');
    await this.loadAllData();
    this.lastFetch = now;
  }

  private async loadAllData(): Promise<void> {
    try {
      // Load modules
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .order('chapter_index');

      if (modulesError) throw modulesError;

      // Load lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*');

      if (lessonsError) throw lessonsError;

      // Load items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*');

      if (itemsError) throw itemsError;

      // Cache modules
      this.moduleCache.clear();
      (modules || []).forEach((m: SupabaseModule) => {
        this.moduleCache.set(m.id, this.mapSupabaseModule(m));
      });

      // Cache lessons
      this.lessonCache.clear();
      (lessons || []).forEach((l: SupabaseLesson) => {
        this.lessonCache.set(l.id, this.mapSupabaseLesson(l));
      });

      // Cache items
      this.itemCache.clear();
      (items || []).forEach((i: SupabaseItem) => {
        this.itemCache.set(i.id, this.mapSupabaseItem(i));
      });

      log.info('SupabaseContentRepository', 'Curriculum data loaded successfully', {
        modules: this.moduleCache.size,
        lessons: this.lessonCache.size,
        items: this.itemCache.size
      });
    } catch (error) {
      log.error('SupabaseContentRepository', 'Error loading curriculum data from Supabase', error);
      throw error;
    }
  }

  private mapSupabaseModule(m: SupabaseModule): Module {
    return {
      id: m.id,
      title: m.title,
      chapterIndex: m.chapter_index,
      description: m.description || m.title,
      prerequisiteIds: m.prerequisite_ids || [],
      estimatedMinutes: m.estimated_minutes || 0,
      tags: m.tags || [],
    };
  }

  private mapSupabaseLesson(l: SupabaseLesson): Lesson {
    return {
      id: l.id,
      moduleId: l.module_id,
      title: l.title,
      itemIds: l.item_ids || [],
      estimatedMinutes: l.estimated_minutes || 0,
      prerequisiteIds: l.prerequisite_ids || [],
      types: l.types as ExerciseType[],
    };
  }

  private mapSupabaseItem(i: SupabaseItem): Item {
    const normalizedType = normalizeExerciseType(i.type);
    const normalizedAnswerIndex =
      typeof i.answer_index === 'number'
        ? i.answer_index
        : typeof (i as any).correct === 'number'
          ? (i as any).correct
          : undefined;

    return {
      id: i.id,
      type: normalizedType,
      prompt: resolvePrompt(i),
      options: i.options || [],
      answerIndex: normalizedAnswerIndex,
      orderTarget: normalizeOrderTargetFromRaw(i),
      answerText: i.answer_text ?? undefined,
      acceptableAnswers: i.acceptable_answers || [],
      validationMode: i.validation_mode === 'exact' || i.validation_mode === 'contains' || i.validation_mode === 'keywords'
        ? i.validation_mode
        : undefined,
      requiredKeywords: i.required_keywords || [],
      correct: i.correct || [],
      pairs: i.pairs,
      roleplay: i.roleplay || (String(i.type || '').toLowerCase() === 'roleplay' ? { mode: 'scenario' } : undefined),
      tags: i.tags || [],
      conceptId: i.concept_id ?? undefined,
      difficulty: i.difficulty ?? 0.5,
      xpAward: i.xp_award || 10,
      reviewWeight: i.review_weight ?? undefined,
    };
  }

  async getModule(id: string): Promise<Module | null> {
    await this.ensureCacheLoaded();
    return this.moduleCache.get(id) || null;
  }

  async getLesson(id: string): Promise<Lesson | null> {
    await this.ensureCacheLoaded();
    return this.lessonCache.get(id) || null;
  }

  async getItem(id: string): Promise<Item | null> {
    await this.ensureCacheLoaded();
    return this.itemCache.get(id) || null;
  }

  async getItemsForLesson(lessonId: string): Promise<Item[]> {
    await this.ensureCacheLoaded();
    const lesson = this.lessonCache.get(lessonId);
    if (!lesson) {
      log.warn('SupabaseContentRepository', 'No lesson found', { lessonId });
      return [];
    }

    const items = lesson.itemIds
      .map(id => this.itemCache.get(id))
      .filter((item): item is Item => item !== undefined);

    return items;
  }

  async listModules(): Promise<Module[]> {
    await this.ensureCacheLoaded();
    return Array.from(this.moduleCache.values()).sort((a, b) => a.chapterIndex - b.chapterIndex);
  }

  async getModulesByChapter(chapterIndex: number): Promise<Module[]> {
    await this.ensureCacheLoaded();
    return Array.from(this.moduleCache.values())
      .filter(module => module.chapterIndex === chapterIndex)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  // Method to clear cache (useful for testing or forced refresh)
  clearCache(): void {
    this.moduleCache.clear();
    this.lessonCache.clear();
    this.itemCache.clear();
    this.lastFetch = 0;
  }
}
