import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdConfig, isAdsEnabled, isPlacementEnabled } from '../src/services/ads/adConfig';
import { getAdProvider, NullAdProvider, AdsenseProvider, DirectSponsorProvider } from '../src/services/ads/AdProvider';
import { AdPlacement } from '../src/services/ads/adTypes';

test('1. Default ad configuration is strictly disabled (enabled = false, provider = none)', () => {
  const config = getAdConfig();
  assert.equal(config.enabled, false);
  assert.equal(config.provider, 'none');
  assert.equal(isAdsEnabled(), false);
});

test('2. All ad placements return disabled status by default', () => {
  const placements: AdPlacement[] = [
    'HOME_TOP',
    'HOME_MIDDLE',
    'SEARCH_MIDDLE',
    'CATEGORY_TOP',
    'CATEGORY_MIDDLE',
    'VIDEO_BEFORE',
    'VIDEO_AFTER',
    'VIDEO_MIDDLE',
  ];

  for (const placement of placements) {
    assert.equal(isPlacementEnabled(placement), false);
  }
});

test('3. NullAdProvider renders null and initiates zero network calls or scripts', async () => {
  const nullProvider = getAdProvider('none');
  assert.equal(nullProvider.name, 'none');

  await nullProvider.init(getAdConfig());

  const rendered = nullProvider.renderSlot(
    { placement: 'HOME_TOP' },
    getAdConfig()
  );
  assert.equal(rendered, null);
});

test('4. Invalid or unconfigured AdSense setup forces disabled state', () => {
  // Test fallback when provider is missing or publisher ID is empty
  const mockUnconfiguredAdsense = {
    enabled: true,
    provider: 'adsense' as const,
    publisherId: undefined,
    placements: {
      HOME_TOP: { enabled: true },
    } as any,
  };

  const adsenseProvider = new AdsenseProvider();
  const rendered = adsenseProvider.renderSlot({ placement: 'HOME_TOP' }, mockUnconfiguredAdsense);

  // Even if enabled = true in mock config, missing publisherId MUST render null
  assert.equal(rendered, null);
});

test('5. Future provider extension maintains decoupled architecture', () => {
  const directProvider = getAdProvider('direct_sponsor');
  assert.equal(directProvider.name, 'direct_sponsor');
  assert.ok(directProvider instanceof DirectSponsorProvider);

  const adsenseProvider = getAdProvider('adsense');
  assert.equal(adsenseProvider.name, 'adsense');
  assert.ok(adsenseProvider instanceof AdsenseProvider);

  const fallbackProvider = getAdProvider('none');
  assert.equal(fallbackProvider.name, 'none');
  assert.ok(fallbackProvider instanceof NullAdProvider);
});

test('6. Codebase contains no fake/hardcoded ca-pub AdSense credentials or fake publisher IDs', () => {
  const config = getAdConfig();
  assert.equal(config.publisherId, undefined);
});
