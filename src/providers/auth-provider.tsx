import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data: { session: savedSession } }) => {
      if (active) {
        setSession(savedSession);
        setReady(true);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setReady(true);
      }
    });

    const handleUrl = async ({ url }: { url: string }) => {
      if (url.includes('code=')) await supabase.auth.exchangeCodeForSession(url);
    };
    Linking.getInitialURL().then((url) => {
      if (url) void handleUrl({ url });
    });
    const linkingSubscription = Linking.addEventListener('url', handleUrl);

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      ready,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
