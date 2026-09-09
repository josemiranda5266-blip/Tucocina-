import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { FavoritesPage } from './pages/FavoritesPage';

import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminVideos } from './pages/admin/AdminVideos';
import { AdminImportVideo } from './pages/admin/AdminImportVideo';
import { AdminReports } from './pages/admin/AdminReports';

import { Video } from './types';

type AppLocation = {
  view: string;
  param: string;
};

function readLocation(): AppLocation {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  if (path === '/') return { view: 'home', param: '' };
  if (path === '/buscar') return { view: 'search', param: params.get('q') || '' };
  if (path === '/categorias') return { view: 'categories', param: '' };
  if (path === '/favoritos') return { view: 'favorites', param: '' };
  if (path === '/admin') return { view: 'admin', param: params.get('tab') || '' };
  if (path.startsWith('/video/')) return { view: 'video-detail', param: decodeURIComponent(path.slice('/video/'.length)) };

  return { view: 'home', param: '' };
}

function writeLocation(view: string, param = '') {
  let path = '/';
  let search = '';

  switch (view) {
    case 'search':
      path = '/buscar';
      if (param) search = `?q=${encodeURIComponent(param)}`;
      break;
    case 'categories':
      path = '/categorias';
      break;
    case 'favorites':
      path = '/favoritos';
      break;
    case 'video-detail':
      path = `/video/${encodeURIComponent(param)}`;
      break;
    case 'admin':
      path = '/admin';
      break;
    default:
      path = '/';
  }

  window.history.pushState({}, '', `${path}${search}`);
}

export const AppContent: React.FC = () => {
  const [location, setLocation] = useState<AppLocation>(() => readLocation());
  const [adminTab, setAdminTab] = useState<'dashboard' | 'videos' | 'import' | 'reports'>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'videos' || tab === 'import' || tab === 'reports' ? tab : 'dashboard';
  });

  useEffect(() => {
    const handlePopState = () => setLocation(readLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (location.view !== 'admin') return;
    const requestedTab = location.param;
    if (requestedTab === 'videos' || requestedTab === 'import' || requestedTab === 'reports') {
      setAdminTab(requestedTab);
    } else {
      setAdminTab('dashboard');
    }
  }, [location]);

  const handleNavigate = (view: string, param = '') => {
    writeLocation(view, param);
    setLocation({ view, param });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVideoSelect = (video: Video) => {
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
          {adminTab === 'import' && <AdminImportVideo />}
          {adminTab === 'reports' && <AdminReports />}
        </AdminLayout>
      );
    }

    switch (location.view) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />;
      case 'search':
        return <SearchPage key={location.param} initialQuery={location.param} onVideoSelect={handleVideoSelect} />;
      case 'categories':
        return <CategoriesPage onCategorySelect={(catId) => handleNavigate('search', `cat:${catId}`)} />;
      case 'video-detail':
        return <VideoDetailPage videoId={location.param} onBack={() => handleNavigate('home')} />;
      case 'favorites':
        return <FavoritesPage onVideoSelect={handleVideoSelect} />;
      default:
        return <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col selection:bg-amber-500 selection:text-white">
      <Header currentView={location.view} onNavigate={handleNavigate} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
