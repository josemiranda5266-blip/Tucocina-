import React, { useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { CURRENT_LEGAL_VERSION, useAuth } from '../context/AuthContext';

interface LegalConsentModalProps {
  onNavigate: (view: string, param?: string) => void;
}

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({ onNavigate }) => {
  const { acceptLegalTerms, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted || saving) return;
    setSaving(true);
    setError(null);
    try {
      await acceptLegalTerms();
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar la aceptación. Intentá nuevamente.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="legal-consent-title">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-amber-100 p-3 text-amber-800"><ShieldCheck className="w-6 h-6" /></div>
            <div>
              <h2 id="legal-consent-title" className="text-xl font-bold text-stone-900">Antes de continuar</h2>
              <p className="mt-1 text-sm text-stone-600">Actualizamos la información legal de CociFlash. Necesitamos registrar tu aceptación para continuar usando tu cuenta.</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-700 leading-relaxed">
            Versión legal <strong>{CURRENT_LEGAL_VERSION}</strong>. Podés leer los documentos completos antes de aceptar:
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onNavigate('legal', 'terms')} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-100">Términos <ExternalLink className="w-3 h-3" /></button>
              <button type="button" onClick={() => onNavigate('legal', 'privacy')} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-100">Privacidad <ExternalLink className="w-3 h-3" /></button>
              <button type="button" onClick={() => onNavigate('legal', 'cookies')} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-100">Cookies y analítica <ExternalLink className="w-3 h-3" /></button>
            </div>
          </div>

          <label className="mt-5 flex items-start gap-3 cursor-pointer text-sm text-stone-800">
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500" />
            <span>Acepto los <button type="button" onClick={() => onNavigate('legal', 'terms')} className="font-semibold text-amber-800 underline underline-offset-2">Términos de Uso</button> y confirmo haber leído la <button type="button" onClick={() => onNavigate('legal', 'privacy')} className="font-semibold text-amber-800 underline underline-offset-2">Política de Privacidad</button>.</span>
          </label>

          {error && <p className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button type="button" onClick={() => void signOut()} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100">Cerrar sesión</button>
            <button type="button" onClick={handleAccept} disabled={!accepted || saving} className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando...' : 'Aceptar y continuar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
