import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Film, CheckCircle2, Clock, EyeOff, Flag, Users } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetMetrics()
      .then(setMetrics)
      .catch((err) => console.error('Error al cargar métricas:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-stone-500">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Cargando estadísticas del sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-serif text-stone-900">Resumen del Sistema</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total de Videos</p>
            <p className="text-2xl font-extrabold text-stone-900">{metrics?.totalVideos || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Publicados</p>
            <p className="text-2xl font-extrabold text-stone-900">{metrics?.publishedVideos || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Borradores / Pendientes</p>
            <p className="text-2xl font-extrabold text-stone-900">{metrics?.pendingVideos || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-stone-100 text-stone-800 rounded-xl">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Ocultos</p>
            <p className="text-2xl font-extrabold text-stone-900">{metrics?.hiddenVideos || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-100 text-rose-800 rounded-xl">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Reportes Abiertos</p>
            <p className="text-2xl font-extrabold text-stone-900">{metrics?.openReports || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Usuarios Registrados</p>
            <p className="text-2xl font-extrabold text-stone-900">{metrics?.totalUsers || 0}</p>
          </div>
        </div>

      </div>
    </div>
  );
};
