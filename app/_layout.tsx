import '../src/tracking'; // registers the background location task at startup
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { setThemePrefs, useTheme } from '../src/theme';
import { loadSettings } from '../src/storage';
import { AuthProvider, useAuth } from '../src/auth';

export default function RootLayout() {
  useEffect(() => { loadSettings().then((s) => setThemePrefs({ themeId: s.themeId, appearance: s.appearance })); }, []);
  return (
    <AuthProvider>
      <ThemedStatusBar />
      <Routes />
    </AuthProvider>
  );
}

function ThemedStatusBar() {
  return <StatusBar style={useTheme().dark ? 'light' : 'dark'} />;
}

function Routes() {
  const t = useTheme();
  const { loading, configured, user, verified, username } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  // Until Firebase is set up (configured is false), sign-in is skipped so the app can still be tested.
  const inApp = !configured || (!!user && verified && !!username);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.bg },
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="run-detail/[id]" options={{ headerShown: true, title: 'Run' }} />
        <Stack.Screen name="coach" options={{ headerShown: true, title: 'Coach', presentation: 'modal' }} />
        <Stack.Screen name="workout/edit" options={{ headerShown: true, title: 'Interval workout', presentation: 'modal' }} />
        <Stack.Screen name="change-username" options={{ headerShown: true, title: 'Username', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={configured && !user}>
        <Stack.Screen name="(auth)/sign-in" />
        <Stack.Screen name="(auth)/sign-up" />
        <Stack.Screen name="(auth)/forgot" />
      </Stack.Protected>
      <Stack.Protected guard={configured && !!user && !verified}>
        <Stack.Screen name="(auth)/verify" />
      </Stack.Protected>
      <Stack.Protected guard={configured && !!user && verified && !username}>
        <Stack.Screen name="(auth)/username" />
      </Stack.Protected>
    </Stack>
  );
}
