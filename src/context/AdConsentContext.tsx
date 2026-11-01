import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AdConsentChoice, StoredAdConsentChoice, readAdConsent, writeAdConsent } from '../services/ads/adConsent';

interface AdConsentContextValue {
  choice: AdConsentChoice;
  choose: (choice: StoredAdConsentChoice) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const AdConsentContext = createContext<AdConsentContextValue>({
  choice: 'unknown',
  choose: () => undefined,
  settingsOpen: false,
  openSettings: () => undefined,
  closeSettings: () => undefined,
});

export const AdConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [choice, setChoice] = useState<AdConsentChoice>(() => readAdConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const choose = useCallback((nextChoice: StoredAdConsentChoice) => {
    const stored = writeAdConsent(nextChoice);
    // If storage is blocked, do not enable advertising for this page session.
    setChoice(stored ? nextChoice : 'unknown');
    setSettingsOpen(false);
  }, []);

  const value = useMemo(() => ({
    choice,
    choose,
    settingsOpen,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
  }), [choice, choose, settingsOpen]);

  return <AdConsentContext.Provider value={value}>{children}</AdConsentContext.Provider>;
};

export function useAdConsent(): AdConsentContextValue {
  return useContext(AdConsentContext);
}
