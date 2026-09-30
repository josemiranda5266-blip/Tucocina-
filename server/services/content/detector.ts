import { ContentVerticalId, getContentVertical } from './verticals';

export interface ContentDetectionResult {
  verticalId: ContentVerticalId;
  isRelevant: boolean;
  matchedTerms: string[];
  matchedExclusions: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function detectContentVertical(input: { title: string; description?: string; creatorName?: string }, verticalId: ContentVerticalId): ContentDetectionResult {
  const vertical = getContentVertical(verticalId);
  const text = normalize(`${input.title} ${input.description || ''} ${input.creatorName || ''}`);
  const matchedTerms = vertical.positiveTerms.filter(term => text.includes(normalize(term)));
  const matchedExclusions = vertical.exclusionTerms.filter(term => text.includes(normalize(term)));
  const isRelevant = matchedTerms.length > 0 && !(matchedExclusions.length >= 2 && matchedTerms.length === 0);
  return { verticalId, isRelevant, matchedTerms, matchedExclusions };
}
