import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Video, Category } from '../../types';
import { VideoPlayer } from '../../components/VideoPlayer';
import { VideoCard } from '../../components/VideoCard';
import {
  PlusCircle,
  Link as LinkIcon,
  Check,
  AlertCircle,
  ArrowRight,
  Play,
  LayoutGrid,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface AdminImportVideoProps {
  onVideoSelect?: (video: Video) => void;
}

const CULINARY_THUMBNAILS = [
  { name: 'General', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80' },
  { name: 'Pastas', url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=800&auto=format&fit=crop&q=80' },
  { name: 'Carnes / Asado', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80' },
  { name: 'Pollo', url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80' },
  { name: 'Postres', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80' },
  { name: 'Panadería', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80' },
  { name: 'Saludable', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80' },
];

export const AdminImportVideo: React.FC<AdminImportVideoProps> = ({ onVideoSelect }) => {
  const [url, setUrl] = useState('');
  const [preTitle, setPreTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedVideo, setImportedVideo] = useState<Video | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previewTab, setPreviewTab] = useState<'player' | 'card'>('player');

  // Editable fields for the imported video
  const [editTitle, setEditTitle] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editTags, setEditTags] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch((err) => console.error('Error al cargar categorías:', err));
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setImportedVideo(null);

    try {
      // Use preTitle if the admin provided one before importing
      const video = await api.adminImportVideo(url.trim());
      
      // If the admin provided a preTitle, immediately apply it
      if (preTitle.trim()) {
        video.title = preTitle.trim();
      }

      setImportedVideo(video);
      setEditTitle(preTitle.trim() || video.title);
      setEditCreator(video.creatorName || '');
      setEditDesc(video.description || '');
      setEditCategory(video.categoryId || 'cat-carnes');
      setEditThumbnail(video.thumbnailUrl || CULINARY_THUMBNAILS[0].url);
      setEditTags((video.tags || []).join(', '));

      setSuccessMsg(
        video.status === 'PUBLISHED'
          ? 'El video ya estaba importado en el sistema. Podés revisar la vista previa y editar los datos abajo.'
          : '¡Video importado con éxito como Borrador! Ahora podés revisar la vista previa del video original, personalizar el título y publicarlo.'
      );
    } catch (err: any) {
      console.error('Error al importar video:', err);
      const msg = err.message === 'Failed to fetch'
        ? 'Error de conexión con el servidor. Por favor verificá que el servidor esté activo y reintentá.'
        : (err.message || 'Error al importar el video. Verificá que la URL sea pública y válida.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const parseTags = (value: string): string[] => {
    return [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 15);
  };

  const handlePublishOrSave = async (targetStatus: Video['status'] = 'PUBLISHED') => {
    if (!importedVideo) return;
    if (!editTitle.trim()) {
      setError('Por favor ingresá un título para la receta antes de publicar.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await api.adminUpdateVideo(importedVideo.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        creatorName: editCreator.trim(),
        categoryId: editCategory || undefined,
        thumbnailUrl: editThumbnail.trim() || CULINARY_THUMBNAILS[0].url,
        tags: parseTags(editTags),
        status: targetStatus,
      });

      setImportedVideo(updated);
      setSuccessMsg(
        targetStatus === 'PUBLISHED'
          ? `¡Receta publicada con éxito en el catálogo con el título "${updated.title}"!`
          : 'Cambios guardados correctamente.'
      );
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios del video.');
    } finally {
      setSaving(false);
    }
  };

  const isGenericTitle =
    editTitle.toLowerCase().includes('reel de cocina') ||
    editTitle.toLowerCase().includes('receta de cocina en instagram') ||
    editTitle.toLowerCase().includes('receta de cocina en tiktok');

  // Video object with active edit state for live preview
  const previewVideoObject: Video | null = importedVideo
    ? {
        ...importedVideo,
        title: editTitle.trim() || importedVideo.title,
        creatorName: editCreator.trim() || importedVideo.creatorName,
        description: editDesc.trim() || importedVideo.description,
        categoryId: editCategory || importedVideo.categoryId,
        thumbnailUrl: editThumbnail.trim() || importedVideo.thumbnailUrl,
        tags: parseTags(editTags),
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Import Box */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">Importar y Publicar Receta</h2>
            <p className="text-xs text-stone-500">
              Pegá un enlace de Instagram Reels, YouTube o TikTok. Se extraerá la metadata y podrás ver la vista previa del video original.
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4 pt-2">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                URL del Video Original <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/... o YouTube / TikTok"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Título del plato <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={preTitle}
                onChange={(e) => setPreTitle(e.target.value)}
                placeholder="Ej: Empanadas criollas"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl text-sm shadow transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Validando URL y Detectando Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Importar y Ver Vista Previa del Video</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* INSPECTION & LIVE PREVIEW CARD */}
      {importedVideo && previewVideoObject && (
        <div className="bg-white rounded-2xl border-2 border-amber-400/80 shadow-xl overflow-hidden space-y-0">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
                importedVideo.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {importedVideo.status === 'PUBLISHED' ? 'Publicado en Catálogo' : 'Borrador (Listo para Publicar)'}
              </span>
              <span className="text-xs text-stone-300 font-medium">
                Plataforma: <strong className="text-amber-400 capitalize">{importedVideo.platform.toLowerCase()}</strong>
              </span>
            </div>

            {/* Preview switcher tabs */}
            <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700">
              <button
                type="button"
                onClick={() => setPreviewTab('player')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  previewTab === 'player'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reproductor Original</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('card')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  previewTab === 'card'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tarjeta Catálogo</span>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">

            {/* Generic Title Warning Banner */}
            {isGenericTitle && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start space-x-3 text-amber-900 text-xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-950 mb-0.5">Título genérico de Instagram detectado</p>
                  <p className="leading-relaxed">
                    Escribí el nombre real de tu plato abajo (ej: <em>Milanesas Napolitanas</em> o <em>Pasta con Salsa Pesto</em>). El nuevo título se trasladará y guardará automáticamente al hacer clic en <strong>Publicar</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: VISTA PREVIA DEL VIDEO ORIGINAL */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    {previewTab === 'player' ? 'Vista Previa del Video Original' : 'Vista Previa en Tarjeta'}
                  </h3>
                  {importedVideo.originalUrl && (
                    <a
                      href={importedVideo.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center space-x-1"
                    >
                      <span>Abrir link original</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="bg-stone-100 p-3 sm:p-4 rounded-2xl border border-stone-200 flex items-center justify-center min-h-[380px]">
                  {previewTab === 'player' ? (
                    <div className="w-full">
                      <VideoPlayer video={previewVideoObject} compact={true} />
                    </div>
                  ) : (
                    <div className="w-full max-w-[320px]">
                      <VideoCard video={previewVideoObject} onClick={() => {}} />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 text-center">
                  El reproductor original está adaptado con proporción óptima para que no exceda el tamaño de la pantalla.
                </p>
              </div>

              {/* RIGHT COLUMN: METADATOS Y PUBLICACIÓN */}
              <div className="lg:col-span-7 space-y-5 bg-stone-50/70 p-6 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-bold font-serif text-stone-900 text-base">
                    Editar Datos y Trasladar Título
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">
                    {importedVideo.platform}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Title Field */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Título de la Receta <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Ej: Asado a la Cruz Criollo"
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all ${
                        isGenericTitle ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-400' : 'border-stone-300'
                      }`}
                      required
                    />
                  </div>

                  {/* Creator & Category Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Canal o Chef Creador</label>
                      <input
                        type="text"
                        value={editCreator}
                        onChange={(e) => setEditCreator(e.target.value)}
                        placeholder="Ej: Locos por el Asado"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Categoría Gastronómica</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Descripción de la receta y pasos
                    </label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Ingredientes, consejos de cocción y técnica..."
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  {/* Thumbnail URL & Presets */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700">
                      Imagen de Portada (Miniatura para el catálogo)
                    </label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-400" />
                        <input
                          type="url"
                          value={editThumbnail}
                          onChange={(e) => setEditThumbnail(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      </div>
                    </div>

                    {/* Quick photo suggestions */}
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Fotos gastronómicas rápidas recomendadas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CULINARY_THUMBNAILS.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setEditThumbnail(item.url)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                              editThumbnail === item.url
                                ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                                : 'bg-white text-stone-600 border-stone-200 hover:border-amber-400 hover:text-stone-900'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Etiquetas (separadas por coma)
                    </label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="facil, rapido, horno, casero"
                      className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUrl('');
                      setPreTitle('');
                      setImportedVideo(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center space-x-1 py-2 px-3 rounded-lg hover:bg-stone-200/60 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Importar otro video</span>
                  </button>

                  <div className="flex items-center space-x-3">
                    {importedVideo.status === 'PUBLISHED' ? (
                      <>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handlePublishOrSave('PUBLISHED')}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition-all disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                        {onVideoSelect && (
                          <button
                            type="button"
                            onClick={() => onVideoSelect(importedVideo)}
                            className="bg-stone-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition-all flex items-center space-x-1.5"
                          >
                            <span>Ver en el Catálogo</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={saving || !editTitle.trim()}
                        onClick={() => handlePublishOrSave('PUBLISHED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-sm shadow-md transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Publicando...</span>
                          </>
                        ) : (
                          <>
                            <span>Aprobar y Publicar en Catálogo</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
