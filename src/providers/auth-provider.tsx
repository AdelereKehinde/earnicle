// src/providers/auth-provider.tsx
// Single source of truth for the auth session.
// On launch it restores the persisted session before rendering, so the app
// never flashes the Login screen for an already-authenticated user.
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  authApi,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  Profile,
  TokenResponse,
} from '../../lib/api';

type Session = {
  access_token: string;
  refresh_token: string;
  user: Profile;
};

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the persisted session once, before any screen renders.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        const refreshToken = await getRefreshToken();
        if (!accessToken || !refreshToken) return;

        // getMe auto-refreshes the access token on 401 (see lib/api.ts).
        const user = await authApi.getMe();
        if (!active) return;
        const newAccess = await getAccessToken();
        const newRefresh = await getRefreshToken();
        setSession({
          access_token: newAccess ?? accessToken,
          refresh_token: newRefresh ?? refreshToken,
          user,
        });
      } catch {
        // Invalid/expired session — api layer already cleared the tokens.
        setSession(null);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persistSession = useCallback(async (tokens: TokenResponse) => {
    await setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.getMe();
    setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, user });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login(email, password);
      await persistSession(tokens);
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      const tokens = await authApi.signup(fullName, email, password);
      await persistSession(tokens);
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    await clearTokens();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, ready, signIn, signUp, signOut }),
    [session, ready, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}