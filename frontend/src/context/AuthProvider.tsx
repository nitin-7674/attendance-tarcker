import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as authService from '../services/auth.service';
import { ApiError } from '../services/api';
import type { Credentials, Registration, User } from '../types/auth';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Unable to restore the session.', error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(input: Credentials) {
        setUser(await authService.login(input));
      },
      async register(input: Registration) {
        setUser(await authService.register(input));
      },
      async logout() {
        await authService.logout();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
