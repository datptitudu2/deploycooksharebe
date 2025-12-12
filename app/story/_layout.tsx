import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function StoryLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
        contentStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0d0d1a' : '#f8f9fa',
        },
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="all-tips" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

