import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { Category, ContentVerticalId, Video } from '../../types';
import { Search, XCircle, LoaderCircle, ShieldCheck, ExternalLink, WandSparkles } from 'lucide-react';

type Candidate = {
  url: string;
  title: string;
  description: string;
  creatorName?: string;
  thumbnailUrl?: string;
  categoryId: string;
  tags: string[];
  selected: boolean;
  rejected?: boolean;
  views?: number;
  durationSeconds?: number;
  scoreLabel?: string;
  error?: string;
};

export const TopicVideoCollector: React.FC<{ onImportSuccess?: () => void }> = ({ onImportSuccess }) => {
  const [topic, setTopic] = useState('');
  const [verticalId, setVerticalId] = useState<ContentVerticalId>('OFICIOS');
  const [limit, setLimit] = useState(20);
  const [minViews, setMinViews] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.adminVideoAiAssistStatus().then((result) => setAiEnabled(result.enabled === true)).catch(() => setAiEnabled(false));
  }, []);

  useEffect(() => {
    api.getCategories(verticalId).then(setCategories).catch(() => setCategories([]));
    setCandidates([]);
  }, [verticalId]);

  const activeCandidates = useMemo(() => candidates.filter((item) => !item.rejected), [candidates]);
  const selectedCount = activeCandidates.filter((item) => item.selected).length;

  function updateCandidate(index: number, patch: Partial<Candidate>) {
    setCandidates((old) => old.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function searchTopic() {
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 2) { setError('Escribí un tema de al menos 2 caracteres.'); return; }
    setBusy(true); setError(''); setNotice(''); setCandidates([]);
    try {
      const result = await api.adminDiscoverYoutubeCandidates({
        query: cleanTopic,
        limit,
        minViews,
        sortBy: 'score',
        verticalId,
      });
      if (!result.isConfigured) {
        setError(result.message || 'Falta configurar YOUTUBE_API_KEY en el servidor.');
        return;
      }
      const availableCategories = categories.length ? categories : await api.getCategories(verticalId).catch(() => []);
      setCategories(availableCategories);
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const normalizedTopic = normalize(cleanTopic);
      const topicCategory = availableCategories.find((category) => {
        const normalizedName = normalize(category.name);
        return normalizedName.length >= 4 && normalizedTopic.includes(normalizedName);
      });
      const rows: Candidate[] = (result.candidates || []).map((item: any) => ({
        url: item.originalUrl || `https://www.youtube.com/watch?v=${item.externalVideoId}`,
        title: item.title || 'Video sin título',
        description: item.description || '',
        creatorName: item.creatorName || '',
        thumbnailUrl: item.thumbnailUrl || '',
        categoryId: topicCategory?.id || item.suggestedCategory?.id || '',
        tags: Array.isArray(item.suggestedTags) ? item.suggestedTags : [],
        selected: true,
        views: Number(item.views || 0),
        durationSeconds: Number(item.durationSeconds || 0),
        scoreLabel: item.scoreLabel || '',
      }));
      setCandidates(rows);
      setNotice(rows.length ? `Encontré ${rows.length} candidatos. Revisá, editá o rechazá los que no sirvan.` : 'No se encontraron candidatos con esos filtros. Probá otro tema o bajá el mínimo de vistas.');
    } catch (e: any) {
      setError(e?.message || 'No se pudo buscar en YouTube.');
    } finally {
      setBusy(false);
    }
  }

  async function improveWithAi() {
    const selected = activeCandidates.filter((item) => item.selected);
    if (!selected.length) { setError('Seleccioná al menos un candidato para mejorar con IA.'); return; }
    if (selected.length > 10) { setError('La IA procesa hasta 10 videos por tanda. Seleccioná 10 o menos.'); return; }
    if (!aiEnabled) { setError('La asistencia de IA está desactivada en el servidor. Podés revisar e importar usando la clasificación automática existente.'); return; }
    setAiBusy(true); setError(''); setNotice('');
    try {
      const result = await api.adminVideoAiAssistSuggest(selected.map((item) => item.url), verticalId);
      const suggestions = new Map<string, any>((result.suggestions || []).map((item: any) => [item.url, item]));
      setCandidates((old) => old.map((item) => {
        const suggestion = suggestions.get(item.url);
        if (!suggestion || suggestion.error) return item;
        return {
          ...item,
          title: suggestion.title || item.title,
          description: suggestion.description ?? item.description,
          tags: suggestion.tags || item.tags,
          categoryId: suggestion.categoryId || item.categoryId,
        };
      }));
      setNotice('Sugerencias de IA aplicadas a los candidatos seleccionados. Podés corregirlas antes de importar.');
    } catch (e: any) {
      setError(e?.message || 'No se pudieron mejorar los candidatos con IA.');
    } finally {
      setAiBusy(false);
    }
  }

  async function importSelected() {
    const selected = activeCandidates.filter((item) => item.selected);
    if (!selected.length) { setError('Seleccioná al menos un video para incorporar.'); return; }
    setImportBusy(true); setError(''); setNotice('');
    let importedCount = 0;
    let duplicateCount = 0;
    const failures: string[] = [];
    for (const item of selected) {
      try {
        const result = await api.adminImportVideoDetailed(item.url, verticalId);
        if (result.isDuplicate) { duplicateCount++; continue; }
        const updates: Partial<Video> = {
          title: item.title.trim().slice(0, 180),
          description: item.description.trim().slice(0, 1500),
          tags: item.tags.slice(0, 8),
          status: 'PUBLISHED',
        };
        if (item.categoryId) updates.categoryId = item.categoryId;
        await api.adminUpdateVideo(result.video.id, updates);
        importedCount++;
        setCandidates((old) => old.map((row) => row.url === item.url ? { ...row, selected: false } : row));
      } catch (e: any) {
        failures.push(`${item.title}: ${e?.message || 'error al importar'}`);
      }
    }
    setImportBusy(false);
    setNotice(`Publicados en el catálogo: ${importedCount}. Duplicados omitidos: ${duplicateCount}.${failures.length ? ` Errores: ${failures.length}.` : ''}`);
    if (failures.length) setError(failures.slice(0, 3).join(' · ').slice(0, 700));
    if (importedCount) onImportSuccess?.();
  }

  return (
    <section className="mb-8 space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><Search className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold font-serif text-stone-900">Recolector automático por tema</h2>
          <p className="mt-1 text-sm text-stone-600">Escribí un tema y recopilá videos de YouTube. Revisá, modificá o rechazá cada candidato; los videos que apruebes se publican en la categoría elegida.</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-700" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs font-bold text-stone-700">Tema a buscar
          <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void searchTopic(); }} maxLength={100} placeholder="Ej.: electricidad domiciliaria" className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm font-normal" />
        </label>
        <label className="text-xs font-bold text-stone-700">Área de contenido
          <select value={verticalId} onChange={(e) => setVerticalId(e.target.value as ContentVerticalId)} className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm font-normal">
            <option value="COCINA">Cocina y pastelería</option><option value="OFICIOS">Otros oficios y habilidades</option>
          </select>
        </label>
        <label className="text-xs font-bold text-stone-700">Cantidad de resultados
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm font-normal">
            <option value={10}>10 videos</option><option value={20}>20 videos</option><option value={30}>30 videos</option>
          </select>
        </label>
        <label className="text-xs font-bold text-stone-700">Vistas mínimas
          <select value={minViews} onChange={(e) => setMinViews(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm font-normal">
            <option value={0}>Sin mínimo</option><option value={1000}>1.000 vistas</option><option value={5000}>5.000 vistas</option><option value={10000}>10.000 vistas</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={searchTopic} disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Buscando...</> : <><Search className="mr-2 inline h-4 w-4" />Buscar videos</>}
        </button>
        <button type="button" onClick={improveWithAi} disabled={aiBusy || busy || !activeCandidates.length} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 disabled:opacity-50">
          {aiBusy ? <><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Analizando...</> : <><WandSparkles className="mr-2 inline h-4 w-4" />Mejorar selección con IA (máx. 10)</>}
        </button>
        <button type="button" onClick={importSelected} disabled={importBusy || busy || !selectedCount} className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {importBusy ? 'Guardando borradores...' : `Aprobar y publicar (${selectedCount})`}
        </button>
      </div>
      <p className="text-xs text-stone-500">La búsqueda usa la API oficial de YouTube configurada en el servidor. La IA es opcional y procesa hasta 10 videos por tanda. Solo se publican los videos que selecciones y confirmes con «Aprobar y publicar».</p>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {activeCandidates.length > 0 && <div className="space-y-3 border-t border-stone-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-stone-800">{activeCandidates.length} candidatos · {selectedCount} seleccionados</p>
          <button type="button" onClick={() => setCandidates((old) => old.map((item) => ({ ...item, selected: !item.rejected })))} className="text-xs font-semibold text-emerald-800 underline">Seleccionar todos</button>
        </div>
        {activeCandidates.map((item) => {
          const index = candidates.findIndex((row) => row.url === item.url);
          return <article key={item.url} className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 p-3 md:grid-cols-[120px_minmax(0,1fr)]">
            {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-24 w-full rounded-lg bg-stone-100 object-cover md:w-[120px]" /> : <div className="flex h-24 items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400 md:w-[120px]">Sin miniatura</div>}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-stone-800"><input type="checkbox" checked={item.selected} onChange={(e) => updateCandidate(index, { selected: e.target.checked })} /> Aprobar candidato</label>
                <div className="flex items-center gap-3 text-xs text-stone-500">{item.views !== undefined && <span>{item.views.toLocaleString('es-AR')} vistas</span>}<a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">Ver en YouTube <ExternalLink className="h-3 w-3" /></a></div>
              </div>
              <label className="block text-xs font-bold text-stone-700">Título<input value={item.title} onChange={(e) => updateCandidate(index, { title: e.target.value })} maxLength={180} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" /></label>
              <label className="block text-xs font-bold text-stone-700">Descripción<textarea value={item.description} onChange={(e) => updateCandidate(index, { description: e.target.value })} rows={2} maxLength={1500} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" /></label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="block text-xs font-bold text-stone-700">Categoría<select value={item.categoryId} onChange={(e) => updateCandidate(index, { categoryId: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal"><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="block text-xs font-bold text-stone-700">Etiquetas separadas por coma<input value={item.tags.join(', ')} onChange={(e) => updateCandidate(index, { tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) })} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" /></label>
              </div>
              {item.scoreLabel && <p className="text-xs text-stone-500">Relevancia: {item.scoreLabel}{item.creatorName ? ` · Canal: ${item.creatorName}` : ''}</p>}
              <button type="button" onClick={() => updateCandidate(index, { rejected: true, selected: false })} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"><XCircle className="h-4 w-4" /> Rechazar</button>
            </div>
          </article>;
        })}
      </div>}
    </section>
  );
};
