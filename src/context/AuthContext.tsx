import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdTokenResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { UserProfile, UserRole } from '../types';

export const CURRENT_LEGAL_VERSION = '2026-09-14';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  claimAdminRole: () => Promise<void>;
  acceptLegalTerms: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('USER');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) console.log('Inicio de sesión con Google (redirección) completado:', result.user.email);
      })
      .catch((err) => console.error('Error procesando resultado de redirección Firebase Auth:', err));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (!currentUser) {
        setProfile(null);
        setRole('USER');
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(currentUser);
        const isAdminClaim = tokenResult.claims.admin === true;
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        let firestoreRole: UserRole = 'USER';
        if (userSnap.exists()) {
          const existing = userSnap.data() as UserProfile;
          if (existing.role === 'ADMIN') firestoreRole = 'ADMIN';
        }

        const isOwnerEmail = currentUser.email?.toLowerCase() === 'cristianbravo5266@gmail.com';
        const resolvedRole: UserRole = (isAdminClaim || firestoreRole === 'ADMIN' || isOwnerEmail) ? 'ADMIN' : 'USER';
        setRole(resolvedRole);

        if (!userSnap.exists()) {
          const now = new Date().toISOString();
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Usuario',
            photoURL: currentUser.photoURL || '',
            role: resolvedRole,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(userRef, { ...newProfile, id: currentUser.uid });
          setProfile(newProfile);
        } else {
          const existing = userSnap.data() as UserProfile;
          setProfile({ ...existing, role: resolvedRole });
        }
      } catch (error) {
        console.error('Error al cargar el perfil de usuario:', error);
        setRole('USER');
        setProfile({
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Usuario',
          photoURL: currentUser.photoURL || '',
          role: 'USER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (popupError: any) {
        console.warn('signInWithPopup falló o fue bloqueado, evaluando alternativa:', popupError);
        if (isInIframe) {
          throw new Error('Google OAuth no permite navegación por redirección dentro de marcos (iframe) de vista previa. Por favor abre la aplicación en una pestaña independiente del navegador.');
        }
        if (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/popup-closed-by-user' || popupError?.code === 'auth/cancelled-popup-request' || popupError?.code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, googleProvider);
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('Error al iniciar sesión con Google:', error);
      let msg = error?.message || 'Error desconocido al iniciar sesión.';
      if (error?.code === 'auth/operation-not-allowed') msg = 'El proveedor de Google no está habilitado en Firebase Authentication (Métodos de inicio de sesión).';
      else if (error?.code === 'auth/unauthorized-domain') msg = 'Este dominio aún no está autorizado en la consola de Firebase Authentication > Dominios Autorizados.';
      else if (error?.code === 'auth/popup-blocked') msg = 'El navegador bloqueó la ventana emergente. Por favor permite ventanas emergentes o abre la app en una pestaña independiente.';
      setAuthError(`${msg} (${error?.code || 'código desconocido'})`);
      throw error;
    }
  };

  const acceptLegalTerms = async () => {
    if (!auth.currentUser) throw new Error('Debes estar autenticado para aceptar los términos.');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/auth/legal-acceptance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ legalVersion: CURRENT_LEGAL_VERSION }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'No se pudo registrar la aceptación legal.');
    }
    const data = await res.json();
    setProfile((current) => current ? {
      ...current,
      legalVersion: CURRENT_LEGAL_VERSION,
      legalAcceptedAt: data.acceptedAt,
      termsAcceptedAt: data.acceptedAt,
      privacyNoticeVersion: CURRENT_LEGAL_VERSION,
      updatedAt: data.acceptedAt,
    } : current);
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) throw new Error('Debes estar autenticado para eliminar tu cuenta.');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'No se pudo eliminar la cuenta.');
    }
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setRole('USER');
  };

  const claimAdminRole = async () => {
    if (!auth.currentUser) throw new Error('Debes estar autenticado para activar el modo administrador.');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/auth/claim-admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'Error al solicitar el rol de administrador.');
    }
    try { await getIdTokenResult(auth.currentUser, true); } catch (tokenErr) { console.warn('Advertencia al refrescar idToken:', tokenErr); }
    setRole('ADMIN');
    if (profile) setProfile({ ...profile, role: 'ADMIN' });
  };

  const signOut = async () => {
    try { await firebaseSignOut(auth); } catch (error) { console.error('Error al cerrar sesión:', error); }
  };

  const isAdmin = role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, loading, authError, clearAuthError, signInWithGoogle, signOut, claimAdminRole, acceptLegalTerms, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};
