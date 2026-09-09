import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdTokenResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('USER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        const resolvedRole: UserRole = isAdminClaim ? 'ADMIN' : 'USER';
        setRole(resolvedRole);

        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const now = new Date().toISOString();
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Usuario',
            photoURL: currentUser.photoURL || '',
            role: 'USER',
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(userRef, newProfile);
          setProfile({ ...newProfile, role: resolvedRole });
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
    try {
      // Firebase recommends redirect-based OAuth on mobile browsers because popup
      // flows are more likely to be blocked or behave inconsistently there.
      const isMobileBrowser = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
      if (isMobileBrowser) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isAdmin = role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
