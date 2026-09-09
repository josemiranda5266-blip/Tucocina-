import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Report } from '../../types';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const loadReports = async (nextCursor?: string, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.adminGetReports({ cursor: nextCursor, limit: 20 });
      setReports((previous) => append ? [...previous, ...result.items] : result.items);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      await api.adminUpdateReport(reportId, status);
      await loadReports();
    } catch {
      setError('Error al actualizar estado del reporte.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200">
        <h2 className="text-xl font-bold font-serif text-stone-900">Reportes de Usuarios</h2>
        <span className="text-xs font-semibold text-stone-500">{reports.length} reportes cargados</span>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {loading && reports.length === 0 ? (
        <div className="py-12 text-center text-stone-500"><div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm font-medium">Cargando reportes...</p></div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500">No hay reportes pendientes de revisión.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'OPEN' ? 'bg-amber-100 text-amber-900' : r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>Estado: {r.status}</span><span className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleString()}</span></div>
              <div><p className="text-xs font-bold text-stone-500 uppercase">Motivo: {r.reason}</p><p className="text-sm text-stone-800 font-medium mt-1">{r.description}</p>{r.userEmail && <p className="text-xs text-stone-400 mt-1">Reportado por: {r.userEmail}</p>}</div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-stone-100"><span className="text-xs text-stone-500 font-mono break-all">Video ID: {r.videoId}</span><div className="flex items-center space-x-2">{r.status !== 'RESOLVED' && <button onClick={() => handleUpdateStatus(r.id, 'RESOLVED')} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">Marcar Resuelto</button>}{r.status !== 'REJECTED' && <button onClick={() => handleUpdateStatus(r.id, 'REJECTED')} className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold">Desestimar</button>}</div></div>
            </div>
          ))}
        </div>
      )}

      {hasMore && <div className="flex justify-center"><button type="button" onClick={() => void loadReports(cursor, true)} disabled={loading || !cursor} className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-bold disabled:opacity-50">{loading ? 'Cargando...' : 'Cargar más'}</button></div>}
    </div>
  );
};
