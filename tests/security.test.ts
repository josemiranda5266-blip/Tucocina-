import assert from 'node:assert/strict';
import test from 'node:test';
import { validateExternalUrl } from '../server/security/ssrf';
import { getSafeEmbedUrl, getSafeOriginalUrl } from '../src/utils/safeVideoUrls';

test('SSRF guard accepts supported HTTPS hosts', () => {
  assert.equal(validateExternalUrl('https://www.youtube.com/watch?v=abcdefghijk').valid, true);
  assert.equal(validateExternalUrl('https://www.instagram.com/reel/ABC123/').valid, true);
  assert.equal(validateExternalUrl('https://www.tiktok.com/@creator/video/123456789').valid, true);
});

test('SSRF guard rejects unsupported protocols and hosts', () => {
  assert.equal(validateExternalUrl('http://www.youtube.com/watch?v=abcdefghijk').valid, false);
  assert.equal(validateExternalUrl('https://evil.example.com/video').valid, false);
  assert.equal(validateExternalUrl('https://www.youtube.com.evil.example/video').valid, false);
  assert.equal(validateExternalUrl('https://127.0.0.1/video').valid, false);
});

test('frontend URL guard only accepts safe original URLs', () => {
  assert.ok(getSafeOriginalUrl('https://www.youtube.com/watch?v=abcdefghijk'));
  assert.equal(getSafeOriginalUrl('javascript:alert(1)'), null);
  assert.equal(getSafeOriginalUrl('https://evil.example.com/video'), null);
});

test('frontend URL guard validates embed route by platform', () => {
  assert.ok(getSafeEmbedUrl('https://www.youtube-nocookie.com/embed/abcdefghijk', 'YOUTUBE'));
  assert.equal(getSafeEmbedUrl('https://www.youtube-nocookie.com/watch?v=abcdefghijk', 'YOUTUBE'), null);
  assert.ok(getSafeEmbedUrl('https://www.instagram.com/reel/ABC123/embed', 'INSTAGRAM'));
  assert.equal(getSafeEmbedUrl('https://www.tiktok.com/video/123456789', 'TIKTOK'), null);
});
