import type { Item, ShortAnswerValidationMode } from '../types/domain';

type NormalizedShortAnswer = {
  answerText?: string;
  acceptableAnswers: string[];
  validationMode: ShortAnswerValidationMode;
  requiredKeywords: string[];
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

export const normalizeOrderTarget = (item: Partial<Item> & Record<string, unknown>): string[] => {
  const itemLabels = Array.isArray(item.orderTarget) ? item.orderTarget.map((v) => String(v)) : [];
  const optionLabels = Array.isArray(item.options) ? item.options.map((v) => String(v)) : [];
  const rawItems = Array.isArray(item.items) ? (item.items as unknown[]).map((v) => String(v)) : [];
  const labelsPool = rawItems.length > 0 ? rawItems : optionLabels.length > 0 ? optionLabels : itemLabels;
  const candidates = [
    item.orderTarget,
    item.expectedOrder,
    item.expected_order,
    item.correct_order,
    item.correctOrder,
    item.correct_sequence,
    item.sequence,
    item.correct,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;

    if (labelsPool.length > 0 && candidate.every((v) => typeof v === 'number' || /^\d+$/.test(String(v)))) {
      const mapped = candidate
        .map((v) => labelsPool[Number(v)])
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      if (mapped.length > 0) return mapped;
    }

    const labels = candidate.map((v) => String(v)).filter(Boolean);
    if (labels.length > 0 && labels.every((v) => /^\d+$/.test(v))) continue;
    if (labels.length > 0) return labels;
  }

  return labelsPool;
};

export const normalizeShortAnswer = (item: Partial<Item> & Record<string, unknown>): NormalizedShortAnswer => {
  const answerText = [item.answerText, item.expectedAnswer, item.correct_text]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => value.length > 0);

  const acceptableAnswers = [
    ...(Array.isArray(item.acceptableAnswers) ? item.acceptableAnswers : []),
    ...(Array.isArray(item.acceptable_answers) ? (item.acceptable_answers as string[]) : []),
  ]
    .map((value) => String(value).trim())
    .filter(Boolean);

  const requiredKeywords = Array.isArray(item.requiredKeywords)
    ? item.requiredKeywords.map((value) => String(value).trim()).filter(Boolean)
    : Array.isArray(item.required_keywords)
      ? (item.required_keywords as string[]).map((value) => String(value).trim()).filter(Boolean)
      : [];

  const validationMode = (() => {
    const raw = typeof item.validationMode === 'string'
      ? item.validationMode
      : typeof item.validation_mode === 'string'
        ? item.validation_mode
        : '';
    if (raw === 'contains' || raw === 'keywords' || raw === 'exact') return raw;
    if (requiredKeywords.length > 0) return 'keywords';
    return acceptableAnswers.length > 0 ? 'contains' : 'exact';
  })();

  return {
    answerText,
    acceptableAnswers,
    validationMode,
    requiredKeywords,
  };
};

export const isShortAnswerCorrect = (value: string, item: Partial<Item> & Record<string, unknown>): boolean => {
  const normalizedInput = normalizeText(value);
  if (!normalizedInput) return false;

  const { answerText, acceptableAnswers, validationMode, requiredKeywords } = normalizeShortAnswer(item);
  const normalizedAnswers = [answerText, ...acceptableAnswers]
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map(normalizeText);

  if (validationMode === 'keywords') {
    if (requiredKeywords.length === 0) return normalizedAnswers.includes(normalizedInput);
    return requiredKeywords.every((keyword) => normalizedInput.includes(normalizeText(keyword)));
  }

  if (validationMode === 'contains') {
    return normalizedAnswers.some((answer) => normalizedInput.includes(answer) || answer.includes(normalizedInput));
  }

  return normalizedAnswers.includes(normalizedInput);
};

export const getShortAnswerHint = (item: Partial<Item> & Record<string, unknown>): string => {
  const { answerText } = normalizeShortAnswer(item);
  if (!answerText) return '';

  const normalized = answerText.toLowerCase();
  const firstLetter = normalized.charAt(0).toUpperCase();
  return `${firstLetter}${'_'.repeat(Math.max(0, normalized.length - 1))}`;
};
