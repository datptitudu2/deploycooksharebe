import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '@/config/api';
import axios from 'axios';
import { StreakBreakAnimation } from '@/components/common/StreakBreakAnimation';
import { alertService } from '@/services/alertService';

const CATEGORIES = [
  { id: 'vietnamese', name: 'Món Việt' },
  { id: 'asian', name: 'Món Á' },
  { id: 'western', name: 'Món Âu' },
  { id: 'dessert', name: 'Tráng miệng' },
  { id: 'healthy', name: 'Healthy' },
  { id: 'quick', name: 'Nhanh' },
  { id: 'other', name: 'Khác' },
];

const DIFFICULTIES = ['Dễ', 'Trung bình', 'Khó'];

export default function CreateRecipeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState('vietnamese');
  const [difficulty, setDifficulty] = useState('Dễ');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<Array<{ url: string; title?: string; isLocal?: boolean; fileSize?: number }>>([]);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alertService.warning('Vui lòng cấp quyền truy cập thư viện ảnh', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10, // Tối đa 10 ảnh
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 10)); // Giới hạn tối đa 10 ảnh
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const handleAddVideo = async () => {
    setShowVideoOptions(true);
  };

  const handleVideoFromLibrary = async () => {
    setShowVideoOptions(false);
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
      alertService.warning('Vui lòng cấp quyền truy cập thư viện', 'Cần quyền truy cập');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['videos'],
              allowsEditing: false,
              quality: 1,
              videoMaxDuration: 900, // 15 phút
            });

            if (!result.canceled && result.assets[0]) {
              const video = result.assets[0];
              const fileSizeMB = (video.fileSize || 0) / 1024 / 1024;
              
              // Cảnh báo nếu video quá lớn
              if (fileSizeMB > 100) {
        alertService.confirm(
                  `Video của bạn (${fileSizeMB.toFixed(1)}MB) lớn hơn 100MB. Cloudinary free tier có giới hạn 100MB/video. Video có thể không upload được hoặc tốn phí.`,
          'Cảnh báo',
          () => {
                        setVideos(prev => [...prev, { 
                          url: video.uri, 
                          isLocal: true,
                          title: video.fileName || 'Video từ thư viện',
                          fileSize: fileSizeMB,
                        }]);
          }
                );
              } else {
                setVideos(prev => [...prev, { 
                  url: video.uri, 
                  isLocal: true,
                  title: video.fileName || 'Video từ thư viện',
                  fileSize: fileSizeMB,
                }]);
              }
            }
  };

  const handleVideoFromUrl = () => {
    setShowVideoOptions(false);
    setShowVideoUrlInput(true);
  };

  const handleAddVideoUrl = () => {
    if (videoUrlInput.trim()) {
      setVideos(prev => [...prev, { url: videoUrlInput.trim() }]);
      setVideoUrlInput('');
      setShowVideoUrlInput(false);
    }
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alertService.warning('Vui lòng nhập tên món ăn', 'Lỗi');
      return;
    }

    if (!token) {
      alertService.warning('Vui lòng đăng nhập', 'Lỗi').then(() => {
      router.back();
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      formData.append('name', name);
      if (description) formData.append('description', description);
      formData.append('ingredients', JSON.stringify(ingredients.split('\n').filter(i => i.trim())));
      formData.append('instructions', JSON.stringify(instructions.split('\n').filter(i => i.trim())));
      formData.append('category', category);
      formData.append('difficulty', difficulty);
      if (prepTime) formData.append('prepTime', prepTime);
      if (cookTime) formData.append('cookTime', cookTime);
      if (servings) formData.append('servings', servings);
      
      // Upload nhiều ảnh
      if (images.length > 0) {
        images.forEach((img, index) => {
          const imageUri = Platform.OS === 'android' ? img : img.replace('file://', '');
          formData.append('images', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `recipe-image-${index}.jpg`,
          } as any);
        });
        // Set ảnh đầu tiên làm ảnh chính (backward compatible)
        const firstImageUri = Platform.OS === 'android' ? images[0] : images[0].replace('file://', '');
        formData.append('image', {
          uri: firstImageUri,
          type: 'image/jpeg',
          name: 'recipe-image.jpg',
        } as any);
      }

      // Upload videos (local files) và gửi URLs
      const localVideos = videos.filter(v => v.isLocal);
      const urlVideos = videos.filter(v => !v.isLocal);
      
      // Upload local videos
      if (localVideos.length > 0) {
        localVideos.forEach((video, index) => {
          const videoUri = Platform.OS === 'android' ? video.url : video.url.replace('file://', '');
          formData.append('videos', {
            uri: videoUri,
            type: 'video/mp4',
            name: `recipe-video-${index}.mp4`,
          } as any);
        });
      }
      
      // Gửi video URLs (sẽ được combine với uploaded videos trên backend)
      if (urlVideos.length > 0) {
        formData.append('videos', JSON.stringify(urlVideos.map(v => ({ url: v.url, title: v.title }))));
      }

      const response = await axios.post(
        `${API_URL}/recipe-management`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Kiểm tra level up
        if (response.data.leveledUp) {
          // Hiển thị animation break chuỗi lửa
          setNewLevel(response.data.newLevel || 1);
          setShowLevelUpAnimation(true);
          
          // Hiển thị custom alert ngay sau khi animation kết thúc
          setTimeout(() => {
            setShowLevelUpAnimation(false); // Ẩn animation
            const message = `Tạo công thức thành công!\n\nBạn đã lên Level ${response.data.newLevel}!${response.data.reward?.points ? `\n\n+${response.data.reward.points} điểm thưởng` : ''}${response.data.reward?.badge ? `\n\n🏆 Unlock badge mới!` : ''}`;
            alertService.info(message, '🎉 Chúc mừng!');
          }, 12000); // Sau ~12 giây animation
        } else {
          alertService.success(`Tạo công thức thành công! +${response.data.pointsEarned || 20} điểm`, 'Thành công').then(() => {
            router.back();
          });
        }
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể tạo công thức', 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={[styles.header, isDark && styles.headerDark]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>Tạo công thức mới</ThemedText>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Images Upload */}
              <View style={styles.section}>
                <View style={styles.imagesHeader}>
                  <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                    Ảnh món ăn {images.length > 0 && `(${images.length}/10)`}
                  </ThemedText>
                  {images.length > 0 && (
                    <TouchableOpacity
                      style={[styles.addMoreBtn, { backgroundColor: colors.primary + '20' }]}
                      onPress={handlePickImages}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                      <ThemedText style={[styles.addMoreText, { color: colors.primary }]}>
                        Thêm ảnh
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
                
                {images.length === 0 ? (
                  <TouchableOpacity
                    style={[styles.imageContainer, isDark && styles.imageContainerDark]}
                    onPress={handlePickImages}
                  >
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
                      <ThemedText style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                        Chọn ảnh món ăn
                      </ThemedText>
                      <ThemedText style={[styles.imagePlaceholderSubText, { color: colors.textSecondary }]}>
                        Có thể chọn nhiều ảnh (tối đa 10)
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesScrollView}
                    contentContainerStyle={styles.imagesContainer}
                  >
                    {images.map((img, index) => (
                      <View key={index} style={styles.imageItem}>
                        <Image source={{ uri: img }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                        </TouchableOpacity>
                        {index === 0 && (
                          <View style={[styles.mainImageBadge, { backgroundColor: colors.primary }]}>
                            <ThemedText style={styles.mainImageBadgeText}>Ảnh chính</ThemedText>
                          </View>
                        )}
                      </View>
                    ))}
                    {images.length < 10 && (
                      <TouchableOpacity
                        style={[styles.addImageBtn, isDark && styles.addImageBtnDark]}
                        onPress={handlePickImages}
                      >
                        <Ionicons name="add" size={32} color={colors.textSecondary} />
                        <ThemedText style={[styles.addImageText, { color: colors.textSecondary }]}>
                          Thêm
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
              </View>

              {/* Videos Upload */}
              <View style={styles.section}>
                <View style={styles.imagesHeader}>
                  <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                    Video hướng dẫn {videos.length > 0 && `(${videos.length})`}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.addMoreBtn, { backgroundColor: colors.primary + '20' }]}
                    onPress={handleAddVideo}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <ThemedText style={[styles.addMoreText, { color: colors.primary }]}>
                      Thêm video
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                
                {videos.length > 0 && (
                  <View style={styles.videosContainer}>
                    {videos.map((video, index) => (
                      <View key={index} style={[styles.videoItem, isDark && styles.videoItemDark]}>
                        <Ionicons name="videocam" size={20} color={colors.primary} />
                        <View style={styles.videoInfo}>
                          <ThemedText style={[styles.videoUrl, { color: colors.text }]} numberOfLines={1}>
                            {video.url}
                          </ThemedText>
                          {video.title && (
                            <ThemedText style={[styles.videoTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                              {video.title}
                            </ThemedText>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.removeVideoBtn}
                          onPress={() => handleRemoveVideo(index)}
                        >
                          <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Basic Info */}
              <View style={styles.section}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  Tên món ăn *
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="VD: Phở bò Hà Nội"
                  placeholderTextColor={colors.textSecondary}
                />

                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  Mô tả
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, isDark && styles.inputDark, { color: colors.text }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Mô tả ngắn về món ăn..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Category & Difficulty */}
              <View style={styles.section}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  Danh mục
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        isDark && category !== cat.id && styles.chipDark,
                        category === cat.id && styles.chipActive,
                        category === cat.id && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: category === cat.id ? '#fff' : (isDark ? '#E0E0E0' : colors.text) },
                          category === cat.id && styles.chipTextActive,
                        ]}
                      >
                        {cat.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ThemedText style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
                  Độ khó
                </ThemedText>
                <View style={styles.difficultyContainer}>
                  {DIFFICULTIES.map((diff) => (
                    <TouchableOpacity
                      key={diff}
                      style={[
                        styles.difficultyChip,
                        isDark && difficulty !== diff && styles.difficultyChipDark,
                        difficulty === diff && styles.difficultyChipActive,
                        difficulty === diff && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setDifficulty(diff)}
                    >
                      <ThemedText
                        style={[
                          styles.difficultyText,
                          { color: difficulty === diff ? '#fff' : (isDark ? '#E0E0E0' : colors.text) },
                          difficulty === diff && styles.difficultyTextActive,
                        ]}
                      >
                        {diff}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time & Servings */}
              <View style={styles.section}>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <ThemedText style={[styles.label, styles.timeLabel, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
                      Thời gian chuẩn bị (phút)
                    </ThemedText>
                    <TextInput
                      style={[styles.input, isDark && styles.inputDark, { color: colors.text }]}
                      value={prepTime}
                      onChangeText={setPrepTime}
                      placeholder="30"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <ThemedText style={[styles.label, styles.timeLabel, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
                      Thời gian nấu (phút)
                    </ThemedText>
                    <TextInput
                      style={[styles.input, isDark && styles.inputDark, { color: colors.text }]}
                      value={cookTime}
                      onChangeText={setCookTime}
                      placeholder="60"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <ThemedText style={[styles.label, { color: isDark ? '#E0E0E0' : colors.textSecondary }]}>
                  Số phần ăn
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark, { color: colors.text }]}
                  value={servings}
                  onChangeText={setServings}
                  placeholder="4"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              {/* Ingredients */}
              <View style={styles.section}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  Nguyên liệu (mỗi dòng 1 nguyên liệu) *
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, isDark && styles.inputDark, { color: colors.text }]}
                  value={ingredients}
                  onChangeText={setIngredients}
                  placeholder="500g thịt bò&#10;1 củ hành tây&#10;Gia vị..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Instructions */}
              <View style={styles.section}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                  Cách làm (mỗi dòng 1 bước) *
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, isDark && styles.inputDark, { color: colors.text }]}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="Bước 1: Sơ chế nguyên liệu&#10;Bước 2: Nấu nước dùng..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.footer, isDark && styles.footerDark]}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <ThemedText style={styles.submitBtnText}>Tạo công thức</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      {/* Level Up Animation - Break Chuỗi Lửa */}
      <StreakBreakAnimation
        visible={showLevelUpAnimation}
        newLevel={newLevel}
        onComplete={() => {
          // Không set false ngay, để animation hiển thị đủ thời gian
          // Sẽ được set false sau khi alert hiện
        }}
      />

      {/* Video Options Modal */}
      <Modal
        visible={showVideoOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVideoOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                Thêm video
              </ThemedText>
              <TouchableOpacity onPress={() => setShowVideoOptions(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.modalOption, isDark && styles.modalOptionDark]}
                onPress={handleVideoFromLibrary}
              >
                <Ionicons name="folder-outline" size={24} color={colors.primary} />
                <ThemedText style={[styles.modalOptionText, { color: colors.text }]}>
                  Từ thư viện
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOption, isDark && styles.modalOptionDark]}
                onPress={handleVideoFromUrl}
              >
                <Ionicons name="link-outline" size={24} color={colors.primary} />
                <ThemedText style={[styles.modalOptionText, { color: colors.text }]}>
                  Nhập URL
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video URL Input Modal */}
      <Modal
        visible={showVideoUrlInput}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowVideoUrlInput(false);
          setVideoUrlInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                Nhập URL video
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowVideoUrlInput(false);
                  setVideoUrlInput('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                URL video (YouTube, Vimeo, hoặc link trực tiếp)
              </ThemedText>
            <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark, { color: colors.text }]}
                value={videoUrlInput}
                onChangeText={setVideoUrlInput}
                placeholder="https://..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel, isDark && styles.modalBtnCancelDark]}
                  onPress={() => {
                    setShowVideoUrlInput(false);
                    setVideoUrlInput('');
                  }}
                >
                  <ThemedText style={[styles.modalBtnText, { color: colors.text }]}>Hủy</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddVideoUrl}
                >
                  <ThemedText style={styles.modalBtnTextWhite}>Thêm</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0D0D1A',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerDark: {
    backgroundColor: '#1A1A2E',
    borderBottomColor: '#2A2A3E',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2A2A3E',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E5E5',
    position: 'relative',
  },
  imageContainerDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2A2A3E',
  },
  imagesScrollView: {
    marginTop: 8,
  },
  imagesContainer: {
    gap: 12,
    paddingRight: 20,
  },
  imageItem: {
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholderSubText: {
    marginTop: 4,
    fontSize: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    zIndex: 1,
  },
  mainImageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mainImageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  addImageBtn: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addImageBtnDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2A2A3E',
  },
  addImageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipsContainer: {
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  chipDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {},
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  difficultyChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  difficultyChipDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  difficultyChipActive: {},
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  halfInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
    height: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerDark: {
    backgroundColor: '#1A1A2E',
    borderTopColor: '#2A2A3E',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Video styles
  videosContainer: {
    marginTop: 8,
    gap: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  videoItemDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2A2A3E',
  },
  videoInfo: {
    flex: 1,
  },
  videoUrl: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  removeVideoBtn: {
    padding: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalContentDark: {
    backgroundColor: '#1A1A2E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    gap: 12,
  },
  modalOptionDark: {
    backgroundColor: '#25253D',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 20,
  },
  modalInputDark: {
    backgroundColor: '#25253D',
    borderColor: '#2A2A3E',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalBtnCancelDark: {
    backgroundColor: '#25253D',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

