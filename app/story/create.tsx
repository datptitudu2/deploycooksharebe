import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import storyService from '@/services/storyService';
import { userService } from '@/services';
import * as Haptics from 'expo-haptics';
import { alertService } from '@/services/alertService';

// Các template tip mẫu
const TIP_TEMPLATES = [
  { title: 'Mẹo luộc rau', icon: '🥬' },
  { title: 'Bí quyết nấu cơm', icon: '🍚' },
  { title: 'Ướp thịt ngon', icon: '🥩' },
  { title: 'Bảo quản thực phẩm', icon: '🧊' },
  { title: 'Mẹo nấu nhanh', icon: '⚡' },
  { title: 'Gia vị đúng cách', icon: '🧂' },
];

export default function CreateStoryScreen() {
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [storyType, setStoryType] = useState<'tip' | 'image'>('tip');
  const [tipTitle, setTipTitle] = useState('');
  const [tipContent, setTipContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Fetch user profile để lấy avatar và name đúng
  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          const response = await userService.getProfile();
          if (response.success && response.data) {
            setUserAvatar(response.data.avatar || null);
            setUserName(response.data.name || user?.name || 'Bạn');
          } else {
            setUserAvatar(null);
            setUserName(user?.name || 'Bạn');
          }
        } catch (error) {
          setUserAvatar(null);
          setUserName(user?.name || 'Bạn');
        }
      } else {
        setUserAvatar(null);
        setUserName(user?.name || 'Bạn');
      }
    };
    
    fetchProfile();
  }, [token, user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertService.warning('Vui lòng cho phép truy cập thư viện ảnh', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alertService.warning('Vui lòng cho phép truy cập camera', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (storyType === 'tip') {
      if (!tipTitle.trim() || !tipContent.trim()) {
        alertService.warning('Vui lòng nhập tiêu đề và nội dung mẹo', 'Thiếu thông tin');
        return;
      }
    } else {
      if (!selectedImage) {
        alertService.warning('Vui lòng chọn ảnh cho story', 'Thiếu ảnh');
        return;
      }
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const storyData = storyType === 'tip' 
        ? {
            type: 'tip' as const,
            tipTitle: tipTitle.trim(),
            tipContent: tipContent.trim(),
            duration: 8,
          }
        : {
            type: 'image' as const,
            content: selectedImage!,
            caption: caption.trim(),
            duration: 5,
          };

      const response = await storyService.createStory(storyData);

      if (response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alertService.success('Story của bạn đã được đăng', 'Thành công!').then(() => {
          router.back();
        });
      } else {
        throw new Error(response.message || 'Đăng story thất bại');
      }
    } catch (error: any) {
      alertService.error(error.message || 'Không thể đăng story. Vui lòng thử lại.', 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: typeof TIP_TEMPLATES[0]) => {
    setTipTitle(template.title);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          Tạo Story
        </ThemedText>
        
        <TouchableOpacity
          style={[styles.postButton, loading && styles.postButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              style={styles.postButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={styles.postButtonText}>Đăng</ThemedText>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Story Type Selector */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                storyType === 'tip' && styles.typeOptionActive,
                { backgroundColor: storyType === 'tip' ? colors.primary : (isDark ? '#1f1f3a' : '#fff') }
              ]}
              onPress={() => setStoryType('tip')}
            >
              <Ionicons 
                name="bulb-outline" 
                size={24} 
                color={storyType === 'tip' ? '#fff' : colors.text} 
              />
              <ThemedText style={[
                styles.typeOptionText,
                { color: storyType === 'tip' ? '#fff' : colors.text }
              ]}>
                Mẹo nấu ăn
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                storyType === 'image' && styles.typeOptionActive,
                { backgroundColor: storyType === 'image' ? colors.primary : (isDark ? '#1f1f3a' : '#fff') }
              ]}
              onPress={() => setStoryType('image')}
            >
              <Ionicons 
                name="image-outline" 
                size={24} 
                color={storyType === 'image' ? '#fff' : colors.text} 
              />
              <ThemedText style={[
                styles.typeOptionText,
                { color: storyType === 'image' ? '#fff' : colors.text }
              ]}>
                Ảnh/Video
              </ThemedText>
            </TouchableOpacity>
          </View>

          {storyType === 'tip' ? (
            /* Tip Form */
            <View style={styles.formSection}>
              {/* Quick Templates */}
              <View style={styles.templatesSection}>
                <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Chọn mẫu nhanh
                </ThemedText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templatesList}
                >
                  {TIP_TEMPLATES.map((template, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.templateChip,
                        tipTitle === template.title && styles.templateChipActive,
                        { backgroundColor: tipTitle === template.title ? colors.primary : (isDark ? '#1f1f3a' : '#fff') }
                      ]}
                      onPress={() => selectTemplate(template)}
                    >
                      <ThemedText style={styles.templateIcon}>{template.icon}</ThemedText>
                      <ThemedText style={[
                        styles.templateText,
                        { color: tipTitle === template.title ? '#fff' : colors.text }
                      ]}>
                        {template.title}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                  Tiêu đề mẹo
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: isDark ? '#1f1f3a' : '#fff',
                      color: colors.text,
                      borderColor: isDark ? '#2a2a4a' : '#e0e0e0'
                    }
                  ]}
                  placeholder="VD: Mẹo luộc rau xanh"
                  placeholderTextColor={colors.textSecondary}
                  value={tipTitle}
                  onChangeText={setTipTitle}
                  maxLength={50}
                />
                <ThemedText style={[styles.charCount, { color: colors.textSecondary }]}>
                  {tipTitle.length}/50
                </ThemedText>
              </View>

              {/* Content Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                  Nội dung chi tiết
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    { 
                      backgroundColor: isDark ? '#1f1f3a' : '#fff',
                      color: colors.text,
                      borderColor: isDark ? '#2a2a4a' : '#e0e0e0'
                    }
                  ]}
                  placeholder="Chia sẻ mẹo nấu ăn hữu ích của bạn..."
                  placeholderTextColor={colors.textSecondary}
                  value={tipContent}
                  onChangeText={setTipContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={300}
                />
                <ThemedText style={[styles.charCount, { color: colors.textSecondary }]}>
                  {tipContent.length}/300
                </ThemedText>
              </View>

              {/* Preview */}
              <View style={styles.previewSection}>
                <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Xem trước
                </ThemedText>
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  style={styles.tipPreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.previewAvatar}>
                    <Image
                      source={{ 
                        uri: userAvatar && userAvatar.trim() !== '' 
                          ? userAvatar 
                          : `https://i.pravatar.cc/100?u=${user?.id || 'user'}`
                      }}
                      style={styles.previewAvatarImg}
                    />
                  </View>
                  <ThemedText style={styles.previewTitle} numberOfLines={1}>
                    {tipTitle || 'Tiêu đề mẹo'}
                  </ThemedText>
                  <ThemedText style={styles.previewContent} numberOfLines={3}>
                    {tipContent || 'Nội dung mẹo của bạn sẽ hiển thị ở đây...'}
                  </ThemedText>
                  <ThemedText style={styles.previewAuthor}>
                    - {userName}
                  </ThemedText>
                </LinearGradient>
              </View>
            </View>
          ) : (
            /* Image Form */
            <View style={styles.formSection}>
              {/* Image Picker */}
              <View style={styles.imagePickerSection}>
                {selectedImage ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Ionicons name="close-circle" size={32} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePickerButtons}>
                    <TouchableOpacity
                      style={[styles.pickerBtn, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}
                      onPress={pickImage}
                    >
                      <Ionicons name="images-outline" size={40} color={colors.primary} />
                      <ThemedText style={[styles.pickerBtnText, { color: colors.text }]}>
                        Thư viện
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pickerBtn, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera-outline" size={40} color={colors.primary} />
                      <ThemedText style={[styles.pickerBtnText, { color: colors.text }]}>
                        Chụp ảnh
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Caption Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                  Chú thích (tùy chọn)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    { 
                      backgroundColor: isDark ? '#1f1f3a' : '#fff',
                      color: colors.text,
                      borderColor: isDark ? '#2a2a4a' : '#e0e0e0',
                      height: 100,
                    }
                  ]}
                  placeholder="Thêm chú thích cho ảnh..."
                  placeholderTextColor={colors.textSecondary}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={150}
                />
                <ThemedText style={[styles.charCount, { color: colors.textSecondary }]}>
                  {caption.length}/150
                </ThemedText>
              </View>
            </View>
          )}

          {/* Info Note */}
          <View style={[styles.infoNote, { backgroundColor: isDark ? '#1f1f3a' : '#fff3cd' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#856404" />
            <ThemedText style={styles.infoNoteText}>
              Story sẽ tự động xóa sau 24 giờ
            </ThemedText>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  typeOptionActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    padding: 16,
  },
  templatesSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templatesList: {
    gap: 10,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  templateChipActive: {
    elevation: 2,
  },
  templateIcon: {
    fontSize: 18,
  },
  templateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    height: 140,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  previewSection: {
    marginTop: 10,
  },
  tipPreview: {
    borderRadius: 16,
    padding: 16,
    minHeight: 180,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 2,
    marginBottom: 10,
  },
  previewAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  previewContent: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 10,
  },
  previewAuthor: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  imagePickerSection: {
    marginBottom: 20,
  },
  imagePickerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  pickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoNoteText: {
    fontSize: 13,
    color: '#856404',
    flex: 1,
  },
});

