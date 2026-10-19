import { createContext } from 'react';
import type { Credentials, Registration, User } from '../types/auth';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login(input: Credentials): Promise<void>;
  register(input: Registration): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
