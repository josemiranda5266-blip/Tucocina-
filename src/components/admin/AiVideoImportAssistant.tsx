import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ContentVerticalId, Video } from '../../types';
import { Sparkles, ShieldCheck, LoaderCircle, AlertCircle } from 'lucide-react';

type Suggestion = { url: string; title?: string; description?: string; categoryId?: string | null; categoryHint?: string; tags?: string[]; error?: string; selected?: boolean };

export const AiVideoImportAssistant: React.FC<{ onImportSuccess?: () => void }> = ({ onImportSuccess }) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [urls, setUrls] = useState('');
  const [verticalId, setVerticalId] = useState<ContentVerticalId>('COCINA');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.adminVideoAiAssistStatus().then((r) => setEnabled(r.enabled === true)).catch(() => setEnabled(false)); }, []);
  const update = (index: number, patch: Partial<Suggestion>) => setItems((old) => old.map((item, i) => i === index ? { ...item, ...patch } : item));

  async function suggest() {
    const list = [...new Set(urls.split(/\r?\n/).map((u) => u.trim()).filter(Boolean))];
    if (!list.length || list.length > 10) { setError('Pegá entre 1 y 10 enlaces, uno por línea.'); return; }
    setBusy(true); setError(''); setMessage(''); setItems([]);
    try {
      const result = await api.adminVideoAiAssistSuggest(list, verticalId);
      setItems((result.suggestions || []).map((item: Suggestion) => ({ ...item, selected: !item.error })));
      setMessage('Revisá y corregí las sugerencias antes de importar. No se publica nada automáticamente.');
    } catch (e: any) { setError(e?.message || 'No se pudieron preparar las sugerencias.'); }
    finally { setBusy(false); }
  }

  async function importSelected() {
    const selected = items.filter((item) => item.selected && !item.error && item.title?.trim());
    if (!selected.length) { setError('Seleccioná al menos un video válido.'); return; }
    setBusy(true); setError(''); setMessage('');
    let count = 0; const errors: string[] = [];
    for (const item of selected) {
      try {
        const video: Video = await api.adminImportVideo(item.url, verticalId);
        if (video.status === 'DUPLICATE') { errors.push('Ya existía: ' + item.title); continue; }
        const updates: Partial<Video> = { title: item.title!.trim(), description: (item.description || '').trim(), tags: (item.tags || []).slice(0, 8), status: 'DRAFT' };
        if (item.categoryId) updates.categoryId = item.categoryId;
        await api.adminUpdateVideo(video.id, updates); count++;
      } catch (e: any) { errors.push((item.title || item.url) + ': ' + (e?.message || 'error')); }
    }
    setBusy(false); setMessage('Importados como borrador: ' + count + ' de ' + selected.length + '.');
    if (errors.length) setError(errors.join(' · ').slice(0, 900));
    if (count) onImportSuccess?.();
  }

  return <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm space-y-4">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-violet-100 p-2.5 text-violet-800"><Sparkles className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><h2 className="text-xl font-bold font-serif text-stone-900">Asistente privado de carga con IA</h2><p className="mt-1 text-sm text-stone-600">Sugiere títulos, descripciones y etiquetas para varios enlaces. Solo para administración; no publica automáticamente.</p></div>
      <ShieldCheck className="h-5 w-5 text-emerald-700" />
    </div>
    {enabled === null ? <p className="text-sm text-stone-500">Comprobando configuración…</p> : !enabled ?
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Función desactivada.</strong> Para probarla, configurá GEMINI_API_KEY en el servidor y VIDEO_AI_IMPORT_ENABLED=true. Si no está activada, el servidor rechaza las solicitudes.</div> :
      <>
        <label className="block text-xs font-bold text-stone-700">Área de contenido
          <select value={verticalId} onChange={(e) => setVerticalId(e.target.value as ContentVerticalId)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 p-2.5 text-sm"><option value="COCINA">Cocina y pastelería</option><option value="OFICIOS">Otros oficios y habilidades</option></select>
        </label>
        <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={4} placeholder="Pegá hasta 10 enlaces, uno por línea…" className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 font-mono text-sm" />
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-stone-500">Máximo 10 enlaces por análisis · no se publica nada</span><button type="button" onClick={suggest} disabled={busy} className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle className="inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 inline h-4 w-4" />}{busy ? 'Procesando…' : 'Preparar sugerencias'}</button></div>
        {items.length > 0 && <div className="space-y-3 border-t border-stone-200 pt-4">
          {items.map((item, i) => <article key={item.url} className="space-y-2 rounded-xl border border-stone-200 p-3">
            {item.error ? <p className="text-sm text-rose-700">{item.url}: {item.error}</p> : <>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(item.selected)} onChange={(e) => update(i, { selected: e.target.checked })} />Incluir este video</label>
              <p className="break-all text-xs text-stone-500">{item.url}</p>
              <label className="block text-xs font-bold">Título<input value={item.title || ''} onChange={(e) => update(i, { title: e.target.value })} maxLength={180} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
              <label className="block text-xs font-bold">Descripción<textarea value={item.description || ''} onChange={(e) => update(i, { description: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
              <label className="block text-xs font-bold">Etiquetas separadas por coma<input value={(item.tags || []).join(', ')} onChange={(e) => update(i, { tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) })} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
              {item.categoryHint && <p className="text-xs text-stone-500">Categoría sugerida: {item.categoryHint}</p>}
            </>}
          </article>)}
          <button type="button" onClick={importSelected} disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Importando borradores…' : 'Importar seleccionados como borradores'}</button>
        </div>}
      </>}
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="flex gap-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
  </section>;
};
