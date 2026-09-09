import React, { useState } from 'react';
import { ChefHat, Search, Heart, Shield, LogIn, LogOut, Menu, X, User as UserIcon, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, profile, isAdmin, signInWithGoogle, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-amber-900/95 backdrop-blur-md text-amber-50 border-b border-amber-800/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shadow-inner">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white font-serif">CO-Cocina</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-amber-200/80 bg-amber-800/60 px-2 py-0.5 rounded-full border border-amber-700/50">
                Videos de Cocina
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              id="nav-home-btn"
              onClick={() => onNavigate('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'home' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'
              }`}
            >
              Inicio
            </button>
            <button
              id="nav-search-btn"
              onClick={() => onNavigate('search')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'search' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4 mr-1" />
              <span>Buscador</span>
            </button>
            <button
              id="nav-categories-btn"
              onClick={() => onNavigate('categories')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'categories' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'
              }`}
            >
              <Utensils className="w-4 h-4 mr-1" />
              <span>Categorías</span>
            </button>

            {user && (
              <button
                id="nav-favorites-btn"
                onClick={() => onNavigate('favorites')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'favorites' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'
                }`}
              >
                <Heart className="w-4 h-4 mr-1 text-rose-400 fill-rose-400/20" />
                <span>Mis Favoritos</span>
              </button>
            )}

            {isAdmin && (
              <button
                id="nav-admin-btn"
                onClick={() => onNavigate('admin')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView.startsWith('admin') ? 'bg-amber-500 text-amber-950 font-bold shadow' : 'bg-amber-800/80 text-amber-200 hover:bg-amber-700'
                }`}
              >
                <Shield className="w-4 h-4 mr-1" />
                <span>Panel Admin</span>
              </button>
            )}
          </nav>

          {/* User Auth Action */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 bg-amber-950/40 py-1.5 px-3 rounded-full border border-amber-800/60">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-7 h-7 rounded-full border border-amber-400/50 object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-white">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <span className="text-xs font-medium text-amber-100 max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  id="auth-signout-btn"
                  onClick={signOut}
                  title="Cerrar sesión"
                  className="p-1 hover:bg-amber-800 text-amber-300 hover:text-amber-100 rounded-full transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="auth-google-login-btn"
                onClick={signInWithGoogle}
                className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-amber-950 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar con Google</span>
              </button>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center space-x-2">
            {!user && (
              <button
                onClick={signInWithGoogle}
                className="bg-amber-500 text-amber-950 px-3 py-1.5 rounded-md text-xs font-bold"
              >
                Ingresar
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-amber-200 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-amber-950 border-b border-amber-800 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900"
          >
            Inicio
          </button>
          <button
            onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900"
          >
            Buscador
          </button>
          <button
            onClick={() => { onNavigate('categories'); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900"
          >
            Categorías
          </button>

          {user && (
            <button
              onClick={() => { onNavigate('favorites'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900 flex items-center justify-between"
            >
              <span>Mis Favoritos</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-md bg-amber-600 text-amber-950 font-bold flex items-center justify-between"
            >
              <span>Panel Admin</span>
              <Shield className="w-4 h-4" />
            </button>
          )}

          {user && (
            <div className="pt-3 border-t border-amber-900 flex items-center justify-between">
              <span className="text-xs text-amber-300 truncate">{user.displayName || user.email}</span>
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="text-xs text-amber-400 hover:text-white font-medium flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
