import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import { API_URL } from '@/config/api';
import * as SecureStore from 'expo-secure-store';
import { alertService } from '@/services/alertService';

export default function OnboardingScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<'user' | 'chef' | null>(null);
  const [cookingLevel, setCookingLevel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const cookingLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'home_chef', label: 'Home Chef' },
    { value: 'professional', label: 'Professional Chef' },
    { value: 'not_sure', label: 'Not Sure' },
  ];

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedRole) {
        alertService.warning('Vui lòng chọn bạn là người dùng hay đầu bếp', 'Lỗi');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2: Complete onboarding
    if (!cookingLevel) {
      alertService.warning('Vui lòng chọn mức độ nấu ăn của bạn', 'Lỗi');
      return;
    }

    setIsLoading(true);
    try {
      // Get token from SecureStore if not in context
      let authToken = token;
      if (!authToken) {
        authToken = await SecureStore.getItemAsync('auth_token');
      }

      if (!authToken) {
        alertService.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Lỗi').then(() => {
          router.replace('/login');
        });
        return;
      }

      // Update role
      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to home
        router.replace('/(tabs)');
      } else {
        alertService.error(data.message || 'Không thể cập nhật thông tin', 'Lỗi');
      }
    } catch (error: any) {
      alertService.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại', 'Lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]} edges={['top', 'bottom']}>
      {/* Header with Progress Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={[styles.backButtonCircle, isDark && styles.backButtonCircleDark]}>
            <Ionicons name="arrow-back" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: step === 1 ? '50%' : '100%' }]} />
          </View>
        </View>
        
        <View style={styles.progressTextContainer}>
          <ThemedText style={[styles.progressText, { color: colors.primary }]}>{step}/2</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Title */}
          {step === 1 ? (
            <ThemedText style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Chọn vai trò của bạn
            </ThemedText>
          ) : (
            <>
              <ThemedText style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Select Your Cooking Expertise Level
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: isDark ? '#999999' : '#666666' }]}>
                Enhance Your Recipe Recommendations Based on Your Your Cooking Level
              </ThemedText>
            </>
          )}

          {/* Role Selection (Step 1) */}
          {step === 1 ? (
            <View style={styles.section}>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'user' && styles.roleCardSelected,
                    {
                      backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                      borderColor: selectedRole === 'user' ? colors.primary : (isDark ? '#444' : '#E0E0E0'),
                    },
                  ]}
                  onPress={() => setSelectedRole('user')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="person"
                    size={32}
                    color={selectedRole === 'user' ? colors.primary : (isDark ? '#FFFFFF' : '#000000')}
                  />
                  <ThemedText
                    style={[
                      styles.roleTitle,
                      {
                        color: selectedRole === 'user' ? colors.primary : (isDark ? '#FFFFFF' : '#000000'),
                        fontWeight: selectedRole === 'user' ? '700' : '600',
                      },
                    ]}
                  >
                    Người dùng
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'chef' && styles.roleCardSelected,
                    {
                      backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                      borderColor: selectedRole === 'chef' ? colors.primary : (isDark ? '#444' : '#E0E0E0'),
                    },
                  ]}
                  onPress={() => setSelectedRole('chef')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="restaurant"
                    size={32}
                    color={selectedRole === 'chef' ? colors.primary : (isDark ? '#FFFFFF' : '#000000')}
                  />
                  <ThemedText
                    style={[
                      styles.roleTitle,
                      {
                        color: selectedRole === 'chef' ? colors.primary : (isDark ? '#FFFFFF' : '#000000'),
                        fontWeight: selectedRole === 'chef' ? '700' : '600',
                      },
                    ]}
                  >
                    Đầu bếp
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : step === 2 ? (
            /* Cooking Level Selection (Step 2) */
            <View style={styles.section}>
              <View style={styles.optionsContainer}>
                {cookingLevels.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.optionCard,
                      cookingLevel === level.value && {
                        borderColor: colors.primary,
                      },
                      {
                        backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                        borderColor: cookingLevel === level.value ? colors.primary : (isDark ? '#E0E0E0' : '#E0E0E0'),
                      },
                    ]}
                    onPress={() => setCookingLevel(level.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioContainer}>
                      <View style={[
                        styles.radioOuter,
                        cookingLevel === level.value && { borderColor: colors.primary }
                      ]}>
                        {cookingLevel === level.value && (
                          <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                    </View>
                    <ThemedText
                      style={[
                        styles.optionText,
                        {
                          color: cookingLevel === level.value
                            ? (isDark ? '#FFFFFF' : '#000000')
                            : (isDark ? '#FFFFFF' : '#000000'),
                          fontWeight: cookingLevel === level.value ? '600' : '400',
                        },
                      ]}
                    >
                      {level.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: colors.primary },
            (step === 1 && !selectedRole) || (step === 2 && !cookingLevel) ? styles.nextButtonDisabled : null,
          ]}
          onPress={handleNext}
          disabled={isLoading || (step === 1 && !selectedRole) || (step === 2 && !cookingLevel)}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.nextButtonText}>
              {selectedRole ? 'Next' : 'Next'}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeAreaDark: {
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonCircleDark: {
    backgroundColor: '#1A1A2E',
  },
  progressContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressBarDark: {
    backgroundColor: '#2A2A3E',
  },
  progressFill: {
    width: '50%',
    height: '100%',
    borderRadius: 2,
  },
  progressTextContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
        includeFontPadding: false,
      },
    }),
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  section: {
    marginTop: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 120,
  },
  roleCardSelected: {
    borderWidth: 2,
  },
  roleTitle: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  optionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  radioContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
        includeFontPadding: false,
      },
    }),
  },
});
