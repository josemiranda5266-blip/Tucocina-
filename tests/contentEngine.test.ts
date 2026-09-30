import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyContent } from '../server/services/content/classifier';
import { detectContentVertical } from '../server/services/content/detector';

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
