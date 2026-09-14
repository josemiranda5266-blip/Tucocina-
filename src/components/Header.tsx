import React, { useState } from 'react';
import { ChefHat, Search, Heart, Shield, LogIn, LogOut, Menu, X, User as UserIcon, Utensils, Trash2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, isAdmin, signInWithGoogle, signOut, claimAdminRole, deleteAccount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleClaimAdmin = async () => {
    setClaimingAdmin(true);
    try { await claimAdminRole(); onNavigate('admin'); }
    catch (err: any) { alert(err.message || 'Error al activar rol de administrador.'); }
    finally { setClaimingAdmin(false); }
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    const confirmed = window.confirm('¿Eliminar definitivamente tu cuenta de CociFlash? Se eliminarán tu perfil, favoritos, reportes y comentarios asociados. Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setDeletingAccount(true);
    try {
      await deleteAccount();
      alert('Tu cuenta y tus datos asociados fueron eliminados.');
      onNavigate('home');
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar la cuenta.');
    } finally { setDeletingAccount(false); }
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-amber-900/95 backdrop-blur-md text-amber-50 border-b border-amber-800/50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button type="button" aria-label="Ir al inicio de CociFlash" className="flex items-center space-x-3 text-left cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 shadow-inner"><ChefHat className="w-6 h-6" aria-hidden="true" /></div>
            <div><span className="font-extrabold text-xl tracking-tight text-white font-serif">CociFlash</span><span className="hidden sm:inline-block ml-2 text-xs font-medium text-amber-200/80 bg-amber-800/60 px-2 py-0.5 rounded-full border border-amber-700/50">Videos de Cocina</span></div>
          </button>
          <nav aria-label="Navegación principal" className="hidden md:flex items-center space-x-1">
            <button type="button" id="nav-home-btn" onClick={() => onNavigate('home')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'home' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'}`}>Inicio</button>
            <button type="button" id="nav-search-btn" onClick={() => onNavigate('search')} className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'search' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'}`}><Search className="w-4 h-4 mr-1" aria-hidden="true" /><span>Buscador</span></button>
            <button type="button" id="nav-categories-btn" onClick={() => onNavigate('categories')} className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'categories' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'}`}><Utensils className="w-4 h-4 mr-1" aria-hidden="true" /><span>Categorías</span></button>
            {user && <button type="button" id="nav-favorites-btn" onClick={() => onNavigate('favorites')} className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'favorites' ? 'bg-amber-800 text-white font-semibold' : 'text-amber-100 hover:bg-amber-800/60 hover:text-white'}`}><Heart className="w-4 h-4 mr-1 text-rose-400 fill-rose-400/20" aria-hidden="true" /><span>Mis Favoritos</span></button>}
            {isAdmin && <button type="button" id="nav-admin-btn" onClick={() => onNavigate('admin')} className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView.startsWith('admin') ? 'bg-amber-500 text-amber-950 font-bold shadow' : 'bg-amber-800/80 text-amber-200 hover:bg-amber-700'}`}><Shield className="w-4 h-4 mr-1" aria-hidden="true" /><span>Panel Admin</span></button>}
          </nav>
          <div className="hidden md:flex items-center space-x-3">
            {user && !isAdmin && <button type="button" id="claim-admin-btn" onClick={handleClaimAdmin} disabled={claimingAdmin} className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-700/80 hover:bg-amber-600 text-amber-100 border border-amber-500/40 transition-all active:scale-95 disabled:opacity-50" title="Activa los permisos de Administrador asignando el Custom Claim a tu cuenta"><Shield className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" /><span>{claimingAdmin ? 'Activando...' : 'Activar Modo Admin'}</span></button>}
            {user ? <div className="flex items-center space-x-2.5 bg-amber-950/40 py-1 px-3 rounded-full border border-amber-800/60">{user.photoURL ? <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-7 h-7 rounded-full border border-amber-400/50 object-cover" /> : <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-white"><UserIcon className="w-4 h-4" aria-hidden="true" /></div>}<div className="flex flex-col"><span className="text-xs font-medium text-amber-100 max-w-[130px] truncate leading-tight">{user.displayName || user.email}</span>{isAdmin && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Administrador</span>}</div><button type="button" onClick={() => onNavigate('contact')} title="Contacto y reclamos" aria-label="Contacto y reclamos" className="p-1 hover:bg-amber-800 text-amber-300 hover:text-amber-100 rounded-full transition-colors"><Mail className="w-4 h-4" /></button><button type="button" onClick={handleDeleteAccount} disabled={deletingAccount} title="Eliminar mi cuenta" aria-label="Eliminar mi cuenta" className="p-1 hover:bg-red-800 text-red-300 hover:text-red-100 rounded-full transition-colors disabled:opacity-50"><Trash2 className="w-4 h-4" /></button><button type="button" id="auth-signout-btn" onClick={signOut} title="Cerrar sesión" aria-label="Cerrar sesión" className="p-1 hover:bg-amber-800 text-amber-300 hover:text-amber-100 rounded-full transition-colors ml-1"><LogOut className="w-4 h-4" /></button></div> : <button type="button" id="auth-google-login-btn" onClick={signInWithGoogle} className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-amber-950 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95"><LogIn className="w-4 h-4" aria-hidden="true" /><span>Ingresar con Google</span></button>}
          </div>
          <div className="md:hidden flex items-center space-x-2">{isAdmin && <button type="button" onClick={() => onNavigate('admin')} className="flex items-center space-x-1 bg-amber-500 text-amber-950 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow"><Shield className="w-3.5 h-3.5" /><span>Admin</span></button>}{!user && <button type="button" onClick={signInWithGoogle} className="bg-amber-500 text-amber-950 px-3 py-1.5 rounded-md text-xs font-bold">Ingresar</button>}<button type="button" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-amber-200 hover:text-white focus:outline-none">{mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}</button></div>
        </div>
      </div>
      {mobileMenuOpen && <div className="md:hidden bg-amber-950 border-b border-amber-800 px-4 pt-2 pb-4 space-y-2"><button type="button" onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900">Inicio</button><button type="button" onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900">Buscador</button><button type="button" onClick={() => { onNavigate('categories'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900">Categorías</button><button type="button" onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900">Contacto y reclamos</button>{user && <button type="button" onClick={() => { onNavigate('favorites'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md text-amber-100 hover:bg-amber-900 flex items-center justify-between"><span>Mis Favoritos</span><Heart className="w-4 h-4 text-rose-400" aria-hidden="true" /></button>}{user && <button type="button" onClick={handleDeleteAccount} disabled={deletingAccount} className="w-full text-left px-3 py-2 rounded-md bg-red-950/60 text-red-200 font-semibold flex items-center justify-between"><span>{deletingAccount ? 'Eliminando cuenta...' : 'Eliminar mi cuenta'}</span><Trash2 className="w-4 h-4" /></button>}{user && !isAdmin && <button type="button" onClick={() => { handleClaimAdmin(); setMobileMenuOpen(false); }} disabled={claimingAdmin} className="w-full text-left px-3 py-2 rounded-md bg-amber-700/80 text-amber-100 font-semibold flex items-center justify-between border border-amber-500/30"><span>{claimingAdmin ? 'Activando...' : 'Activar Modo Admin'}</span><Shield className="w-4 h-4 text-amber-300" /></button>}{isAdmin && <button type="button" onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-md bg-amber-600 text-amber-950 font-bold flex items-center justify-between"><span>Panel Admin</span><Shield className="w-4 h-4" /></button>}{user && <div className="pt-3 border-t border-amber-900 flex items-center justify-between"><span className="text-xs text-amber-300 truncate">{user.displayName || user.email}</span><button type="button" onClick={() => { signOut(); setMobileMenuOpen(false); }} className="text-xs text-amber-400 hover:text-white font-medium flex items-center space-x-1"><LogOut className="w-3.5 h-3.5" /><span>Salir</span></button></div>}</div>}
    </header>
  );
};
