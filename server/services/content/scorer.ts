import { ContentVerticalId } from './verticals';

export interface GenericScoreBreakdown {
  titleScore: number; descriptionScore: number; channelScore: number; preparationScore: number;
  languageScore: number; categoryScore: number; embeddableScore: number; popularityScore: number;
}
export interface GenericScoreResult {
  score: number;
  label: 'MUY RECOMENDADO' | 'REVISAR' | 'BAJA RELEVANCIA';
  breakdown: GenericScoreBreakdown;
}

export function scoreContentCandidate(data: {
  title: string; description: string; channelTitle: string; views: number;
  isEmbeddable: boolean; isSpanish: boolean; isRelevant: boolean;
  categoryMatched: boolean; verticalId: ContentVerticalId;
}): GenericScoreResult {
  const title = data.title.toLowerCase();
  const desc = data.description.toLowerCase();
  const channel = data.channelTitle.toLowerCase();
  let titleScore = 0;
  if (/cómo hacer|como hacer|paso a paso|tutorial|reparar|instalar|receta/i.test(title)) titleScore += 12;
  if (data.isRelevant) titleScore += 8;
  titleScore = Math.min(20, titleScore);
  let descriptionScore = 0;
  if (/paso a paso|tutorial|herramientas|ingredientes|preparación|preparacion|reparar|instalar|fabricar/i.test(desc)) descriptionScore += 10;
  if (/minutos|medir|cortar|montar|cocinar|mantenimiento/i.test(desc)) descriptionScore += 5;
  descriptionScore = Math.min(15, descriptionScore);
  const channelScore = data.isRelevant || /oficio|electric|plomer|carpint|albañ|soldad|mecán|mecan|cocina|receta|chef|gourmet/i.test(channel) ? 15 : 0;
  let preparationScore = 0;
  for (const keyword of ['paso a paso','tutorial','cómo hacer','como hacer','cómo instalar','como instalar','cómo reparar','como reparar']) {
    if (title.includes(keyword) || desc.includes(keyword)) preparationScore += 5;
  }
  preparationScore = Math.min(15, preparationScore);
  const languageScore = data.isSpanish ? 10 : 0;
  const categoryScore = data.categoryMatched ? 10 : 5;
  const embeddableScore = data.isEmbeddable ? 5 : 0;
  let popularityScore = 0;
  if (data.views >= 500000) popularityScore = 10;
  else if (data.views >= 100000) popularityScore = 9;
  else if (data.views >= 50000) popularityScore = 8;
  else if (data.views >= 10000) popularityScore = 7;
  else if (data.views >= 5000) popularityScore = 5;
  const score = Math.min(100, titleScore + descriptionScore + channelScore + preparationScore + languageScore + categoryScore + embeddableScore + popularityScore);
  return { score, label: score >= 80 ? 'MUY RECOMENDADO' : score >= 60 ? 'REVISAR' : 'BAJA RELEVANCIA', breakdown: { titleScore, descriptionScore, channelScore, preparationScore, languageScore, categoryScore, embeddableScore, popularityScore } };
}
