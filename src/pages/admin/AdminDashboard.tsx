import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Activity, Eye, Film, Users, Search, Heart, Share2, Smartphone, Monitor, Tablet } from 'lucide-react';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-stone-100 text-stone-800 rounded-xl">{icon}</div>
    <div><p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{label}</p><p className="text-2xl font-extrabold text-stone-900">{value.toLocaleString('es-AR')}</p></div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const load = async (period: number) => {
    setLoading(true);
    try {
      const [system, behavior] = await Promise.all([api.adminGetMetrics(), api.adminGetAnalytics(period)]);
      setMetrics(system);
      setAnalytics(behavior);
    } catch (err) {
      console.error('Error al cargar métricas:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(days); }, [days]);

  if (loading && !metrics) return <div className="py-12 text-center text-stone-500"><div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm font-medium">Cargando estadísticas del sistema...</p></div>;

  const totals = analytics?.totals || {};
  const deviceIcon = (id: string) => id === 'mobile' ? <Smartphone className="w-4 h-4" /> : id === 'tablet' ? <Tablet className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold font-serif text-stone-900">Analítica y resumen del sistema</h2><p className="text-sm text-stone-500">Comportamiento agregado y estado del catálogo.</p></div>
        <div className="flex gap-2">{[1, 7, 30, 90].map((period) => <button key={period} onClick={() => setDays(period)} className={`px-3 py-2 rounded-lg text-xs font-bold ${days === period ? 'bg-amber-500 text-amber-950' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{period === 1 ? 'Hoy' : `${period} días`}</button>)}</div>
      </div>

      <section>
        <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-amber-600" /> Audiencia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-5 h-5" />} label="Visitantes únicos" value={totals.visitors || 0} />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Sesiones" value={totals.sessions || 0} />
          <StatCard icon={<Eye className="w-5 h-5" />} label="Páginas vistas" value={totals.pageViews || 0} />
          <StatCard icon={<Film className="w-5 h-5" />} label="Videos abiertos" value={totals.videoViews || 0} />
        </div>
      </section>

      <section>
        <h3 className="font-bold text-stone-800 mb-3">Interacción</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Activity className="w-5 h-5" />} label="Reproducciones" value={totals.videoPlays || 0} />
          <StatCard icon={<Search className="w-5 h-5" />} label="Búsquedas de texto" value={totals.searches || 0} />
          <StatCard icon={<Heart className="w-5 h-5" />} label="Favoritos" value={totals.favorites || 0} />
          <StatCard icon={<Share2 className="w-5 h-5" />} label="Compartidos" value={totals.shares || 0} />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5"><h3 className="font-bold mb-4">Procedencia disponible</h3><div className="space-y-2">{(analytics?.countries || []).slice(0, 8).map((item: any) => <div key={item.id} className="flex justify-between text-sm"><span>{item.id === 'UNKNOWN' ? 'No disponible' : item.id}</span><strong>{item.count.toLocaleString('es-AR')}</strong></div>)}{(!analytics?.countries?.length) && <p className="text-sm text-stone-500">Todavía no hay datos.</p>}</div></div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5"><h3 className="font-bold mb-4">Dispositivos</h3><div className="space-y-3">{(analytics?.devices || []).slice(0, 5).map((item: any) => <div key={item.id} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2">{deviceIcon(item.id)}{item.id}</span><strong>{item.count.toLocaleString('es-AR')}</strong></div>)}</div></div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5"><h3 className="font-bold mb-4">Estado del catálogo</h3><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Total</span><strong>{metrics?.totalVideos || 0}</strong></div><div className="flex justify-between"><span>Publicados</span><strong>{metrics?.publishedVideos || 0}</strong></div><div className="flex justify-between"><span>Pendientes de revisión</span><strong>{metrics?.pendingVideos || 0}</strong></div><div className="flex justify-between"><span>Borradores</span><strong>{metrics?.draftVideos || 0}</strong></div><div className="flex justify-between"><span>Ocultos</span><strong>{metrics?.hiddenVideos || 0}</strong></div><div className="flex justify-between"><span>Reportes abiertos</span><strong>{metrics?.openReports || 0}</strong></div><div className="flex justify-between"><span>Usuarios registrados</span><strong>{metrics?.totalUsers || 0}</strong></div></div></div>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-5"><h3 className="font-bold mb-4">Búsquedas más realizadas</h3>{analytics?.topSearches?.length ? <div className="space-y-2">{analytics.topSearches.map((item: any, index: number) => <div key={`${item.query}-${index}`} className="flex justify-between gap-4 text-sm"><span className="truncate">{index + 1}. {item.query}</span><strong>{item.count}</strong></div>)}</div> : <p className="text-sm text-stone-500">Aún no hay búsquedas registradas.</p>}</div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5"><h3 className="font-bold mb-4">Videos con más interacciones</h3>{analytics?.topVideos?.length ? <div className="space-y-3">{analytics.topVideos.map((item: any, index: number) => <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-4 text-sm"><div className="min-w-0"><p className="font-medium text-stone-900 truncate">{index + 1}. {item.title}</p><p className="text-xs text-stone-500 truncate">{item.platform ? `${item.platform} · ` : ''}{item.creatorName || 'Creador no disponible'} · ID: {item.id}</p></div><strong className="shrink-0">{item.count.toLocaleString('es-AR')}</strong></div>)}</div> : <p className="text-sm text-stone-500">Aún no hay interacciones registradas.</p>}</div>
      </section>
    </div>
  );
};
