import rawCurriculum from '../../curriculum-data.json';
import type { ExerciseType, Item, Lesson, Module } from '../types/domain';

type FlatCurriculum = {
  modules: Module[];
  lessons: Lesson[];
  items: Item[];
};

const MODULE_ORDER: string[] = [
  'bartending basics',
  'techniques & prep',
  'classics & remixes',
  'flavor logic & pairing',
  'batching & punches',
  'mocktails & zero-proof',
  'hosting & vibes',
  'mastery: spirits deep dive',
];

const normalizeModuleName = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const preferredChapterIndex = (module: { id?: string; title?: string }, fallback: number): number => {
  const normalizedTitle = normalizeModuleName(module.title);
  const normalizedId = normalizeModuleName(module.id);
  const byTitle = MODULE_ORDER.indexOf(normalizedTitle);
  if (byTitle >= 0) return byTitle + 1;

  // Handle likely slug/id variants.
  if (normalizedId.includes('bartending-basics')) return 1;
  if (normalizedId.includes('techniques-prep')) return 2;
  if (normalizedId.includes('classics-remix')) return 3;
  if (normalizedId.includes('flavor-logic')) return 4;
  if (normalizedId.includes('batching-punches')) return 5;
  if (normalizedId.includes('mocktails') || normalizedId.includes('zero-proof')) return 6;
  if (normalizedId.includes('hosting-vibes')) return 7;
  if (normalizedId.includes('spirits-pairing')) return 8;

  return fallback;
};

const normalizeType = (value: unknown): ExerciseType => {
  const t = String(value || 'mcq').toLowerCase();
  if (t === 'multiple_choice') return 'mcq';
  if (t === 'roleplay') return 'mcq';
  if (t === 'multi_select') return 'checkbox';
  if (t === 'short_answer') return 'short';
  if (t === 'ordering') return 'order';
  if (t === 'matching') return 'match';
  if (t === 'mcp') return 'mcq';
  if (t === 'mcq' || t === 'checkbox' || t === 'short' || t === 'order' || t === 'match') return t;
  return 'mcq';
};

const normalizeOrderTarget = (item: any): string[] => {
  const rawItems = Array.isArray(item?.items) ? item.items.map((v: unknown) => String(v)) : [];
  const sequenceCandidates = [
    item?.orderTarget,
    item?.expectedOrder,
    item?.correct_order,
    item?.correctOrder,
    item?.correct_sequence,
    item?.sequence,
    item?.correct,
  ];

  for (const sequence of sequenceCandidates) {
    if (!Array.isArray(sequence) || sequence.length === 0) continue;

    // Index-based sequence: map indexes -> items labels
    if (rawItems.length > 0 && sequence.every((v) => typeof v === 'number' || /^\d+$/.test(String(v)))) {
      const mapped = sequence
        .map((idx) => rawItems[Number(idx)])
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (mapped.length > 0) return mapped;
    }

    // Already label-based sequence
    const asLabels = sequence.map((v) => String(v)).filter(Boolean);
    if (asLabels.length > 0) return asLabels;
  }

  // Last fallback: use items as already-correct order if no explicit sequence exists.
  if (rawItems.length > 0) return rawItems;
  return [];
};

const normalizeFlat = (data: any): FlatCurriculum => {
  const modules: Module[] = (data.modules || []).map((module: any, index: number) => ({
    id: module.id,
    title: module.title,
    chapterIndex: preferredChapterIndex(module, Number(module.chapterIndex ?? index + 100)),
    description: module.description || module.title || '',
    prerequisiteIds: module.prerequisiteIds || [],
    estimatedMinutes: Number(module.estimatedMinutes ?? 10),
    tags: module.tags || [],
    lessonIds: module.lessonIds || [],
    brief: module.brief,
    whyItMatters: module.whyItMatters || module.why_it_matters,
    unlockReward: module.unlockReward || module.unlock_reward,
    bestFor: module.bestFor || module.best_for || [],
    contextBrief: module.contextBrief || module.context_brief,
    requiredTier: module.requiredTier || module.required_tier,
  }));

  const lessons: Lesson[] = (data.lessons || []).map((lesson: any) => ({
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    itemIds: lesson.itemIds || [],
    estimatedMinutes: Number(lesson.estimatedMinutes ?? 5),
    prerequisiteIds: lesson.prerequisiteIds || lesson.prereqs || [],
    prereqs: lesson.prereqs || [],
    types: lesson.types || [],
    description: lesson.description,
    xpReward: lesson.xpReward,
    tags: lesson.tags,
    brief: lesson.brief,
    practiceFocus: lesson.practiceFocus || lesson.practice_focus,
    commonMistake: lesson.commonMistake || lesson.common_mistake,
    showLessonBrief: lesson.showLessonBrief || lesson.show_lesson_brief,
    contextBrief: lesson.contextBrief || lesson.context_brief,
  }));

  const items: Item[] = (data.items || []).map((item: any) => ({
    id: item.id,
    type: normalizeType(item.type),
    prompt: item.prompt || '',
    options: item.options || [],
    answerIndex: typeof item.answerIndex === 'number' ? item.answerIndex : undefined,
    orderTarget: normalizeOrderTarget(item),
    answerText: item.answerText || item.expectedAnswer,
    acceptableAnswers: item.acceptableAnswers || [],
    validationMode: item.validationMode || item.validation_mode,
    requiredKeywords: item.requiredKeywords || item.required_keywords || [],
    correct: item.correct || [],
    pairs: item.pairs,
    roleplay: item.roleplay || (String(item.type || '').toLowerCase() === 'roleplay' ? { mode: 'scenario' } : undefined),
    tags: item.tags || [],
    conceptId: item.conceptId,
    difficulty: typeof item.difficulty === 'number' ? item.difficulty : 0.5,
    xpAward: item.xpAward || 10,
    reviewWeight: item.reviewWeight,
    insight: item.insight || item.explanation,
  }));

  return { modules, lessons, items };
};

const normalizeNested = (data: any): FlatCurriculum => {
  const modules: Module[] = [];
  const lessons: Lesson[] = [];
  const items: Item[] = [];

  (data.modules || []).forEach((module: any, moduleIndex: number) => {
    const moduleId = module.id || `module-${moduleIndex + 1}`;
    modules.push({
      id: moduleId,
      title: module.title || `Module ${moduleIndex + 1}`,
      chapterIndex: preferredChapterIndex(module, moduleIndex + 100),
      description: module.description || module.title || '',
      prerequisiteIds: module.prerequisiteIds || [],
      estimatedMinutes: Number(module.estimatedMinutes ?? 30),
      tags: module.tags || [],
      lessonIds: [],
      brief: module.brief,
      whyItMatters: module.whyItMatters || module.why_it_matters,
      unlockReward: module.unlockReward || module.unlock_reward,
      bestFor: module.bestFor || module.best_for || [],
      contextBrief: module.contextBrief || module.context_brief,
      requiredTier: module.requiredTier || module.required_tier,
    });

    (module.lessons || []).forEach((lesson: any, lessonIndex: number) => {
      const lessonId = lesson.id || `${moduleId}.lesson${lessonIndex + 1}`;
      const lessonItems = lesson.questions || [];
      const itemIds = lessonItems.map((q: any, qIndex: number) => q.id || `${lessonId}.q${qIndex + 1}`);
      const types = Array.from(new Set<ExerciseType>(lessonItems.map((q: any) => normalizeType(q.type))));

      lessons.push({
        id: lessonId,
        moduleId,
        title: lesson.title || `Lesson ${lessonIndex + 1}`,
        description: lesson.notes,
        itemIds,
        estimatedMinutes: Number(lesson.estimatedMinutes ?? Math.max(3, itemIds.length)),
        prerequisiteIds: lesson.prerequisiteIds || [],
        prereqs: lesson.prereqs || [],
        types,
        xpReward: lesson.xpReward,
        tags: lesson.tags || [],
        brief: lesson.brief,
        practiceFocus: lesson.practiceFocus || lesson.practice_focus,
        commonMistake: lesson.commonMistake || lesson.common_mistake,
        showLessonBrief: lesson.showLessonBrief || lesson.show_lesson_brief,
        contextBrief: lesson.contextBrief || lesson.context_brief,
      });

      lessonItems.forEach((question: any, questionIndex: number) => {
        const type = normalizeType(question.type);
        const questionId = question.id || `${lessonId}.q${questionIndex + 1}`;
        const answerIndex =
          typeof question.answerIndex === 'number'
            ? question.answerIndex
            : typeof question.correct === 'number'
              ? question.correct
              : undefined;

        items.push({
          id: questionId,
          type,
          prompt: question.prompt || '',
          options: question.options || [],
          answerIndex,
          orderTarget: normalizeOrderTarget(question),
          answerText: question.answerText || question.expectedAnswer,
          acceptableAnswers: question.acceptableAnswers || [],
          validationMode: question.validationMode || question.validation_mode,
          requiredKeywords: question.requiredKeywords || question.required_keywords || [],
          correct: Array.isArray(question.correct) ? question.correct : [],
          pairs: question.pairs,
          roleplay: question.roleplay || (String(question.type || '').toLowerCase() === 'roleplay' ? { mode: 'scenario' } : undefined),
          tags: question.tags || [],
          conceptId: question.conceptId,
          difficulty: typeof question.difficulty === 'number' ? question.difficulty : 0.5,
          xpAward: question.xpAward || 10,
          reviewWeight: question.reviewWeight,
          insight: question.insight || question.explanation,
        });
      });
    });
  });

  return { modules, lessons, items };
};

const source: any = rawCurriculum as any;
const isNestedShape =
  Array.isArray(source?.modules) &&
  source.modules.length > 0 &&
  Array.isArray(source.modules[0]?.lessons);

const normalized: FlatCurriculum = isNestedShape ? normalizeNested(source) : normalizeFlat(source);

normalized.modules.sort((a, b) => a.chapterIndex - b.chapterIndex);
normalized.modules.forEach((module) => {
  module.lessonIds = normalized.lessons
    .filter((lesson) => lesson.moduleId === module.id)
    .map((lesson) => lesson.id);
});

export const curriculumData: FlatCurriculum = normalized;
