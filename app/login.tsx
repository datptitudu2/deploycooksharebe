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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import userService from '@/services/userService';
import { alertService } from '@/services/alertService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [isLoadingForgot, setIsLoadingForgot] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState<string | undefined>();
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string } = {};

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Validate password
    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alertService.warning('Vui lòng kiểm tra lại thông tin đã nhập', 'Lỗi nhập liệu');
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
    
      const errorMessage = error?.response?.data?.message || error?.message || 'Email hoặc mật khẩu không đúng';
      alertService.error(errorMessage, 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      alertService.warning('Vui lòng nhập email');
      return;
    }

    if (!validateEmail(forgotEmail.trim())) {
      alertService.warning('Email không hợp lệ');
      return;
    }

    setIsLoadingForgot(true);
    try {
      const response = await userService.forgotPassword(forgotEmail.trim());
      if (response.success) {
        setReceivedOtp(response.data?.otp); // For development
        setForgotStep('reset');
        const message = response.data?.otp
          ? `Mã OTP: ${response.data.otp}\n\n(Lưu ý: Đây là chế độ phát triển. Trong production, OTP sẽ được gửi qua email.)`
          : 'Mã OTP đã được gửi. Vui lòng kiểm tra email.';
        alertService.success(message);
      } else {
        alertService.error(response.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      alertService.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoadingForgot(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      alertService.warning('Vui lòng nhập mã OTP');
      return;
    }

    if (!newPassword.trim()) {
      alertService.warning('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      alertService.warning('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      alertService.warning('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoadingForgot(true);
    try {
      const response = await userService.resetPassword(forgotEmail.trim(), otp.trim(), newPassword);
      if (response.success) {
        alertService.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.').then(() => {
          setShowForgotPassword(false);
          setForgotStep('email');
          setForgotEmail('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
          setReceivedOtp(undefined);
        });
      } else {
        alertService.error(response.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      alertService.error(error.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoadingForgot(false);
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
            Chào mừng trở lại!
          </ThemedText>

          <ThemedView style={styles.form}>
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
                placeholder="Nhập mật khẩu"
                placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
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

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setShowForgotPassword(true)}
            >
              <ThemedText style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Quên mật khẩu?
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Đăng nhập</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/register')}
            >
              <ThemedText style={styles.linkText}>
                Chưa có tài khoản? <ThemedText style={[styles.linkText, { color: colors.primary }]}>Đăng ký ngay</ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowForgotPassword(false);
          setForgotStep('email');
          setForgotEmail('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
          setReceivedOtp(undefined);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                {forgotStep === 'email' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotStep('email');
                  setForgotEmail('');
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setReceivedOtp(undefined);
                }}
              >
                <MaterialIcons name="close" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {forgotStep === 'email' ? (
                <>
                  <ThemedText style={[styles.modalLabel, { color: colorScheme === 'dark' ? '#E0E0E0' : '#666666' }]}>
                    Email
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5',
                      },
                    ]}
                    placeholder="Nhập email của bạn"
                    placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleForgotPassword}
                    disabled={isLoadingForgot}
                  >
                    {isLoadingForgot ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.modalButtonText}>Gửi mã OTP</ThemedText>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <ThemedText style={[styles.modalLabel, { color: colorScheme === 'dark' ? '#E0E0E0' : '#666666' }]}>
                    Mã OTP
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5',
                      },
                    ]}
                    placeholder="Nhập mã OTP"
                    placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  {receivedOtp && (
                    <ThemedText style={[styles.modalHint, { color: colors.primary }]}>
                      Mã OTP: {receivedOtp}
                    </ThemedText>
                  )}

                  <ThemedText style={[styles.modalLabel, { color: colorScheme === 'dark' ? '#E0E0E0' : '#666666', marginTop: 16 }]}>
                    Mật khẩu mới
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5',
                      },
                    ]}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <ThemedText style={[styles.modalLabel, { color: colorScheme === 'dark' ? '#E0E0E0' : '#666666', marginTop: 16 }]}>
                    Xác nhận mật khẩu
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5',
                      },
                    ]}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleResetPassword}
                    disabled={isLoadingForgot}
                  >
                    {isLoadingForgot ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.modalButtonText}>Đặt lại mật khẩu</ThemedText>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  forgotPasswordButton: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 50,
    marginBottom: 16,
  },
  modalButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalHint: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
});

