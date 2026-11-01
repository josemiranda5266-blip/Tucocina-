export const AD_CONSENT_VERSION = '2026-11-01';
export const AD_CONSENT_STORAGE_KEY = 'saborclick.advertising-consent';

export type AdConsentChoice = 'unknown' | 'accepted' | 'rejected';
export type StoredAdConsentChoice = Exclude<AdConsentChoice, 'unknown'>;

export interface StoredAdConsent {
  version: string;
  choice: StoredAdConsentChoice;
  updatedAt: string;
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** Unknown, malformed, or outdated choices always fail closed. */
export function readAdConsent(storage: StorageLike | undefined = getBrowserStorage()): AdConsentChoice {
  if (!storage) return 'unknown';
  try {
    const raw = storage.getItem(AD_CONSENT_STORAGE_KEY);
    if (!raw) return 'unknown';
    const value = JSON.parse(raw) as Partial<StoredAdConsent>;
    if (value.version !== AD_CONSENT_VERSION) return 'unknown';
    if (value.choice !== 'accepted' && value.choice !== 'rejected') return 'unknown';
    return value.choice;
  } catch {
    return 'unknown';
  }
}

export function writeAdConsent(
  choice: StoredAdConsentChoice,
  storage: StorageLike | undefined = getBrowserStorage(),
  now: () => Date = () => new Date(),
): StoredAdConsent | null {
  if (!storage) return null;
  const record: StoredAdConsent = {
    version: AD_CONSENT_VERSION,
    choice,
    updatedAt: now().toISOString(),
  };
  try {
    storage.setItem(AD_CONSENT_STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

export function clearAdConsent(storage: StorageLike | undefined = getBrowserStorage()): void {
  try {
    storage?.removeItem?.(AD_CONSENT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable or restricted; the runtime remains fail-closed.
  }
}

/** Adsterra is the only provider currently backed by an external script. */
export function canLoadAdScripts(provider: string, choice: AdConsentChoice): boolean {
  return provider !== 'adsterra' || choice === 'accepted';
}
