import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Flag, CheckCircle, XCircle, Clock } from 'lucide-react';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = () => {
    setLoading(true);
    api.adminGetReports()
      .then(setReports)
      .catch((err) => console.error('Error al cargar reportes:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      await api.adminUpdateReport(reportId, status);
      loadReports();
    } catch (err) {
      alert('Error al actualizar estado del reporte');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200">
        <h2 className="text-xl font-bold font-serif text-stone-900">Reportes de Usuarios</h2>
        <span className="text-xs font-semibold text-stone-500">{reports.length} reportes registrados</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-500">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Cargando reportes...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500">
          No hay reportes pendientes de revisión.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  r.status === 'OPEN' ? 'bg-amber-100 text-amber-900' :
                  r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                }`}>
                  Estado: {r.status}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-stone-500 uppercase">Motivo: {r.reason}</p>
                <p className="text-sm text-stone-800 font-medium mt-1">{r.description}</p>
                {r.userEmail && <p className="text-xs text-stone-400 mt-1">Reportado por: {r.userEmail}</p>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <span className="text-xs text-stone-500 font-mono">Video ID: {r.videoId}</span>
                <div className="flex items-center space-x-2">
                  {r.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'RESOLVED')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Marcar Resuelto
                    </button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                      className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold"
                    >
                      Desestimar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
