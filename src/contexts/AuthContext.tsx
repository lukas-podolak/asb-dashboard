import React, { createContext, useEffect, useState } from 'react';
import { 
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import type { AuthContextType } from '../types/auth';
import { UserRole } from '../types/user';
import { createUserProfile, getUserProfile, isAdmin as checkIsAdmin, isFunkcionar as checkIsFunkcionar, isTrener as checkIsTrener, isClen as checkIsClen } from '../utils/userService';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFunkcionar, setIsFunkcionar] = useState(false);
  const [isTrener, setIsTrener] = useState(false);
  const [isClen, setIsClen] = useState(false);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, displayName?: string, roles: UserRole[] = []) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(userCredential.user.uid, email, displayName, roles);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            setUserRoles(profile.roles);
            setIsAdmin(checkIsAdmin(profile));
            setIsFunkcionar(checkIsFunkcionar(profile));
            setIsTrener(checkIsTrener(profile));
            setIsClen(checkIsClen(profile));
          } else {
            // Uživatel bez profilu - nastavit prázdné role
            setUserProfile(null);
            setUserRoles([]);
            setIsAdmin(false);
            setIsFunkcionar(false);
            setIsTrener(false);
            setIsClen(false);
          }
        } catch (error) {
          console.error('Chyba při načítání profilu:', error);
          setUserProfile(null);
          setUserRoles([]);
          setIsAdmin(false);
          setIsFunkcionar(false);
          setIsTrener(false);
          setIsClen(false);
        }
      } else {
        setUserProfile(null);
        setUserRoles([]);
        setIsAdmin(false);
        setIsFunkcionar(false);
        setIsTrener(false);
        setIsClen(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    userRoles,
    isAdmin,
    isFunkcionar,
    isTrener,
    isClen,
    loading,
    login,
    signup,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
