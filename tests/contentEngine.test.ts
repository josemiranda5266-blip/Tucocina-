import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyContent } from '../server/services/content/classifier';
import { detectContentVertical } from '../server/services/content/detector';
import { getInvalidTagsForVertical } from '../server/services/content/verticals';

test('classifies cooking content without changing the cooking taxonomy', () => {
  const result = classifyContent({ title: 'Cómo hacer una torta de chocolate fácil' }, 'COCINA');
  assert.equal(result.verticalId, 'COCINA');
  assert.equal(result.categoryId, 'cat-postres');
  assert.ok(result.tags.includes('fácil') || result.tags.includes('facil'));
});

test('classifies trade content into the trades taxonomy', () => {
  const result = classifyContent({ title: 'Cómo cambiar un tomacorriente paso a paso' }, 'OFICIOS');
  assert.equal(result.verticalId, 'OFICIOS');
  assert.equal(result.categoryId, 'of-electricidad');
  assert.ok(result.confidence > 0);
});

test('detects a trade video independently from cooking', () => {
  const result = detectContentVertical({ title: 'Reparación de una canilla', description: 'Tutorial de plomería' }, 'OFICIOS');
  assert.equal(result.isRelevant, true);
  assert.ok(result.matchedTerms.length > 0);
});

test('does not classify an obvious trade video as cooking', () => {
  const result = classifyContent(
    { title: 'Cómo instalar un tomacorriente y revisar el disyuntor' },
    'COCINA',
  );
  assert.equal(result.confidence, 0);
  assert.equal(result.categoryId, undefined);
});

test('does not classify an obvious cooking video as a trade', () => {
  const result = classifyContent(
    { title: 'Receta de empanadas caseras paso a paso' },
    'OFICIOS',
  );
  assert.equal(result.confidence, 0);
  assert.equal(result.categoryId, undefined);
});

test('explicit media exclusions override generic vertical matches', () => {
  const result = detectContentVertical(
    { title: 'Tutorial de cocina - reaction y gameplay' },
    'COCINA',
  );
  assert.equal(result.isRelevant, false);
  assert.ok(result.matchedExclusions.length > 0);
});


test('rejects known cooking-only tags on trades', () => {
  assert.deepEqual(getInvalidTagsForVertical(['tutorial', 'herramientas'], 'OFICIOS'), []);
  assert.deepEqual(getInvalidTagsForVertical(['air fryer', 'sin gluten'], 'OFICIOS'), ['air fryer', 'sin gluten']);
});

test('rejects known trade-only tags on cooking', () => {
  assert.deepEqual(getInvalidTagsForVertical(['receta', 'tutorial', 'mantenimiento'], 'COCINA'), ['tutorial', 'mantenimiento']);
});
