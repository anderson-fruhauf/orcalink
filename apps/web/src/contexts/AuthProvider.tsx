import React, { useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import api from '../lib/api.js';
import { AuthContext } from './AuthContext.js';
import type { UserSession } from './AuthContext.js';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefilledEmail, setPrefilledEmail] = useState('');

  // Sincronizar o usuário do Firebase com o backend local
  const syncUserWithBackend = async (fbUser: FirebaseUser): Promise<UserSession> => {
    try {
      // O interceptor já vai injetar o Bearer Token dinamicamente se o fbUser estiver logado.
      // Para garantir que o interceptor obtenha o token atualizado, podemos forçar a injeção ou esperar.
      const res = await api.get('/auth/me');
      const session = {
        firebaseUser: fbUser,
        backendUser: res.data.user,
        tenant: res.data.tenant,
      };
      setUser(session);
      return session;
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Usuário existe no Firebase mas não no DB local
        const session = { firebaseUser: fbUser };
        setUser(session);
        return session;
      }
      throw err;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      setLoading(true);
      if (fbUser) {
        try {
          await syncUserWithBackend(fbUser);
        } catch (error) {
          console.error('Failed to sync user with backend:', error);
          setUser({ firebaseUser: fbUser });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<UserSession> => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const session = await syncUserWithBackend(credential.user);
      return session;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    companyName: string
  ): Promise<UserSession> => {
    setLoading(true);
    try {
      // 1. Criar usuário no Firebase
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = credential.user;

      // 2. Chamar endpoint de registro do backend passando { name, companyName }
      // O interceptor injetará o Bearer Token do usuário recém-criado
      const res = await api.post('/auth/register', { name, companyName });

      const session = {
        firebaseUser: fbUser,
        backendUser: res.data.user,
        tenant: res.data.tenant,
      };
      setUser(session);
      return session;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        prefilledEmail,
        setPrefilledEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
