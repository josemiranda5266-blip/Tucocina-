import React from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { getAdConfig } from '../services/ads/adConfig';
import { useAdConsent } from '../context/AdConsentContext';

interface AdConsentBannerProps {
  onNavigate: (view: string, param?: string) => void;
}

export const AdConsentBanner: React.FC<AdConsentBannerProps> = ({ onNavigate }) => {
  const { choice, choose, settingsOpen, closeSettings } = useAdConsent();
  const config = getAdConfig();

  if (!config.enabled || config.provider !== 'adsterra') return null;
  if (choice !== 'unknown' && !settingsOpen) return null;

  const hasExistingChoice = choice !== 'unknown';

  return (
    <section
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-stone-300 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.16)] backdrop-blur-md"
      role="region"
      aria-label="Preferencias de publicidad"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-800"><Cookie className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="font-bold text-stone-900">Preferencias de publicidad</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-600">
              SaborClick utiliza Adsterra para mostrar anuncios. Si aceptás, se cargarán sus scripts y el proveedor o sus socios podrían utilizar cookies y tecnologías similares para entregar anuncios, medir resultados, limitar repeticiones y prevenir fraude. Si rechazás, no cargaremos los espacios publicitarios de Adsterra. Podés cambiar tu elección cuando quieras desde el pie de página.
            </p>
            <button type="button" onClick={() => onNavigate('legal', 'cookies')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
              <ShieldCheck className="h-3.5 w-3.5" /> Leer la política de cookies y privacidad
            </button>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {hasExistingChoice && <button type="button" onClick={closeSettings} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100">Cerrar</button>}
          <button type="button" onClick={() => choose('rejected')} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100">Rechazar</button>
          <button type="button" onClick={() => choose('accepted')} className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-800">Aceptar publicidad</button>
        </div>
      </div>
    </section>
  );
};
