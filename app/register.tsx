import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { alertService } from '@/services/alertService';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Validate password
    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alertService.warning('Vui lòng kiểm tra lại thông tin đã nhập', 'Lỗi nhập liệu');
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      // Navigate to onboarding instead of home
      router.replace('/onboarding');
    } catch (error: any) {
      alertService.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại', 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <ThemedView style={styles.content}>
          <ThemedView style={styles.titleContainer}>
            <MaterialIcons name="restaurant" size={48} color={colors.primary} />
            <ThemedText type="title" style={styles.title}>
              CookShare
            </ThemedText>
          </ThemedView>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Tạo tài khoản mới
          </ThemedText>

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Họ và tên</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: errors.name ? colors.error : '#E0E0E0',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                  },
                ]}
                placeholder="Nhập họ và tên"
                placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined });
                  }
                }}
                autoCapitalize="words"
              />
              {errors.name && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {errors.name}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: errors.email ? colors.error : '#E0E0E0',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                  },
                ]}
                placeholder="Nhập email của bạn"
                placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {errors.email}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Mật khẩu</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: errors.password ? colors.error : '#E0E0E0',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                  },
                ]}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                  // Clear confirm password error if passwords match
                  if (errors.confirmPassword && text === confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.password && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {errors.password}
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Xác nhận mật khẩu</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: errors.confirmPassword ? colors.error : '#E0E0E0',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                  },
                ]}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.confirmPassword && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {errors.confirmPassword}
                </ThemedText>
              )}
            </ThemedView>


            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Đăng ký</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/login')}
            >
              <ThemedText style={styles.linkText}>
                Đã có tài khoản? <ThemedText style={[styles.linkText, { color: colors.primary }]}>Đăng nhập</ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 42,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 50,
  },
  errorText: {
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
  },
});

