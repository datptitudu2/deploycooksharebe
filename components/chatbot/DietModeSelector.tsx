import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type DietMode = 'none' | 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'healthy' | 'vegetarian' | 'low-carb' | 'keto';

interface DietModeSelectorProps {
  selectedMode: DietMode;
  onSelectMode: (mode: DietMode) => void;
}

const dietModes: Array<{ id: DietMode; label: string; icon: string; description: string }> = [
  { id: 'none', label: 'Bình thường', icon: 'restaurant', description: 'Không giới hạn' },
  { id: 'weight-loss', label: 'Giảm cân', icon: 'trending-down', description: 'Calo thấp, nhiều rau' },
  { id: 'weight-gain', icon: 'trending-up', label: 'Tăng cân', description: 'Calo cao, dinh dưỡng' },
  { id: 'muscle-gain', icon: 'fitness-center', label: 'Tăng cơ', description: 'Nhiều protein' },
  { id: 'healthy', icon: 'favorite', label: 'Khỏe mạnh', description: 'Cân bằng dinh dưỡng' },
  { id: 'vegetarian', icon: 'eco', label: 'Chay', description: 'Không thịt' },
  { id: 'low-carb', icon: 'grain', label: 'Ít tinh bột', description: 'Low carb' },
  { id: 'keto', icon: 'local-fire-department', label: 'Keto', description: 'Ketogenic' },
];

export function DietModeSelector({ selectedMode, onSelectMode }: DietModeSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {dietModes.map((mode) => {
        const isSelected = selectedMode === mode.id;
        return (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeButton,
              {
                backgroundColor: isSelected ? colors.primary : (colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5'),
                borderColor: isSelected ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => onSelectMode(mode.id)}
          >
            <MaterialIcons 
              name={mode.icon as any} 
              size={20} 
              color={isSelected ? '#FFFFFF' : colors.text} 
            />
            <ThemedText 
              style={[
                styles.modeLabel,
                { color: isSelected ? '#FFFFFF' : colors.text },
              ]}
            >
              {mode.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 60,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
    marginRight: 8,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

