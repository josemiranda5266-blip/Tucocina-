import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, isAdmin, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Verificando permisos administrativos...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div id="admin-guard-login" className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-stone-200 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-stone-100 text-stone-800 rounded-full flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 font-serif">Iniciá sesión como Administrador</h2>
        <p className="text-stone-600 text-sm">
          Acceso reservado a personal autorizado para la gestión y moderación del catálogo.
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow transition-all flex items-center justify-center space-x-2"
        >
          <LogIn className="w-5 h-5" />
          <span>Ingresar con Google</span>
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div id="admin-guard-forbidden" className="max-w-md mx-auto my-16 p-8 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-rose-900 font-serif">Acceso Restringido</h2>
        <p className="text-rose-700 text-sm">
          Tu cuenta de usuario ({user.email}) no cuenta con rol de Administrador para acceder a esta área.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
