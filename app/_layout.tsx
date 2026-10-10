import '../src/tracking'; // registers the background location task at startup
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="run-detail/[id]" options={{ headerShown: true, title: 'Run' }} />
        <Stack.Screen name="workout/edit" options={{ headerShown: true, title: 'Interval workout', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
