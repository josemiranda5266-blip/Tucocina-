import React, { useState } from 'react';
import { api } from '../../services/api';
import { Video } from '../../types';
import { PlusCircle, Link, Check, AlertCircle, ArrowRight } from 'lucide-react';

export const AdminImportVideo: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedVideo, setImportedVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setImportedVideo(null);

    try {
      const video = await api.adminImportVideo(url.trim());
      setImportedVideo(video);
      setSuccessMsg('Video detectado e importado con éxito como Borrador (DRAFT).');
    } catch (err: any) {
      setError(err.message || 'Error al importar video');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!importedVideo) return;
    try {
      await api.adminUpdateVideo(importedVideo.id, { status: 'PUBLISHED' });
      setSuccessMsg('¡Video publicado exitosamente en el catálogo!');
      setImportedVideo({ ...importedVideo, status: 'PUBLISHED' });
    } catch (err: any) {
      setError(err.message || 'Error al publicar video');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-stone-900">Importar Video por URL</h2>
            <p className="text-xs text-stone-500">Pegá un enlace de YouTube, Instagram Reels o TikTok para indexar la receta</p>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4 pt-2">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">URL del Video Original</label>
            <div className="relative">
              <Link className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... o Instagram / TikTok"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-sm shadow transition-all disabled:opacity-50"
          >
            {loading ? 'Validando URL e Importando...' : 'Importar y Validar Metadata'}
          </button>
        </form>
      </div>

      {/* Imported Video Preview Card */}
      {importedVideo && (
        <div className="bg-white p-6 rounded-2xl border border-amber-300 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Vista Previa e Inspección</h3>

          <div className="flex flex-col sm:flex-row gap-4 items-start bg-stone-50 p-4 rounded-xl border border-stone-200">
            <img
              src={importedVideo.thumbnailUrl}
              alt={importedVideo.title}
              className="w-36 h-24 object-cover rounded-lg bg-stone-200 shrink-0"
            />
            <div className="space-y-1">
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded uppercase">
                {importedVideo.platform} • {importedVideo.status}
              </span>
              <h4 className="font-bold text-stone-900 text-base leading-tight">{importedVideo.title}</h4>
              <p className="text-xs text-stone-600">{importedVideo.creatorName}</p>
              <p className="text-xs text-stone-500 line-clamp-2">{importedVideo.description}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            {importedVideo.status !== 'PUBLISHED' && (
              <button
                onClick={handlePublishNow}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-1.5 shadow"
              >
                <span>Aprobar y Publicar Ahora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
