import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ContentVerticalId, Video } from '../../types';
import { Sparkles, ShieldCheck, WandSparkles, LoaderCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface Suggestion {
  url: string;
  title?: string;
  description?: string;
  creatorName?: string;
  thumbnailUrl?: string;
  verticalId?: ContentVerticalId;
  categoryId?: string | null;
  categoryHint?: string;
  tags?: string[];
  error?: string;
  selected?: boolean;
}

export const AiVideoImportAssistant: React.FC<{ onImportSuccess?: () => void }> = ({ onImportSuccess }) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [urls, setUrls] = useState('');
  const [verticalId, setVerticalId] = useState<ContentVerticalId>('COCINA');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminVideoAiAssistStatus()
      .then((result) => setEnabled(result.enabled === true))
      .catch(() => setEnabled(false));
  }, []);

  const updateSuggestion = (index: number, updates: Partial<Suggestion>) => {
    setSuggestions((current) => current.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const prepareSuggestions = async () => {
    const list = [...new Set(urls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean))];
    if (!list.length) { setError('Pegá al menos un enlace, uno por línea.'); return; }
    if (list.length > 10) { setError('Para cuidar el costo y evitar demoras, procesá hasta 10 enlaces por tanda.'); return; }
    setLoading(true); setError(''); setMessage(''); setSuggestions([]);
    try {
      const result = await api.adminVideoAiAssistSuggest(list, verticalId);
      setSuggestions((result.suggestions || []).map((item: Suggestion) => ({ ...item, selected: !item.error })));
      setMessage('Sugerencias preparadas. Revisá y corregí los datos antes de importar.');
    } catch (err: any) {
      setError(err?.message || 'No se pudieron preparar las sugerencias.');
    } finally { setLoading(false); }
  };

  const importSelected = async () => {
    const selected = suggestions.filter((item) => item.selected && !item.error && item.title);
    if (!selected.length) { setError('Seleccioná al menos un video válido.'); return; }
    setImporting(true); setError(''); setMessage('');
    let imported = 0;
    const failures: string[] = [];
    for (const item of selected) {
      try {
        const video: Video = await api.adminImportVideo(item.url, verticalId);
        if (video.status === 'DUPLICATE') {
          failures.push(`Ya existía: ${item.title}`);
          continue;
        }
        const updates: Partial<Video> = {
          title: item.title!.trim(),
          description: (item.description || '').trim(),
          tags: (item.tags || []).slice(0, 8),
          status: 'DRAFT',
        };
        if (item.categoryId) updates.categoryId = item.categoryId;
        await api.adminUpdateVideo(video.id, updates);
        imported++;
      } catch (err: any) {
        failures.push(`${item.title}: ${err?.message || 'error al importar'}`);
      }
    }
    setImporting(false);
    setMessage(`Importados como borrador: ${imported} de ${selected.length}.${failures.length ? ' Revisá los errores indicados abajo.' : ''}`);
    if (failures.length) setError(failures.join(' · ').slice(0, 900));
    if (imported) onImportSuccess?.();
  };

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-800"><Sparkles className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold font-serif text-stone-900">Asistente privado de carga con IA</h2>
          <p className="mt-1 text-sm text-stone-600">Prepara títulos, descripciones y etiquetas para varios enlaces. Solo sugiere datos: no publica videos automáticamente.</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
      </div>

      {enabled === null ? (
        <p className="text-sm text-stone-500">Comprobando configuración del asistente…</p>
      ) : !enabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Función desactivada.</strong> Para probarla, configurá GEMINI_API_KEY en el servidor y establecé VIDEO_AI_IMPORT_ENABLED=true. Si la variable no está activa, el servidor rechaza las solicitudes.
        </div>
      ) : (
        <>
          <label className="block text-xs font-bold text-stone-700">Área de contenido
            <select value={verticalId} onChange={(e) => setVerticalId(e.target.value as ContentVerticalId)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 p-2.5 text-sm">
              <option value="COCINA">Cocina y pastelería</option>
              <option value="OFICIOS">Otros oficios y habilidades</option>
            </select>
          </label>
          <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={4} placeholder={'Pegá hasta 10 enlaces, uno por línea…'} className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 font-mono text-sm" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-stone-500">Máximo 10 enlaces por análisis · no se publica nada</span>
            <button type="button" onClick={prepareSuggestions} disabled={loading || importing} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {loading ? 'Analizando…' : 'Preparar sugerencias'}
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-3 border-t border-stone-200 pt-4">
              {suggestions.map((item, index) => (
                <article key={item.url} className="rounded-xl border border-stone-200 p-3 space-y-2">
                  {item.error ? <p className="text-sm text-rose-700">{item.url}: {item.error}</p> : (
                    <>
                      <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                        <input type="checkbox" checked={Boolean(item.selected)} onChange={(e) => updateSuggestion(index, { selected: e.target.checked })} />
                        Incluir este video
                      </label>
                      <p className="break-all text-xs text-stone-500">{item.url}</p>
                      <label className="block text-xs font-bold text-stone-700">Título
                        <input value={item.title || ''} onChange={(e) => updateSuggestion(index, { title: e.target.value })} maxLength={180} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" />
                      </label>
                      <label className="block text-xs font-bold text-stone-700">Descripción
                        <textarea value={item.description || ''} onChange={(e) => updateSuggestion(index, { description: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" />
                      </label>
                      <label className="block text-xs font-bold text-stone-700">Etiquetas (separadas por coma)
                        <input value={(item.tags || []).join(', ')} onChange={(e) => updateSuggestion(index, { tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) })} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" />
                      </label>
                      {item.categoryHint && <p className="text-xs text-stone-500">Categoría sugerida por IA: {item.categoryHint}</p>}
                    </>
                  )}
                </article>
              ))}
              <button type="button" onClick={importSelected} disabled={importing || loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {importing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {importing ? 'Importando borradores…' : 'Importar seleccionados como borradores'}
              </button>
            </div>
          )}
        </>
      )}
      {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="flex gap-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
    </section>
  );
};
