import '../src/tracking'; // registers the background location task at startup
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { setThemePrefs, useTheme } from '../src/theme';
import { loadSettings } from '../src/storage';
import { planById } from '../src/plans';
import { setPlusFlag } from '../src/plus';
import { ROUTINES } from '../src/routines';
import { AuthProvider, useAuth } from '../src/auth';

export default function RootLayout() {
  useEffect(() => {
    loadSettings().then((s) => { setThemePrefs({ themeId: s.themeId, appearance: s.appearance }); setPlusFlag(s.plus); });
  }, []);
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
  if (loading) return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.accent} size="large" /></View>;

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
        <Stack.Screen name="plans" options={{ headerShown: true, title: 'Training plans' }} />
        <Stack.Screen name="plan/[id]" options={({ route }) => ({ headerShown: true, title: planById(String((route.params as { id?: string })?.id))?.name ?? 'Training plan' })} />
        <Stack.Screen name="shoes" options={{ headerShown: true, title: 'Shoes' }} />
        <Stack.Screen name="race" options={{ headerShown: true, title: 'Your race', presentation: 'modal' }} />
        <Stack.Screen name="routine/[id]" options={({ route }) => ({ headerShown: true, title: ROUTINES[String((route.params as { id?: string })?.id)]?.title ?? 'Warm-up' })} />
        <Stack.Screen name="custom-plan" options={{ headerShown: true, title: 'Build your plan' }} />
        <Stack.Screen name="review" options={{ headerShown: true, title: 'Year in review' }} />
        <Stack.Screen name="plus" options={{ headerShown: true, title: 'Pacer Plus', presentation: 'modal' }} />
        <Stack.Screen name="schedule" options={{ headerShown: true, title: 'Running schedule' }} />
        <Stack.Screen name="achievements" options={{ headerShown: true, title: 'Achievements' }} />
        <Stack.Screen name="friends" options={{ headerShown: true, title: 'Friends', headerBackTitle: 'Back' }} />
        <Stack.Screen name="runner/[uid]" options={{ headerShown: true, title: 'Runner' }} />
        <Stack.Screen name="share/[id]" options={{ headerShown: true, title: 'Share run', presentation: 'modal' }} />
        <Stack.Screen name="challenge/new" options={{ headerShown: true, title: 'New challenge', presentation: 'modal' }} />
        <Stack.Screen name="challenge/[id]" options={{ headerShown: true, title: 'Challenge' }} />
        <Stack.Screen name="add/[username]" options={{ headerShown: true, title: 'Add friend' }} />
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
