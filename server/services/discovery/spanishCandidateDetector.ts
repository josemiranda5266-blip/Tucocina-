/**
 * Spanish Candidate Detector
 * Deterministic heuristics to evaluate if video metadata indicates Spanish language content.
 */

const COMMON_SPANISH_WORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con',
  'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí',
  'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay',
  'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra',
  'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos',
  'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada',
  'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi',
  'paso', 'fácil', 'fáciles', 'receta', 'recetas', 'cocina', 'cocinar', 'preparar', 'ingredientes',
  'hacer', 'como', 'cómo', 'comida', 'casera', 'casero', 'rico', 'rica', 'delicioso', 'deliciosa',
]);

const SPANISH_CHARACTERS_REGEX = /[áéíóúñÁÉÍÓÚÑ]/;

const NON_SPANISH_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'this', 'that', 'how', 'to', 'make', 'easy', 'recipe',
  'recipes', 'cooking', 'food', 'kitchen', 'video', 'channel', 'subscribe', 'like', 'comment',
  'delicious', 'tasty', 'yummy', 'dinner', 'lunch', 'breakfast', 'chicken', 'beef', 'cake',
  'des', 'les', 'est', 'une', 'pour', 'avec', 'dans', 'sur', 'plus', 'und', 'mit', 'der', 'die', 'das',
]);

export function isSpanishCandidate(title: string, description: string = '', channelTitle: string = ''): boolean {
  const combinedText = `${title} ${description} ${channelTitle}`.toLowerCase();

  // 1. If accented Spanish characters exist, very high probability of Spanish
  if (SPANISH_CHARACTERS_REGEX.test(`${title} ${description} ${channelTitle}`)) {
    return true;
  }

  // Tokenize words
  const words = combinedText
    .replace(/[^\wáéíóúñÁÉÍÓÚÑ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  if (words.length === 0) return true; // fallback to soft allow if no words

  let spanishWordCount = 0;
  let nonSpanishWordCount = 0;

  for (const word of words) {
    if (COMMON_SPANISH_WORDS.has(word)) {
      spanishWordCount++;
    }
    if (NON_SPANISH_STOPWORDS.has(word)) {
      nonSpanishWordCount++;
    }
  }

  // If there are explicit Spanish words matching and not dominated by non-Spanish stopwords
  if (spanishWordCount > 0 && spanishWordCount >= nonSpanishWordCount) {
    return true;
  }

  // If title has common Spanish recipe keywords like "como hacer", "receta de", "paso a paso"
  const spanishPhrases = ['paso a paso', 'como hacer', 'cómo hacer', 'receta de', 'receta facil', 'receta fácil', 'comida casera', 'sin horno'];
  for (const phrase of spanishPhrases) {
    if (combinedText.includes(phrase)) {
      return true;
    }
  }

  // If non-Spanish word count is significantly higher, reject
  if (nonSpanishWordCount > spanishWordCount && nonSpanishWordCount >= 3) {
    return false;
  }

  // Default to true if ambiguous (YouTube relevanceLanguage=es handles primary filtering)
  return true;
}
