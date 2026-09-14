/**
 * Cooking Candidate Scorer
 * Pure function to compute a relevance score (0 - 100) for discovered cooking video candidates.
 */

import { ScoreBreakdown } from './ContentDiscoveryProvider';

export interface CandidateRawData {
  title: string;
  description: string;
  channelTitle: string;
  views: number;
  isEmbeddable: boolean;
  isSpanish: boolean;
  isCooking: boolean;
  youtubeCategoryId?: string;
}

export interface DiscoveryScoreResult {
  score: number;
  label: 'MUY RECOMENDADO' | 'REVISAR' | 'BAJA RELEVANCIA';
  breakdown: ScoreBreakdown;
}

export function scoreCookingVideoCandidate(data: CandidateRawData): DiscoveryScoreResult {
  const title = (data.title || '').toLowerCase();
  const desc = (data.description || '').toLowerCase();
  const channel = (data.channelTitle || '').toLowerCase();

  let titleScore = 0;
  if (/receta|recetas|cómo hacer|como hacer|paso a paso/i.test(title)) titleScore += 12;
  if (/pollo|carne|pasta|pizza|empanada|empanadas|torta|postre|pan|asado|guiso|salsa|ensalada|bizcochuelo|galletita|comida|locro|milanesa|almuerzo|cena|desayuno|arroz|papas|pescado|gourmet|casero/i.test(title)) titleScore += 8;
  titleScore = Math.min(20, titleScore);

  let descriptionScore = 0;
  if (/ingredientes|preparación|preparacion|receta|paso a paso|elaboración|cocinar|cocina|casero|carne|comida|postre/i.test(desc)) descriptionScore += 10;
  if (/horno|minutos|gramos|kilos|taza|cucharada|cocinar|sartén|sarten|ingredientes|paso a paso/i.test(desc)) descriptionScore += 5;
  descriptionScore = Math.min(15, descriptionScore);

  let channelScore = 0;
  if (/cocina|cocinando|recetas|chef|gourmet|gastronomía|gastronomia|food|bakery|pastelería|pasteleria|panadería/i.test(channel)) {
    channelScore = 15;
  } else if (/casero|casera|sabores|dulce|salado|sabor/i.test(channel)) {
    channelScore = 10;
  } else if (data.isCooking) {
    channelScore = 5;
  }

  let preparationScore = 0;
  const prepKeywords = ['receta', 'cocinar', 'paso a paso', 'ingredientes', 'preparación', 'cómo hacer', 'cómo preparar', 'modo de preparación', 'receta fácil', 'elaboración'];
  for (const kw of prepKeywords) {
    if (title.includes(kw) || desc.includes(kw)) {
      preparationScore += 5;
    }
  }
  preparationScore = Math.min(15, preparationScore);

  const spanishScore = data.isSpanish ? 10 : 0;

  // Category 26 in YouTube is "Howto & Style", Category 22 is "People & Blogs"
  let categoryScore = 0;
  if (data.youtubeCategoryId === '26') {
    categoryScore = 10; // Howto & Style
  } else if (data.youtubeCategoryId === '22') {
    categoryScore = 7; // People & Blogs
  } else if (data.isCooking) {
    categoryScore = 5;
  }

  const embeddableScore = data.isEmbeddable ? 5 : 0;

  let popularityScore = 0;
  if (data.views >= 500000) {
    popularityScore = 10;
  } else if (data.views >= 100000) {
    popularityScore = 9;
  } else if (data.views >= 50000) {
    popularityScore = 8;
  } else if (data.views >= 10000) {
    popularityScore = 7;
  } else if (data.views >= 5000) {
    popularityScore = 5;
  }

  const totalScore = Math.min(
    100,
    titleScore +
    descriptionScore +
    channelScore +
    preparationScore +
    spanishScore +
    categoryScore +
    embeddableScore +
    popularityScore
  );

  let label: 'MUY RECOMENDADO' | 'REVISAR' | 'BAJA RELEVANCIA';
  if (totalScore >= 80) {
    label = 'MUY RECOMENDADO';
  } else if (totalScore >= 60) {
    label = 'REVISAR';
  } else {
    label = 'BAJA RELEVANCIA';
  }

  return {
    score: totalScore,
    label,
    breakdown: {
      titleScore,
      descriptionScore,
      channelScore,
      preparationScore,
      spanishScore,
      categoryScore,
      embeddableScore,
      popularityScore,
    },
  };
}
