import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from '@/components/SplashScreen';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

function RootContent() {
  const { ready } = useAuth();
  if (!ready) return <SplashScreen />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
