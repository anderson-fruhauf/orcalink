import { createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  firebaseUid: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'FREE' | 'PRO';
}

export interface UserSession {
  firebaseUser: FirebaseUser;
  backendUser?: BackendUser;
  tenant?: Tenant;
}

export interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserSession>;
  signUp: (email: string, password: string, name: string, companyName: string) => Promise<UserSession>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  prefilledEmail: string;
  setPrefilledEmail: (email: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
