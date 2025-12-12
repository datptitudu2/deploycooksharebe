import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { LogBox } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { AlertProvider } from '@/components/providers/AlertProvider';
import { alertService } from '@/services/alertService';

export const unstable_settings = {
  anchor: '(tabs)',
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    text: Colors.dark.text,
  },
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    text: Colors.light.text,
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isPublicRoute = segments[0] === 'login' || segments[0] === 'register';
    const isRecipeRoute = segments[0] === 'recipe';

    // Only redirect if user is not logged in and trying to access protected tabs
    if (!user && inAuthGroup) {
      router.replace('/login');
    } 
    // Don't redirect if user is navigating to recipe routes or public routes
    // Only redirect to tabs if user is logged in and on login/register pages
    else if (user && (segments[0] === 'login' || segments[0] === 'register')) {
      router.replace('/(tabs)');
    }
    // Allow navigation to recipe routes and other routes
  }, [user, segments, isLoading]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
        <AlertProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="meal-planning" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="recipe" />
            <Stack.Screen name="messages/index" />
            <Stack.Screen name="messages/[partnerId]" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} translucent={false} />
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Tắt LogBox error overlay (toast error ở cuối màn hình)
    // Điều này sẽ ẩn tất cả error toast/snackbar ở cuối màn hình
    if (LogBox) {
      LogBox.ignoreAllLogs(true);
    }
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
