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
  prompt: string;
  options: string[];
  answer_index: number | null;
  order_target: string[];
  answer_text: string | null;
  acceptable_answers: string[];
  correct: string[];
  pairs: any;
  roleplay: any;
  tags: string[];
  concept_id: string | null;
  difficulty: number | null;
  xp_award: number;
  review_weight: number | null;
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
    return {
      id: i.id,
      type: i.type as ExerciseType,
      prompt: i.prompt,
      options: i.options || [],
      answerIndex: i.answer_index,
      orderTarget: i.order_target || [],
      answerText: i.answer_text,
      acceptableAnswers: i.acceptable_answers || [],
      correct: i.correct || [],
      pairs: i.pairs,
      roleplay: i.roleplay,
      tags: i.tags || [],
      conceptId: i.concept_id,
      difficulty: i.difficulty,
      xpAward: i.xp_award || 10,
      reviewWeight: i.review_weight,
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
