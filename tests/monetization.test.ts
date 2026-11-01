import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdConfig, isAdsEnabled, isPlacementEnabled } from '../src/services/ads/adConfig';
import { getAdProvider, NullAdProvider, AdsenseProvider, DirectSponsorProvider, AdsterraProvider } from '../src/services/ads/AdProvider';
import { AdPlacement } from '../src/services/ads/adTypes';

test('1. Default ad configuration is strictly disabled', () => {
  const config = getAdConfig();
  assert.equal(config.enabled, false);
  assert.equal(config.provider, 'none');
  assert.equal(config.publisherId, undefined);
  assert.equal(isAdsEnabled(), false);
});

test('2. Every placement is disabled by default', () => {
  const placements: AdPlacement[] = [
    'HOME_TOP', 'HOME_MIDDLE', 'SEARCH_MIDDLE', 'CATEGORY_TOP',
    'CATEGORY_MIDDLE', 'VIDEO_BEFORE', 'VIDEO_AFTER', 'VIDEO_MIDDLE',
  ];
  for (const placement of placements) assert.equal(isPlacementEnabled(placement), false);
});

test('3. Null provider has no rendering side effects', async () => {
  const provider = getAdProvider('none');
  assert.equal(provider.name, 'none');
  await provider.init(getAdConfig());
  assert.equal(provider.renderSlot({ placement: 'HOME_TOP' }, getAdConfig()), null);
});

test('4. Unconfigured AdSense renders nothing', () => {
  const config = {
    enabled: true, provider: 'adsense' as const, publisherId: undefined,
    placements: { HOME_TOP: { enabled: true } } as any,
  };
  assert.equal(new AdsenseProvider().renderSlot({ placement: 'HOME_TOP' }, config), null);
});

test('5. Provider factory includes Adsterra without removing existing providers', () => {
  assert.ok(getAdProvider('direct_sponsor') instanceof DirectSponsorProvider);
  assert.ok(getAdProvider('adsense') instanceof AdsenseProvider);
  assert.ok(getAdProvider('none') instanceof NullAdProvider);
  assert.ok(getAdProvider('adsterra') instanceof AdsterraProvider);
});

test('6. Adsterra placements remain independently disabled by default', () => {
  const config = getAdConfig();
  assert.equal(config.placements.HOME_TOP.enabled, false);
  assert.equal(config.placements.HOME_MIDDLE.enabled, false);
  assert.equal(config.placements.VIDEO_BEFORE.enabled, false);
});

test('7. Adsterra provider returns a React slot only for enabled home placements', () => {
  const provider = new AdsterraProvider();
  const config = {
    enabled: true,
    provider: 'adsterra' as const,
    placements: {
      HOME_TOP: { enabled: true, format: 'rectangle' as const },
      HOME_MIDDLE: { enabled: false, format: 'native' as const },
      SEARCH_MIDDLE: { enabled: false },
      CATEGORY_TOP: { enabled: false },
      CATEGORY_MIDDLE: { enabled: false },
      VIDEO_BEFORE: { enabled: false },
      VIDEO_AFTER: { enabled: false },
      VIDEO_MIDDLE: { enabled: false },
    },
  };
  const rendered = provider.renderSlot({ placement: 'HOME_TOP' }, config);
  assert.ok(rendered);
  assert.equal((rendered as { type?: { name?: string } }).type?.name, 'AdsterraSlot');
  assert.equal(provider.renderSlot({ placement: 'HOME_MIDDLE' }, config), null);
  assert.equal(provider.renderSlot({ placement: 'VIDEO_BEFORE' }, config), null);
});
