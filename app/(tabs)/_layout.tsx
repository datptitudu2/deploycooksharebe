import { Tabs, useNavigation } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/ui/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Ensure insets are valid numbers (fallback for Android)
  const bottomInset = typeof insets?.bottom === 'number' && !isNaN(insets.bottom) 
    ? insets.bottom 
    : Platform.OS === 'android' ? 0 : 0;

  useEffect(() => {
    // Show loading when tab changes
    const unsubscribe = navigation.addListener('state', () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 200);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1A1A2E' : '#FFFFFF',
          borderTopColor: colorScheme === 'dark' ? '#2A2A3E' : '#E5E5E5',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'android' ? Math.max(bottomInset, 8) : bottomInset,
          height: Platform.OS === 'android' ? 85 + Math.max(bottomInset, 8) : 85 + bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      {/* Tab 1: Khám phá (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "compass" : "compass-outline"} 
              size={focused ? 28 : 24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Tab 2: Công thức */}
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Công thức',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "book" : "book-outline"} 
              size={focused ? 28 : 24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Tab 3: Lịch Ăn */}
      <Tabs.Screen
        name="meal-planning"
        options={{
          title: 'Lịch Ăn',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "calendar" : "calendar-outline"} 
              size={focused ? 28 : 24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Tab 4: AI Chat (ẩn tab bar khi vào) */}
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "chatbubbles" : "chatbubbles-outline"} 
              size={focused ? 28 : 24} 
              color={color} 
            />
          ),
          tabBarStyle: { display: 'none' },
        }}
      />
      
      {/* Tab 5: Cá nhân */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={focused ? 28 : 24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
    {isLoading && (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
