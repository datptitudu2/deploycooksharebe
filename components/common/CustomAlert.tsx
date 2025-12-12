import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Dimensions, Platform, SafeAreaView } from 'react-native';
import { ThemedText } from '@/components/ui/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
  buttons?: AlertButton[];
  showIcon?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export function CustomAlert({ 
  visible, 
  title, 
  message, 
  onClose, 
  buttonText = 'Tuyệt vời!',
  buttons,
  showIcon = true,
  iconName = 'information-circle',
  iconColor = '#FF6B35',
}: CustomAlertProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // Nếu có buttons, dùng buttons. Nếu không, dùng buttonText mặc định
  const displayButtons = buttons && buttons.length > 0 
    ? buttons 
    : [{ text: buttonText, onPress: onClose, style: 'default' as const }];

  const getIconName = () => {
    if (title.includes('Thành công') || title.includes('✅')) return 'checkmark-circle';
    if (title.includes('Lỗi') || title.includes('❌')) return 'close-circle';
    if (title.includes('Cảnh báo') || title.includes('⚠️')) return 'warning';
    return iconName;
  };

  const getIconColor = () => {
    if (title.includes('Thành công') || title.includes('✅')) return '#4CAF50';
    if (title.includes('Lỗi') || title.includes('❌')) return '#FF3B30';
    if (title.includes('Cảnh báo') || title.includes('⚠️')) return '#FFB347';
    return iconColor;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.container}>
              <LinearGradient
                colors={isDark ? ['#2A1F1A', '#1A1A2E'] : ['#FFFFFF', '#FFF8F5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.containerGradient}
              >
                <View style={styles.content}>
                  {showIcon && (
                    <View style={styles.iconContainer}>
                      <Ionicons 
                        name={getIconName()} 
                        size={Platform.OS === 'android' ? 56 : 60} 
                        color={getIconColor()} 
                      />
                    </View>
                  )}
                  <ThemedText style={[styles.title, { color: colors.text }]}>
                    {title.replace(/[⚠️❌✅🎉]/g, '').trim()}
                  </ThemedText>
                  <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
                    {message}
                  </ThemedText>
                  <View style={styles.buttonsContainer}>
                    {displayButtons.map((button, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.button,
                          displayButtons.length > 1 && styles.buttonMultiple,
                          button.style === 'destructive' && styles.buttonDestructive,
                          button.style === 'cancel' && styles.buttonCancel,
                        ]}
                        onPress={() => {
                          button.onPress();
                          onClose();
                        }}
                        activeOpacity={0.8}
                      >
                        {button.style === 'destructive' || button.style === 'default' ? (
                          <LinearGradient
                            colors={button.style === 'destructive' 
                              ? ['#FF3B30', '#E63946'] 
                              : ['#FF6B35', '#FF8C42']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                          >
                            <ThemedText style={styles.buttonText}>{button.text}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={[styles.buttonGradient, styles.buttonCancelBg]}>
                            <ThemedText style={[styles.buttonText, styles.buttonCancelText]}>
                              {button.text}
                            </ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  containerGradient: {
    borderRadius: 20,
  },
  content: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    width: Platform.OS === 'android' ? 80 : 100,
    height: Platform.OS === 'android' ? 80 : 100,
    borderRadius: Platform.OS === 'android' ? 40 : 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 26 : 24,
    fontWeight: Platform.OS === 'ios' ? '900' : '800',
    marginBottom: 12,
    textAlign: 'center',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  message: {
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 24 : 22,
    marginBottom: 28,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: Platform.OS === 'android' ? 12 : 14,
    overflow: 'hidden',
    minHeight: Platform.OS === 'android' ? 48 : 50,
  },
  buttonMultiple: {
    flex: 1,
  },
  buttonDestructive: {
    // Destructive button styling
  },
  buttonCancel: {
    // Cancel button styling
  },
  buttonGradient: {
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Platform.OS === 'android' ? 12 : 14,
    minHeight: Platform.OS === 'android' ? 48 : 50,
  },
  buttonCancelBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonText: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: Platform.OS === 'android' ? '600' : '700',
    color: '#FFFFFF',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
        includeFontPadding: false,
      },
    }),
  },
  buttonCancelText: {
    color: '#666666',
  },
});

