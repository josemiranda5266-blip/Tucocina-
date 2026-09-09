import React, { useState } from 'react';
import { X, Flag, CheckCircle } from 'lucide-react';
import { ReportReason } from '../types';
import { api } from '../services/api';

interface ReportModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ videoId, isOpen, onClose }) => {
  const [reason, setReason] = useState<ReportReason>('BROKEN_LINK');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.submitReport(videoId, reason, description);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al enviar reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="report-modal-backdrop" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif">Reportar problema</h3>
            <p className="text-xs text-stone-500">Ayudanos a mantener el catálogo de recetas limpio y funcionando</p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center text-emerald-700 space-y-2">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-600 animate-bounce" />
            <p className="font-bold text-base">¡Gracias por tu reporte!</p>
            <p className="text-xs text-stone-600">Un administrador revisará el video a la brevedad.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Motivo del reporte</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-amber-600"
              >
                <option value="BROKEN_LINK">El enlace o video está caído / no funciona</option>
                <option value="INCORRECT_CONTENT">El contenido no es de cocina / receta incorrecta</option>
                <option value="OFFENSIVE_CONTENT">Contenido ofensivo o inapropiado</option>
                <option value="DUPLICATE">Video duplicado</option>
                <option value="OTHER">Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Detalles o explicación</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicá brevemente qué problema encontraste..."
                rows={3}
                required
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
