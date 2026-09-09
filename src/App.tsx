import React, { useState } from 'react';
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

export const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParam, setViewParam] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Admin tab state
  const [adminTab, setAdminTab] = useState<'dashboard' | 'videos' | 'import' | 'reports'>('dashboard');

  const handleNavigate = (view: string, param: string = '') => {
    setCurrentView(view);
    setViewParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideoId(video.id);
    setCurrentView('video-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    if (currentView.startsWith('admin')) {
      return (
        <AdminLayout currentAdminTab={adminTab} onTabChange={setAdminTab}>
          {adminTab === 'dashboard' && <AdminDashboard />}
          {adminTab === 'videos' && <AdminVideos />}
          {adminTab === 'import' && <AdminImportVideo />}
          {adminTab === 'reports' && <AdminReports />}
        </AdminLayout>
      );
    }

    switch (currentView) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />;
      case 'search':
        return <SearchPage initialQuery={viewParam} onVideoSelect={handleVideoSelect} />;
      case 'categories':
        return <CategoriesPage onCategorySelect={(catId) => handleNavigate('search', `cat:${catId}`)} />;
      case 'video-detail':
        return selectedVideoId ? (
          <VideoDetailPage videoId={selectedVideoId} onBack={() => handleNavigate('home')} />
        ) : (
          <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />
        );
      case 'favorites':
        return <FavoritesPage onVideoSelect={handleVideoSelect} />;
      default:
        return <HomePage onNavigate={handleNavigate} onVideoSelect={handleVideoSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col selection:bg-amber-500 selection:text-white">
      <Header currentView={currentView} onNavigate={handleNavigate} />
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
