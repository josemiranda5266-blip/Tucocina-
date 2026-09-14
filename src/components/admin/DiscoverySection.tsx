import React, { useState } from 'react';
import { api } from '../../services/api';
import { VideoPlayer } from '../VideoPlayer';
import { Video } from '../../types';
import {
  Search,
  Sparkles,
  Play,
  Download,
  CheckSquare,
  Square,
  AlertCircle,
  Eye,
  Clock,
  Calendar,
  Check,
  RotateCw,
  ExternalLink,
  X,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface DiscoveryCandidate {
  externalVideoId: string;
  platform: 'YOUTUBE';
  originalUrl: string;
  embedUrl: string;
  title: string;
  description: string;
  creatorName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  publishedAt: string;
  views: number;
  score: number;
  scoreLabel: 'MUY RECOMENDADO' | 'REVISAR' | 'BAJA RELEVANCIA';
  suggestedCategory: { id: string; name: string };
  suggestedTags: string[];
  isEmbeddable: boolean;
  isSpanish: boolean;
  isCooking: boolean;
}

interface DiscoverySectionProps {
  onImportSuccess?: (importedCount: number) => void;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M vistas`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}k vistas`;
  return `${views} vistas`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Video';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoStr;
  }
}

export const DiscoverySection: React.FC<DiscoverySectionProps> = ({ onImportSuccess }) => {
  const [query, setQuery] = useState('recetas fáciles');
  const [limit, setLimit] = useState(15);
  const [minViews, setMinViews] = useState(5000);
  const [sortBy, setSortBy] = useState<'score' | 'views' | 'date' | 'relevance'>('score');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [totalFound, setTotalFound] = useState(0);

  // Selection state
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [importingSingleId, setImportingSingleId] = useState<string | null>(null);
  const [importingBatch, setImportingBatch] = useState(false);
  const [importedVideoIds, setImportedVideoIds] = useState<Set<string>>(new Set());

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);

  // Video preview modal
  const [previewCandidate, setPreviewCandidate] = useState<DiscoveryCandidate | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSelectedVideoIds(new Set());
    try {
      const result = await api.adminDiscoverYoutubeCandidates({
        query: query.trim() || 'recetas fáciles',
        limit,
        minViews,
        sortBy,
      });

      setIsConfigured(result.isConfigured);

      if (!result.isConfigured) {
        setError(result.message || 'Clave YOUTUBE_API_KEY no configurada en las variables de entorno del servidor.');
        setCandidates([]);
        setTotalFound(0);
      } else {
        setCandidates(result.candidates || []);
        setTotalFound(result.totalFound || 0);
        if ((result.candidates || []).length === 0) {
          showToast('No se encontraron candidatos que superen el filtro de 5.000 vistas.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error al buscar videos candidatos en YouTube.');
      setCandidates([]);
      setTotalFound(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectCandidate = (id: string) => {
    const next = new Set(selectedVideoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedVideoIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedVideoIds.size === candidates.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(candidates.map((c) => c.externalVideoId)));
    }
  };

  const handleImportSingle = async (candidate: DiscoveryCandidate) => {
    setImportingSingleId(candidate.externalVideoId);
    try {
      await api.adminImportDiscoveryCandidate(
        candidate.externalVideoId,
        candidate.suggestedCategory.id,
        candidate.suggestedTags
      );
      setImportedVideoIds((prev) => new Set(prev).add(candidate.externalVideoId));
      showToast(`¡Video "${candidate.title.slice(0, 35)}..." importado a Borrador (DRAFT)!`);
      if (onImportSuccess) onImportSuccess(1);
    } catch (err: any) {
      showToast(`Error al importar: ${err?.message || 'Error desconocido'}`);
    } finally {
      setImportingSingleId(null);
    }
  };

  const handleImportBatch = async () => {
    const idsToImport: string[] = [...selectedVideoIds].filter((id) => !importedVideoIds.has(id));
    if (idsToImport.length === 0) {
      showToast('No hay videos nuevos seleccionados para importar.');
      return;
    }

    setImportingBatch(true);
    try {
      const items: Array<{ videoId: string; categoryId?: string; tags?: string[] }> = idsToImport.map((id: string) => {
        const cand = candidates.find((c) => c.externalVideoId === id);
        return {
          videoId: id,
          categoryId: cand?.suggestedCategory.id,
          tags: cand?.suggestedTags,
        };
      });

      const res = await api.adminImportDiscoveryBatch(items);
      const newlyImported = new Set(importedVideoIds);
      res.results.forEach((r) => {
        if (r.status === 'IMPORTED' || r.status === 'DUPLICATE') {
          newlyImported.add(r.videoId);
        }
      });
      setImportedVideoIds(newlyImported);
      setSelectedVideoIds(new Set());

      showToast(res.message || `Lote procesado: ${res.importedCount} importados correctamente.`);
      if (onImportSuccess && res.importedCount > 0) onImportSuccess(res.importedCount);
    } catch (err: any) {
      showToast(`Error en la importación en lote: ${err?.message || 'Error'}`);
    } finally {
      setImportingBatch(false);
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl mb-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-stone-100 tracking-tight">DESCUBRIR VIDEOS DE COCINA</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Búsqueda automática en la API oficial de YouTube. Encuentra candidatos relevantes en español con +5.000 vistas.
          </p>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-orange-900/30 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin" />
              <span>Buscando en YouTube...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>🔎 BUSCAR VIDEOS DE COCINA</span>
            </>
          )}
        </button>
      </div>

      {/* Controls / Filter Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-2">
        <div>
          <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Término o Plato
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: recetas fáciles, empanadas, asado..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Cantidad de Resultados
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value={10}>10 candidatos</option>
            <option value={15}>15 candidatos</option>
            <option value={20}>20 candidatos</option>
            <option value={30}>30 candidatos</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Ordenar candidatos por
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="score">Puntuación / Score</option>
            <option value="views">Más Vistos</option>
            <option value="date">Más Recientes</option>
            <option value="relevance">Relevancia YouTube</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Mínimo de Visualizaciones
          </label>
          <select
            value={minViews}
            onChange={(e) => setMinViews(Number(e.target.value))}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value={5000}>Mínimo 5.000 vistas</option>
            <option value={10000}>Mínimo 10.000 vistas</option>
            <option value={50000}>Mínimo 50.000 vistas</option>
            <option value={100000}>Mínimo 100.000 vistas</option>
          </select>
        </div>
      </div>

      {/* Unconfigured state warning */}
      {isConfigured === false && (
        <div className="mt-5 p-4 bg-amber-950/50 border border-amber-800/80 rounded-xl flex items-start space-x-3 text-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-100">Configuración requerida en el Servidor:</p>
            <p className="mt-1 text-xs text-amber-300">
              La variable de entorno <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-100">YOUTUBE_API_KEY</code> no está configurada. Para habilitar la búsqueda automática de candidatos, agrega esta clave en el entorno del servidor.
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && isConfigured !== false && (
        <div className="mt-5 p-4 bg-red-950/50 border border-red-800/80 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Search Bar Action Header for Results */}
      {candidates.length > 0 && (
        <div className="mt-6 pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-sm text-stone-300">
            <span className="font-semibold">Encontrados: {totalFound} candidatos</span>
            <span className="text-stone-600">|</span>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1 cursor-pointer"
            >
              {selectedVideoIds.size === candidates.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Desmarcar todos</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  <span>Seleccionar todos</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleImportBatch}
            disabled={selectedVideoIds.size === 0 || importingBatch}
            className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
          >
            {importingBatch ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Importando lote...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>IMPORTAR SELECCIONADOS ({selectedVideoIds.size})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Candidate Cards Grid */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {candidates.map((candidate) => {
            const isSelected = selectedVideoIds.has(candidate.externalVideoId);
            const isImported = importedVideoIds.has(candidate.externalVideoId);
            const isSingleImporting = importingSingleId === candidate.externalVideoId;

            let scoreBadgeColor = 'bg-stone-800 text-stone-300 border-stone-700';
            if (candidate.score >= 80) {
              scoreBadgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
            } else if (candidate.score >= 60) {
              scoreBadgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
            }

            return (
              <div
                key={candidate.externalVideoId}
                className={`bg-stone-950 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                  isSelected ? 'border-amber-500 ring-1 ring-amber-500' : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Thumbnail & Select Checkbox */}
                <div className="relative aspect-video bg-black overflow-hidden group">
                  <img
                    src={candidate.thumbnailUrl}
                    alt={candidate.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Selection Checkbox overlay */}
                  <button
                    onClick={() => toggleSelectCandidate(candidate.externalVideoId)}
                    className="absolute top-2 left-2 p-1.5 bg-black/70 hover:bg-black rounded-lg text-white transition-colors cursor-pointer"
                    title={isSelected ? 'Desmarcar' : 'Seleccionar'}
                  >
                    {isSelected ? <CheckSquare className="w-5 h-5 text-amber-400" /> : <Square className="w-5 h-5 text-stone-300" />}
                  </button>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[11px] font-mono text-stone-200 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{formatDuration(candidate.durationSeconds)}</span>
                  </div>

                  {/* Score Badge */}
                  <div className={`absolute top-2 right-2 border px-2 py-0.5 rounded-full text-[11px] font-bold shadow ${scoreBadgeColor}`}>
                    {candidate.score} — {candidate.scoreLabel}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-100 line-clamp-2 leading-snug">
                      {candidate.title}
                    </h3>
                    <p className="text-xs text-amber-500/90 font-medium mt-1">
                      {candidate.creatorName}
                    </p>

                    {/* Metadata pill details */}
                    <div className="flex items-center space-x-3 text-[11px] text-stone-400 mt-2">
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3 h-3 text-stone-500" />
                        <span>{formatViews(candidate.views)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        <span>{formatDate(candidate.publishedAt)}</span>
                      </span>
                    </div>

                    {/* Suggested Category & Tags */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="bg-stone-900 border border-stone-800 text-stone-300 text-[10px] px-2 py-0.5 rounded-md font-medium">
                        {candidate.suggestedCategory.name}
                      </span>
                      {candidate.suggestedTags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="bg-stone-900/60 text-stone-400 text-[10px] px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-stone-900 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPreviewCandidate(candidate)}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium py-2 rounded-xl border border-stone-800 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                      <span>▶ VER</span>
                    </button>

                    {isImported ? (
                      <span className="flex-1 inline-flex items-center justify-center space-x-1 text-emerald-400 text-xs font-semibold py-2 bg-emerald-950/40 rounded-xl border border-emerald-900/60">
                        <Check className="w-4 h-4" />
                        <span>Importado (DRAFT)</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImportSingle(candidate)}
                        disabled={isSingleImporting}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl transition-all shadow cursor-pointer"
                      >
                        {isSingleImporting ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>IMPORTAR</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950">
              <h3 className="text-sm font-bold text-stone-200 truncate pr-4">
                Previsualización: {previewCandidate.title}
              </h3>
              <button
                onClick={() => setPreviewCandidate(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <VideoPlayer
                video={{
                  id: previewCandidate.externalVideoId,
                  title: previewCandidate.title,
                  description: previewCandidate.description,
                  originalUrl: previewCandidate.originalUrl,
                  embedUrl: previewCandidate.embedUrl,
                  platform: previewCandidate.platform,
                  platformVideoId: previewCandidate.externalVideoId,
                  thumbnailUrl: previewCandidate.thumbnailUrl,
                  creatorName: previewCandidate.creatorName,
                  creatorUrl: previewCandidate.creatorUrl,
                  durationSeconds: previewCandidate.durationSeconds,
                  status: 'DRAFT',
                  views: previewCandidate.views,
                  tags: previewCandidate.suggestedTags,
                  createdAt: previewCandidate.publishedAt,
                  updatedAt: previewCandidate.publishedAt,
                } as Video}
              />
            </div>

            <div className="px-4 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
              <div className="text-xs text-stone-400">
                <span>Canal: {previewCandidate.creatorName}</span>
              </div>

              {!importedVideoIds.has(previewCandidate.externalVideoId) && (
                <button
                  onClick={() => {
                    handleImportSingle(previewCandidate);
                    setPreviewCandidate(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  IMPORTAR A BORRADOR
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
