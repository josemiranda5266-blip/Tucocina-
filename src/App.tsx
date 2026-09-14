import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AlertTriangle, X } from 'lucide-react';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { LegalPage, LegalSection } from './pages/LegalPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminVideos } from './pages/admin/AdminVideos';
import { AdminImportVideo } from './pages/admin/AdminImportVideo';
import { AdminReports } from './pages/admin/AdminReports';
import { Video } from './types';
import { track, trackPageView, trackSessionStart } from './services/analytics';

type AppLocation = { view: string; param: string };

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return ''; }
}

function readLocation(): AppLocation {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  if (path === '/') return { view: 'home', param: '' };
  if (path === '/buscar') return { view: 'search', param: params.get('q') || '' };
  if (path === '/categorias') return { view: 'categories', param: '' };
  if (path === '/favoritos') return { view: 'favorites', param: '' };
  if (path === '/admin') return { view: 'admin', param: params.get('tab') || '' };
  if (path === '/legal' || path === '/legal/privacidad') return { view: 'legal', param: 'privacy' };
  if (path === '/legal/terminos') return { view: 'legal', param: 'terms' };
  if (path === '/legal/cookies') return { view: 'legal', param: 'cookies' };
  if (path === '/legal/contenido') return { view: 'legal', param: 'content' };
  if (path.startsWith('/video/')) {
    const id = safeDecode(path.slice('/video/'.length));
    return id ? { view: 'video-detail', param: id } : { view: 'home', param: '' };
  }
  return { view: 'home', param: '' };
}

function writeLocation(view: string, param = '') {
  let path = '/';
  let search = '';
  switch (view) {
    case 'search': path = '/buscar'; if (param) search = `?q=${encodeURIComponent(param)}`; break;
    case 'categories': path = '/categorias'; break;
    case 'favorites': path = '/favoritos'; break;
    case 'video-detail': path = param ? `/video/${encodeURIComponent(param)}` : '/'; break;
    case 'admin': path = '/admin'; if (param) search = `?tab=${encodeURIComponent(param)}`; break;
    case 'legal':
      path = param === 'terms' ? '/legal/terminos' : param === 'cookies' ? '/legal/cookies' : param === 'content' ? '/legal/contenido' : '/legal/privacidad';
      break;
    default: path = '/';
  }
  window.history.pushState({}, '', `${path}${search}`);
}

export const AppContent: React.FC = () => {
  const { authError, clearAuthError } = useAuth();
  const [location, setLocation] = useState<AppLocation>(() => readLocation());
  const [adminTab, setAdminTab] = useState<'dashboard' | 'videos' | 'import' | 'reports'>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'videos' || tab === 'import' || tab === 'reports' ? tab : 'dashboard';
  });

  useEffect(() => {
    trackSessionStart();
    trackPageView(window.location.pathname);
    const handlePopState = () => {
      const next = readLocation();
      setLocation(next);
      trackPageView(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (location.view !== 'admin') return;
    const requestedTab = location.param;
    if (requestedTab === 'videos' || requestedTab === 'import' || requestedTab === 'reports') setAdminTab(requestedTab);
    else setAdminTab('dashboard');
  }, [location]);

  const handleNavigate = (view: string, param = '') => {
    writeLocation(view, param);
    setLocation({ view, param });
    trackPageView(view === 'home' ? '/' : window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVideoSelect = (video: Video) => {
    track('view_video', { videoId: video.id });
    handleNavigate('video-detail', video.id);
  };

  const handleAdminTabChange = (tab: 'dashboard' | 'videos' | 'import' | 'reports') => {
    setAdminTab(tab);
    handleNavigate('admin', tab === 'dashboard' ? '' : tab);
  };

  const renderView = () => {
    if (location.view === 'admin') {
      return (
        <AdminLayout currentAdminTab={adminTab} onTabChange={handleAdminTabChange}>
          {adminTab === 'dashboard' && <AdminDashboard />}
          {adminTab === 'videos' && <AdminVideos />}
          {adminTab === 'import' && <AdminImportVideo onVideoSelect={handleVideoSelect} />}
          {adminTab === 'reports' && <AdminReports />}
        </AdminLayout>
      );
    }
    if (location.view === 'legal') {
      const validSections: LegalSection[] = ['privacy', 'terms', 'cookies', 'content'];
      const section = validSections.includes(location.param as LegalSection) ? location.param as LegalSection : 'privacy';
      return <LegalPage section={section} onNavigate={handleNavigate} />;
    }
    switch (location.view) {
      case 'home': return <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />;
      case 'search': return <SearchPage key={location.param} initialQuery={location.param} onVideoSelect={handleVideoSelect} />;
      case 'categories': return <CategoriesPage onCategorySelect={(catId) => { track('view_category', { categoryId: catId }); handleNavigate('search', `cat:${catId}`); }} />;
      case 'video-detail': return <VideoDetailPage videoId={location.param} onBack={() => handleNavigate('home')} />;
      case 'favorites': return <FavoritesPage onVideoSelect={handleVideoSelect} />;
      default: return <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col selection:bg-amber-500 selection:text-white">
      <Header currentView={location.view} onNavigate={handleNavigate} />
      {authError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-red-800 text-sm flex items-center justify-between max-w-7xl mx-auto w-full mt-2 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2"><AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" /><div><strong className="font-semibold">Error de Autenticación:</strong> {authError}</div></div>
          <button type="button" onClick={clearAuthError} className="p-1 text-red-600 hover:text-red-900 rounded-md hover:bg-red-100 transition-colors" title="Cerrar mensaje"><X className="w-4 h-4" /></button>
        </div>
      )}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderView()}</main>
      <Footer />
    </div>
  );
};

export function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
