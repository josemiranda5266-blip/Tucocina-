import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div id="auth-guard-prompt" className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-stone-200 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 font-serif">Iniciá sesión para continuar</h2>
        <p className="text-stone-600 text-sm">
          Esta sección requiere iniciar sesión con tu cuenta de Google para guardar y consultar tus recetas favoritas.
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

  return <>{children}</>;
};
