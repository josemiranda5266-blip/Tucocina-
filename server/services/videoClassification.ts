import { ContentVerticalId } from './content/verticals';
import { classifyContent } from './content/classifier';

export interface VideoClassification {
  verticalId: ContentVerticalId;
  categoryId?: string;
  categoryName?: string;
  tags: string[];
  confidence: number;
}

/**
 * Compatibility wrapper for the original cooking classifier.
 * The default remains COCINA so existing CociFlash behavior is preserved.
 * New callers can explicitly classify the OFICIOS vertical without duplicating rules.
 */
export function classifyVideo(input: { title?: string; description?: string; creatorName?: string }, verticalId: ContentVerticalId = 'COCINA'): VideoClassification {
  const result = classifyContent(input, verticalId);
  return {
    verticalId: result.verticalId,
    categoryId: result.categoryId,
    categoryName: result.categoryName,
    tags: result.tags,
    confidence: result.confidence,
  };
}
