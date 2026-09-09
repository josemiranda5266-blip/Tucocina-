import React from 'react';
import { AdminGuard } from '../../components/AdminGuard';
import { LayoutDashboard, Film, PlusCircle, Flag, Shield } from 'lucide-react';

interface AdminLayoutProps {
  currentAdminTab: 'dashboard' | 'videos' | 'import' | 'reports';
  onTabChange: (tab: 'dashboard' | 'videos' | 'import' | 'reports') => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentAdminTab, onTabChange, children }) => {
  return (
    <AdminGuard>
      <div id="admin-layout" className="space-y-6 pb-12">
        <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500 text-amber-950 font-bold rounded-xl"><Shield className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-bold font-serif">Panel de Administración TuCocina</h1>
              <p className="text-xs text-stone-400">Control de catálogo, importación de videos y moderación de contenido</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => onTabChange('dashboard')} className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${currentAdminTab === 'dashboard' ? 'bg-amber-500 text-amber-950 shadow' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}><LayoutDashboard className="w-4 h-4" /><span>Métricas</span></button>
            <button onClick={() => onTabChange('videos')} className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${currentAdminTab === 'videos' ? 'bg-amber-500 text-amber-950 shadow' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}><Film className="w-4 h-4" /><span>Catálogo</span></button>
            <button onClick={() => onTabChange('import')} className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${currentAdminTab === 'import' ? 'bg-amber-500 text-amber-950 shadow' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}><PlusCircle className="w-4 h-4" /><span>Agregar Video</span></button>
            <button onClick={() => onTabChange('reports')} className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${currentAdminTab === 'reports' ? 'bg-amber-500 text-amber-950 shadow' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}><Flag className="w-4 h-4" /><span>Reportes</span></button>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </AdminGuard>
  );
};
