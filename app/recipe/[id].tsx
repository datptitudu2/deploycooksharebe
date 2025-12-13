import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { recipeService, Recipe } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '@/config/api';
import { VideoPlayer } from '@/components/recipe/VideoPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '@/hooks/useAlert';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.4;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useAlert();

  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const favoriteScale = useRef(new Animated.Value(1)).current;
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [currentMainImageIndex, setCurrentMainImageIndex] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  // Debug: Log userAvatar changes
  useEffect(() => {
    console.log('🔄 userAvatar state changed:', userAvatar);
  }, [userAvatar]);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | null>(null);
  const [authorPhone, setAuthorPhone] = useState<string | null>(null);
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editReplyImage, setEditReplyImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const fetchRecipe = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      // Call API directly to get full response with userRating
      const headers: any = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await axios.get(`${API_URL}/recipe-management/${id}`, { headers });
      
      if (response.data.success) {
        // Backend trả về { success: true, data: recipe, recipe, userRating }
        const recipeData = response.data.data || response.data.recipe;
        if (recipeData) {
          setRecipe(recipeData);
          if (response.data.userRating !== null && response.data.userRating !== undefined) {
            setUserRating(response.data.userRating);
          }
          // Set favorite state from API response (use liked)
          if (response.data.liked !== null && response.data.liked !== undefined) {
            setIsFavorite(response.data.liked);
          } else if (response.data.saved !== null && response.data.saved !== undefined) {
            setIsFavorite(response.data.saved);
          }
          
          // Set author avatar from recipe data (backend already formatted)
          if (recipeData.authorAvatar) {
            setAuthorAvatarUrl(recipeData.authorAvatar);
          }
          
          // Fetch author phone if needed
          if (recipeData.authorId) {
            try {
              const { userService } = await import('@/services');
              const authorResponse = await userService.getUserById(recipeData.authorId);
              if (authorResponse.success && authorResponse.data) {
                // If avatar not in recipe, try to get from user profile
                if (!recipeData.authorAvatar || recipeData.authorAvatar === '') {
                  if (authorResponse.data.avatar) {
                    setAuthorAvatarUrl(authorResponse.data.avatar);
                  }
                }
                // Get author phone
                if (authorResponse.data.phone) {
                  setAuthorPhone(authorResponse.data.phone);
                }
              }
            } catch (error) {
              console.error('Error fetching author info:', error);
            }
          }
          
          // Fetch comments after recipe is loaded
          const recipeId = recipeData._id || recipeData.id;
          if (recipeId) {
            fetchComments(String(recipeId));
          }
          
          // Save to recent views
          try {
            const stored = await AsyncStorage.getItem('recentViews');
            let recentViews = stored ? JSON.parse(stored) : [];
            // Remove if already exists
            recentViews = recentViews.filter((r: Recipe) => r._id !== recipeData._id);
            // Add to beginning
            recentViews = [recipeData, ...recentViews].slice(0, 10);
            await AsyncStorage.setItem('recentViews', JSON.stringify(recentViews));
          } catch (error) {
          }
        } else {
        }
      } else {
      }
    } catch (error: any) {
      console.error('Error fetching recipe:', error);
      if (error.response?.status === 404) {
        // Recipe not found - will show error screen
      } else {
        showAlert({
          title: 'Lỗi',
          message: error.response?.data?.message || 'Không thể tải công thức',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id, user, token]);

  const fetchComments = useCallback(async (recipeId: string) => {
    if (!recipeId) return;
    setLoadingComments(true);
    try {
      const response = await recipeService.getComments(recipeId);
      if (response.success && response.data) {
        setComments(response.data);
      }
    } catch (error) {
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const pickCommentImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Thông báo',
        message: 'Cần quyền truy cập thư viện ảnh',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCommentImage(result.assets[0].uri);
    }
  };

  const removeCommentImage = () => {
    setCommentImage(null);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !id) return;
    if (!user) {
      showAlert({
        title: 'Thông báo',
        message: 'Vui lòng đăng nhập để bình luận',
      });
      return;
    }

    setSubmittingComment(true);
    try {
      // Nếu có rating, gửi kèm rating và cập nhật recipe rating
      const ratingToSend = userRating || null;
      
      // Gửi comment với rating
      const response = await recipeService.addComment(id as string, commentText, commentImage, ratingToSend);
      if (response.success && response.data) {
        setComments(prev => [response.data, ...prev]);
        setCommentText('');
        setCommentImage(null);
        
        // Nếu có rating, cập nhật recipe rating
        if (ratingToSend) {
          try {
            await recipeService.rate(id as string, ratingToSend);
            fetchRecipe(); // Refresh để cập nhật average rating
          } catch (rateError) {
          }
        }
      }
    } catch (error: any) {
      showAlert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể thêm bình luận',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = (comment: any) => {
    setEditingCommentId(comment._id);
    setEditCommentText(comment.comment);
  };

  const handleSaveEditComment = async () => {
    if (!id || !editingCommentId || !editCommentText.trim()) return;

    try {
      const response = await recipeService.updateComment(id as string, editingCommentId, editCommentText);
      if (response.success && response.data) {
        setComments(prev => prev.map(c => 
          c._id === editingCommentId ? response.data : c
        ));
        setEditingCommentId(null);
        setEditCommentText('');
      }
    } catch (error: any) {
      showAlert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể cập nhật bình luận',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    
    showAlert({
      title: 'Xóa bình luận',
      message: 'Bạn có chắc muốn xóa bình luận này?',
      buttons: [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await recipeService.deleteComment(id as string, commentId);
              if (response.success) {
                setComments(prev => prev.filter(c => c._id !== commentId));
              }
            } catch (error: any) {
              showAlert({
                title: 'Lỗi',
                message: error.response?.data?.message || 'Không thể xóa bình luận',
              });
            }
          },
        },
      ],
    });
  };

  const pickReplyImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Thông báo',
        message: 'Cần quyền truy cập thư viện ảnh',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (editingReplyId) {
        setEditReplyImage(result.assets[0].uri);
      } else {
        setReplyImage(result.assets[0].uri);
      }
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim() || !id) return;
    if (!user) {
      showAlert({
        title: 'Thông báo',
        message: 'Vui lòng đăng nhập để reply',
      });
      return;
    }

    // Check if user is the recipe author
    if (String(user.id) !== String(recipe?.authorId)) {
      showAlert({
        title: 'Thông báo',
        message: 'Chỉ tác giả mới có thể reply',
      });
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await recipeService.addReply(id as string, commentId, replyText, replyImage || undefined);
      if (response.success && response.data) {
        // Update comment with new reply
        setComments(prev => prev.map(c => 
          c._id === commentId 
            ? { ...c, replies: [...(c.replies || []), response.data] }
            : c
        ));
        setReplyText('');
        setReplyImage(null);
        setReplyingToCommentId(null);
      }
    } catch (error: any) {
      showAlert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể thêm reply',
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEditReply = (commentId: string, reply: any) => {
    setEditingReplyId(reply._id);
    setEditReplyText(reply.reply);
    setEditReplyImage(reply.image || null);
  };

  const handleSaveEditReply = async (commentId: string) => {
    if (!id || !editingReplyId || !editReplyText.trim()) return;

    try {
      const response = await recipeService.updateReply(id as string, commentId, editingReplyId, editReplyText, editReplyImage || undefined);
      if (response.success && response.data) {
        // Update comment with updated reply
        setComments(prev => prev.map(c => 
          c._id === commentId 
            ? { 
                ...c, 
                replies: (c.replies || []).map((r: any) => 
                  r._id === editingReplyId ? { ...r, reply: editReplyText, image: editReplyImage || r.image, updatedAt: new Date().toISOString() } : r
                )
              }
            : c
        ));
        setEditingReplyId(null);
        setEditReplyText('');
        setEditReplyImage(null);
      }
    } catch (error: any) {
      showAlert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể cập nhật reply',
      });
    }
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditReplyText('');
    setEditReplyImage(null);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!id) return;

    showAlert({
      title: 'Xóa reply',
      message: 'Bạn có chắc muốn xóa reply này?',
      buttons: [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await recipeService.deleteReply(id as string, commentId, replyId);
              if (response.success) {
                setComments(prev => prev.map(c => 
                  c._id === commentId 
                    ? { ...c, replies: (c.replies || []).filter((r: any) => r._id !== replyId) }
                    : c
                ));
              } else {
                showAlert({
                  title: 'Lỗi',
                  message: response.message || 'Không thể xóa reply',
                });
              }
            } catch (error: any) {
              showAlert({
                title: 'Lỗi',
                message: error.response?.data?.message || 'Đã xảy ra lỗi khi xóa reply',
              });
            }
          },
        },
      ],
    });
  };

  useEffect(() => {
    if (id) {
      fetchRecipe();
    }
  }, [id, fetchRecipe]);

  // Fetch user profile to get avatar
  const fetchUserProfile = useCallback(async () => {
      if (user && token) {
        try {
          const { userService } = await import('@/services');
          const response = await userService.getProfile();
          // userService.getProfile() đã convert profile thành data
        if (response.success) {
          const avatar = response.data?.avatar;
          if (avatar && avatar.trim() !== '') {
            setUserAvatar(avatar);
          } else {
            setUserAvatar(null);
          }
        } else {
          }
        } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        }
    } else {
      }
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      fetchUserProfile();
    }
  }, [user, token, fetchUserProfile]);

  // Refresh avatar when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      // Refresh recipe to get updated author avatar
      if (id) {
        fetchRecipe();
      }
      // Fetch author avatar if recipe exists
      if (recipe?.authorId) {
        const fetchAuthorAvatar = async () => {
          try {
            const { userService } = await import('@/services');
            const authorResponse = await userService.getUserById(recipe.authorId);
            if (authorResponse.success && authorResponse.data?.avatar) {
              setAuthorAvatarUrl(authorResponse.data.avatar);
            }
          } catch (error) {
          }
        };
        fetchAuthorAvatar();
      }
      // Force avatar refresh by updating key
      setAvatarRefreshKey(prev => prev + 1);
    }, [fetchUserProfile, fetchRecipe, id, recipe?.authorId])
  );

  const handleToggleFavorite = async () => {
    if (!user) {
      showAlert({
        title: 'Thông báo',
        message: 'Vui lòng đăng nhập để thích công thức',
      });
      return;
    }
    
    // Optimistic update - update UI immediately
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    // Haptic feedback - Android supported from API 23+
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (Platform.OS === 'android') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
    }
    
    // Animation
    Animated.sequence([
      Animated.spring(favoriteScale, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: Platform.OS === 'android' ? 250 : 300,
        friction: Platform.OS === 'android' ? 5 : 4,
      }),
      Animated.spring(favoriteScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: Platform.OS === 'android' ? 250 : 300,
        friction: Platform.OS === 'android' ? 5 : 4,
      }),
    ]).start();
    
    try {
      // Use toggleLike as the unified favorite action
      const response = await recipeService.toggleLike(id as string);
      if (response.success) {
        setIsFavorite(response.data?.liked || false);
        // Update likeCount in recipe
        if (recipe) {
          setRecipe({
            ...recipe,
            likeCount: response.data?.likes || recipe.likeCount || 0,
          });
        }
      } else {
        // Revert on error
        setIsFavorite(!newFavoriteState);
      }
    } catch (error) {
      // Revert on error
      setIsFavorite(!newFavoriteState);
      showAlert({
        title: 'Lỗi',
        message: 'Không thể thích công thức',
      });
    }
  };

  const handleRate = (rating: number) => {
    // Chỉ lưu vào state, không gửi API ngay
    // Rating sẽ được gửi kèm khi user gửi comment
    setUserRating(rating);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Xem công thức ${recipe?.name} trên CookShare!`,
        title: recipe?.name,
      });
    } catch (error) {
    }
  };

  const handleAddToMealPlan = () => {
    if (!recipe) return;
    
    // Truyền đầy đủ thông tin món ăn
    router.push({
      pathname: '/meal-planning',
      params: { 
        addRecipe: recipe._id,
        recipeName: recipe.name,
        recipeIngredients: JSON.stringify(recipe.ingredients || []),
        recipeInstructions: JSON.stringify(recipe.instructions || []),
        recipeImage: recipe.image || '',
        recipeDescription: recipe.description || '',
      },
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ': return '#4ECDC4';
      case 'Trung bình': return '#FFB347';
      case 'Khó': return '#FF6B6B';
      default: return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <ThemedText style={styles.errorText}>Không tìm thấy công thức</ThemedText>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>Quay lại</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.containerDark]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: recipe.videos && recipe.videos.length > 0 ? 100 : 20 }}
      >
        {/* Main Image with Thumbnails - Full Screen from Top */}
        <View style={styles.imageContainer}>
          {/* Header Overlay */}
          <SafeAreaView style={styles.headerOverlay} edges={['top']}>
            <View style={styles.headerContent}>
          <TouchableOpacity 
                style={styles.headerBackBtnOverlay} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
                <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
              <View style={styles.headerTitleContainerOverlay} />
              <View style={styles.headerRightOverlay}>
            <TouchableOpacity 
                  style={styles.headerActionBtnOverlay} 
              onPress={handleShare}
              activeOpacity={0.7}
            >
                  <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
              </View>
          </View>
        </SafeAreaView>
          {recipe.images && recipe.images.length > 0 ? (
            <>
              {/* Main Image */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  setViewerImageIndex(currentMainImageIndex);
                  setShowImageViewer(true);
                }}
              >
                  <Image
                  source={{ uri: recipe.images[currentMainImageIndex] }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
              </TouchableOpacity>
              {/* Thumbnail Carousel */}
              {recipe.images.length > 1 && (
                <View style={styles.thumbnailCarouselContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbnailCarousel}
              >
                {recipe.images.map((img, index) => (
                      <TouchableOpacity
                      key={index}
                      style={[
                          styles.thumbnailItem,
                          index === currentMainImageIndex && styles.thumbnailItemActive,
                        ]}
                        onPress={() => {
                          setCurrentMainImageIndex(index);
                          setViewerImageIndex(index);
                          setShowImageViewer(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Image
                    source={{ uri: img }}
                          style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                      </TouchableOpacity>
                ))}
              </ScrollView>
                </View>
              )}
            </>
          ) : (
            <Image
              source={{ uri: recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800' }}
              style={styles.heroImage}
            />
          )}
        </View>

        {/* Recipe Info Section */}
        <View style={[styles.titleSection, isDark && styles.titleSectionDark]}>
          {/* Recipe Title with Rating and Time */}
          <View style={styles.titleRatingRow}>
          <ThemedText style={[styles.recipeTitle, { color: colors.text }]}>{recipe.name}</ThemedText>
            <View style={styles.ratingTimeRow}>
              {recipe.averageRating > 0 && (
                <View style={styles.ratingBadgeRow}>
                  <Ionicons name="star" size={18} color="#FFB347" />
                  <ThemedText style={[styles.ratingText, { color: colors.text }]}>
                    {recipe.averageRating.toFixed(1)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.timeBadgeRow}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
                  {totalTime} phút
                </ThemedText>
              </View>
            </View>
          </View>
          
          {/* Author Section with Call & Message */}
          <TouchableOpacity 
            style={styles.authorRow}
            activeOpacity={0.7}
            onPress={() => {
              if (recipe.authorId) {
                router.push(`/user/${recipe.authorId}` as any);
              }
            }}
          >
            <Image
              key={`author-${recipe.authorId}-${avatarRefreshKey}`}
              source={{ 
                uri: (authorAvatarUrl || recipe.authorAvatar)
                  ? `${(authorAvatarUrl || recipe.authorAvatar)}${(authorAvatarUrl || recipe.authorAvatar)?.includes('?') ? '&' : '?'}t=${avatarRefreshKey}`
                  : `https://i.pravatar.cc/100?u=${recipe.authorId}`
              }}
              style={styles.authorAvatar}
              onError={() => {
                setAuthorAvatarUrl(null);
              }}
            />
            <View style={styles.authorInfo}>
              <ThemedText style={[styles.authorLabel, { color: colors.textSecondary }]}>Công thức bởi</ThemedText>
              <ThemedText style={[styles.authorName, { color: colors.text }]}>{recipe.authorName || 'Đầu bếp'}</ThemedText>
              <ThemedText style={[styles.authorRole, { color: colors.textSecondary }]}>Đầu bếp</ThemedText>
            </View>
            <View style={styles.authorActions}>
              <TouchableOpacity 
                style={[styles.authorActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (recipe.authorId) {
                    router.push(`/messages/${recipe.authorId}` as any);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.authorActionBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  // Handle call action
                  if (authorPhone) {
                    try {
                      // Clean phone number (remove spaces, dashes, etc.)
                      const cleanPhone = authorPhone.replace(/[\s\-\(\)]/g, '');
                      const phoneUrl = `tel:${cleanPhone}`;
                      
                      // Open phone dialer directly
                      await Linking.openURL(phoneUrl);
                    } catch (error) {
                      // Fallback: show number so user can copy
                      showAlert({
                        title: 'Số điện thoại',
                        message: `${authorPhone}\n\nKhông thể mở ứng dụng gọi điện. Bạn có thể copy số này.`,
                        buttonText: 'Đã hiểu',
                      });
                    }
                  } else {
                    showAlert({
                      title: 'Thông báo',
                      message: 'Tác giả chưa cập nhật số điện thoại',
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {/* Số người */}
          <View style={[styles.statItem, styles.statItemSmall]}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people-outline" size={Platform.OS === 'android' ? 16 : 18} color={colors.primary} />
          </View>
            <View style={styles.statItemContent}>
              <ThemedText style={[styles.statItemValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {recipe.servings || 1}
              </ThemedText>
              <ThemedText style={[styles.statItemLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                người
              </ThemedText>
          </View>
          </View>

          {/* Độ khó */}
          <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
          <View style={[styles.statItem, styles.statItemMedium]}>
            <View style={[styles.statIconContainer, { backgroundColor: getDifficultyColor(recipe.difficulty || 'Dễ') + '15' }]}>
              <Ionicons name="speedometer-outline" size={Platform.OS === 'android' ? 16 : 18} color={getDifficultyColor(recipe.difficulty || 'Dễ')} />
            </View>
            <View style={styles.statItemContent}>
              <ThemedText 
                style={[styles.statItemValue, { color: colors.text }]} 
                numberOfLines={1} 
                ellipsizeMode="tail"
                adjustsFontSizeToFit={true}
                minimumFontScale={0.75}
              >
                {recipe.difficulty || 'Dễ'}
              </ThemedText>
          </View>
        </View>

          {/* Ẩm thực */}
          <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
          <View style={[styles.statItem, styles.statItemLarge]}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <MaterialCommunityIcons name="chef-hat" size={Platform.OS === 'android' ? 16 : 18} color={colors.primary} />
            </View>
            <View style={styles.statItemContent}>
              <ThemedText style={[styles.statItemValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit={Platform.OS === 'android'}>
                {recipe.cuisine || 'Việt Nam'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Description */}
        {recipe.description && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Mô tả</ThemedText>
            <ThemedText
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {recipe.description}
            </ThemedText>
            {recipe.description.length > 150 && (
          <TouchableOpacity 
                style={styles.readMoreBtn}
                onPress={() => setShowFullDescription(!showFullDescription)}
          >
                <ThemedText style={[styles.readMoreText, { color: colors.primary }]}>
                  {showFullDescription ? 'Thu gọn' : 'Đọc thêm'}
                </ThemedText>
          </TouchableOpacity>
            )}
        </View>
        )}


        {/* Tabs */}
        <View style={[styles.tabsContainer, isDark && styles.tabsContainerDark]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ingredients' && styles.tabActive,
                activeTab === 'ingredients' && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setActiveTab('ingredients')}
            >
              <MaterialCommunityIcons 
                name="food-apple-outline" 
                size={20} 
                color={activeTab === 'ingredients' ? colors.primary : colors.textSecondary} 
              />
              <ThemedText style={[styles.tabText, activeTab === 'ingredients' && { color: colors.primary, fontWeight: '700' }]}>
                Nguyên liệu
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'instructions' && styles.tabActive,
                activeTab === 'instructions' && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setActiveTab('instructions')}
            >
              <MaterialCommunityIcons 
                name="chef-hat" 
                size={20} 
                color={activeTab === 'instructions' ? colors.primary : colors.textSecondary} 
              />
              <ThemedText style={[styles.tabText, activeTab === 'instructions' && { color: colors.primary, fontWeight: '700' }]}>
                Cách làm
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'ingredients' ? (
            <View style={styles.ingredientsList}>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient, index) => (
                  <View key={index} style={[styles.ingredientItem, isDark && styles.ingredientItemDark]}>
                    <LinearGradient
                      colors={[colors.primary + '20', colors.primary + '10']}
                      style={styles.ingredientCard}
                    >
                      <View style={[styles.ingredientBullet, { backgroundColor: colors.primary }]} />
                      <ThemedText style={[styles.ingredientText, { color: colors.text }]}>{ingredient}</ThemedText>
                    </LinearGradient>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="basket-outline" size={48} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Chưa có thông tin nguyên liệu
                  </ThemedText>
                </View>
              )}
            </View>
          ) : activeTab === 'instructions' ? (
            <View style={styles.instructionsList}>
              {recipe.instructions && recipe.instructions.length > 0 ? (
                recipe.instructions.map((step, index) => (
                  <View key={index} style={[styles.instructionItem, isDark && styles.instructionItemDark]}>
                    <LinearGradient
                      colors={[colors.primary, colors.primary + 'DD']}
                      style={styles.stepNumber}
                    >
                      <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                    </LinearGradient>
                    <View style={[styles.instructionCard, isDark && styles.instructionCardDark]}>
                      <ThemedText style={[styles.instructionText, { color: colors.text }]}>{step}</ThemedText>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Chưa có hướng dẫn
                  </ThemedText>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <View style={styles.commentsHeaderLeft}>
              <Ionicons name="chatbubbles" size={24} color={colors.primary} />
              <ThemedText style={[styles.commentsSectionTitle, { color: colors.text }]}>
                Bình luận ({comments.length})
              </ThemedText>
            </View>
          </View>

          {/* Comment Input */}
          {user && (
            <View style={[styles.commentInputContainer, isDark && styles.commentInputContainerDark]}>
              <View style={styles.commentInputContent}>
                {userAvatar ? (
                  <Image
                    key={`user-avatar-${avatarRefreshKey}`}
                    source={{ 
                      uri: `${userAvatar}${userAvatar.includes('?') ? '&' : '?'}t=${avatarRefreshKey}`
                    }}
                    style={styles.commentInputAvatar}
                    onError={(e) => {
                    }}
                    onLoad={() => {
                    }}
                    defaultSource={{ uri: 'https://i.pravatar.cc/100?u=default' }}
                  />
                ) : (
                  <View style={[styles.commentInputAvatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={styles.commentInputWrapper}>
                  {/* Rating Stars - Inside Comment Input */}
                  <View style={styles.ratingStarsInInput}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => handleRate(star)}
                        style={styles.ratingStarBtnInInput}
                      >
                        <Ionicons
                          name={star <= (userRating || 0) ? 'star' : 'star-outline'}
                          size={20}
                          color={star <= (userRating || 0) ? '#FFB347' : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.commentInput, isDark && styles.commentInputDark, { color: colors.text }]}
                    placeholder="Viết bình luận..."
                    placeholderTextColor={colors.textSecondary}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                  />
                  {commentImage && (
                    <View style={styles.commentImagePreview}>
                      <Image source={{ uri: commentImage }} style={styles.commentPreviewImage} />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={removeCommentImage}
                      >
                        <Ionicons name="close-circle" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.commentInputActions}>
                    <TouchableOpacity
                      style={styles.commentImageBtn}
                      onPress={pickCommentImage}
                    >
                      <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.commentSendBtn, 
                        { 
                          backgroundColor: commentText.trim() || commentImage 
                            ? colors.primary 
                            : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                          opacity: (commentText.trim() || commentImage) ? 1 : 0.5,
                        }
                      ]}
                      onPress={handleAddComment}
                      disabled={(!commentText.trim() && !commentImage) || submittingComment}
                      activeOpacity={0.7}
                    >
                      {submittingComment ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons 
                          name="send" 
                          size={18} 
                          color={(commentText.trim() || commentImage) ? "#fff" : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')} 
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Comments List */}
          {loadingComments ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[colors.primary + '10', colors.primary + '05']}
                style={styles.emptyStateGradient}
              >
                <Ionicons name="chatbubbles-outline" size={64} color={colors.primary} />
                <ThemedText style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>
                  Chưa có bình luận nào
                </ThemedText>
                {!user && (
                  <ThemedText style={[styles.emptySubText, { color: colors.textSecondary }]}>
                    Đăng nhập để bình luận đầu tiên!
                  </ThemedText>
                )}
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment._id} style={[styles.commentItem, isDark && styles.commentItemDark]}>
                  <View style={styles.commentItemContent}>
                      <View style={styles.commentAvatarContainer}>
                        <Image
                          source={{ 
                            uri: comment.userAvatar || `https://i.pravatar.cc/100?u=${comment.userId || 'default'}` 
                          }}
                          style={styles.commentAvatar}
                          onError={(e) => {
                            console.log('Comment avatar error:', e.nativeEvent.error);
                          }}
                          defaultSource={{ uri: 'https://i.pravatar.cc/100?u=default' }}
                        />
                        {String(comment.userId) === String(recipe?.authorId) && (
                          <View style={styles.authorBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#fff" />
                          </View>
                        )}
                      </View>
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentHeaderLeft}>
                            <ThemedText style={[styles.commentAuthor, { color: colors.text }]}>
                              {comment.userName}
                            </ThemedText>
                            {String(comment.userId) === String(recipe?.authorId) && (
                              <View style={[styles.authorTag, { backgroundColor: colors.primary + '20' }]}>
                                <ThemedText style={[styles.authorTagText, { color: colors.primary }]}>
                                  Tác giả
                                </ThemedText>
                              </View>
                            )}
                          </View>
                          {user && String(user.id) === String(comment.userId) && (
                            <View style={styles.commentActions}>
                              {editingCommentId === comment._id ? (
                                <View style={styles.editActions}>
                                  <TouchableOpacity
                                    onPress={handleSaveEditComment}
                                    style={styles.editActionBtn}
                                  >
                                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={handleCancelEdit}
                                    style={styles.editActionBtn}
                                  >
                                    <Ionicons name="close" size={18} color={colors.error} />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <>
                                  <TouchableOpacity
                                    onPress={() => handleEditComment(comment)}
                                    style={styles.commentActionBtn}
                                  >
                                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteComment(comment._id)}
                                    style={styles.commentActionBtn}
                                  >
                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                  </TouchableOpacity>
                                </>
                              )}
                            </View>
                          )}
                        </View>
                        {editingCommentId === comment._id ? (
                          <TextInput
                            style={[styles.commentEditInput, isDark && styles.commentEditInputDark, { color: colors.text }]}
                            value={editCommentText}
                            onChangeText={setEditCommentText}
                            multiline
                            maxLength={500}
                            autoFocus
                          />
                        ) : (
                          <>
                            <ThemedText style={[styles.commentText, { color: colors.text }]}>
                              {comment.comment}
                            </ThemedText>
                            {comment.rating && (
                              <View style={styles.commentRatingBelow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Ionicons
                                    key={star}
                                    name={star <= comment.rating ? 'star' : 'star-outline'}
                                    size={14}
                                    color={star <= comment.rating ? '#FFB347' : colors.textSecondary}
                                  />
                                ))}
                              </View>
                            )}
                            {comment.image && (
                              <Image
                                source={{ uri: comment.image }}
                                style={styles.commentImage}
                                resizeMode="cover"
                              />
                            )}
                          </>
                        )}
                        <ThemedText style={[styles.commentTime, { color: colors.textSecondary }]}>
                          {new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {comment.updatedAt && comment.updatedAt !== comment.createdAt && ' (đã chỉnh sửa)'}
                        </ThemedText>

                        {/* Reply Button (only for author) */}
                        {user && String(user.id) === String(recipe?.authorId) && (
                          <TouchableOpacity
                            style={styles.replyBtn}
                            onPress={() => setReplyingToCommentId(replyingToCommentId === comment._id ? null : comment._id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                            <ThemedText style={[styles.replyBtnText, { color: colors.primary }]}>
                              Trả lời
                            </ThemedText>
                          </TouchableOpacity>
                        )}

                        {/* Reply Input */}
                        {replyingToCommentId === comment._id && (
                          <View style={[styles.replyInputContainer, isDark && styles.replyInputContainerDark]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                              {userAvatar ? (
                                <Image
                                  key={`reply-user-avatar-${avatarRefreshKey}`}
                                  source={{ 
                                    uri: `${userAvatar}${userAvatar.includes('?') ? '&' : '?'}t=${avatarRefreshKey}`
                                  }}
                                  style={styles.replyInputAvatar}
                                  onError={() => {
                                    setUserAvatar(null);
                                  }}
                                  defaultSource={{ uri: 'https://i.pravatar.cc/100?u=default' }}
                                />
                              ) : (
                                <View style={[styles.replyInputAvatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                                  <Ionicons name="person" size={16} color={colors.primary} />
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <TextInput
                                  style={[styles.replyInput, isDark && styles.replyInputDark, { color: colors.text, borderColor: colors.border }]}
                                  placeholder="Viết phản hồi..."
                                  placeholderTextColor={colors.textSecondary}
                                  value={replyText}
                                  onChangeText={setReplyText}
                                  multiline
                                  maxLength={500}
                                />
                                {replyImage && (
                                  <View style={styles.replyImagePreview}>
                                    <Image source={{ uri: replyImage }} style={styles.replyPreviewImage} />
                                    <TouchableOpacity
                                      style={styles.removeImageBtn}
                                      onPress={() => setReplyImage(null)}
                                    >
                                      <Ionicons name="close-circle" size={18} color="#fff" />
                                    </TouchableOpacity>
                                  </View>
                                )}
                                <View style={styles.replyInputActions}>
                                  <TouchableOpacity
                                    style={styles.replyImageBtn}
                                    onPress={pickReplyImage}
                                  >
                                    <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.replySendBtn, 
                                      { 
                                        backgroundColor: replyText.trim() || replyImage 
                                          ? colors.primary 
                                          : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                        opacity: (replyText.trim() || replyImage) ? 1 : 0.5,
                                      }
                                    ]}
                                    onPress={() => handleAddReply(comment._id)}
                                    disabled={(!replyText.trim() && !replyImage) || submittingReply}
                                    activeOpacity={0.7}
                                  >
                                    {submittingReply ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <Ionicons 
                                        name="send" 
                                        size={16} 
                                        color={(replyText.trim() || replyImage) ? "#fff" : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')} 
                                      />
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </View>
                        )}

                        {/* Replies List */}
                        {comment.replies && comment.replies.length > 0 && (
                          <View style={styles.repliesContainer}>
                            {comment.replies.map((reply: any, replyIndex: number) => (
                              <View key={reply._id} style={styles.replyItemWrapper}>
                                {/* Left border indicator - Modern style */}
                                <View style={[styles.replyLeftBorder, { backgroundColor: colors.primary }]} />
                                <View style={[styles.replyItem, isDark && styles.replyItemDark]}>
                                  <Image
                                    source={{ uri: reply.authorAvatar || `https://i.pravatar.cc/100?u=${reply.authorId || 'default'}` }}
                                    style={styles.replyAvatar}
                                    defaultSource={{ uri: 'https://i.pravatar.cc/100?u=default' }}
                                  />
                                  <View style={styles.replyContent}>
                                    <View style={styles.replyHeader}>
                                      <View style={styles.replyHeaderLeft}>
                                        <ThemedText style={[styles.replyAuthor, { color: colors.text }]}>
                                          {reply.authorName}
                                          </ThemedText>
                                      </View>
                                      {user && String(user.id) === String(recipe?.authorId) && (
                                        <View style={styles.replyActions}>
                                          {editingReplyId === reply._id ? (
                                            <View style={styles.editActions}>
                                              <TouchableOpacity
                                                onPress={() => handleSaveEditReply(comment._id)}
                                                style={[styles.editActionBtn, { backgroundColor: colors.primary + '20' }]}
                                              >
                                                <Ionicons name="checkmark" size={14} color={colors.primary} />
                                              </TouchableOpacity>
                                              <TouchableOpacity
                                                onPress={handleCancelEditReply}
                                                style={[styles.editActionBtn, { backgroundColor: colors.error + '20' }]}
                                              >
                                                <Ionicons name="close" size={14} color={colors.error} />
                                              </TouchableOpacity>
                                            </View>
                                          ) : (
                                            <>
                                              <TouchableOpacity
                                                onPress={() => handleEditReply(comment._id, reply)}
                                                style={styles.replyActionBtn}
                                              >
                                                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                                              </TouchableOpacity>
                                              <TouchableOpacity
                                                onPress={() => handleDeleteReply(comment._id, reply._id)}
                                                style={styles.replyActionBtn}
                                              >
                                                <Ionicons name="trash-outline" size={16} color={colors.error} />
                                              </TouchableOpacity>
                                            </>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                    {editingReplyId === reply._id ? (
                                      <>
                                        <TextInput
                                          style={[styles.replyEditInput, isDark && styles.replyEditInputDark, { color: colors.text, borderColor: colors.primary }]}
                                          value={editReplyText}
                                          onChangeText={setEditReplyText}
                                          multiline
                                          maxLength={500}
                                          autoFocus
                                        />
                                        {editReplyImage && (
                                          <View style={styles.replyImagePreview}>
                                            <Image source={{ uri: editReplyImage }} style={styles.replyPreviewImage} />
                                            <TouchableOpacity
                                              style={styles.removeImageBtn}
                                              onPress={() => setEditReplyImage(null)}
                                            >
                                              <Ionicons name="close-circle" size={18} color="#fff" />
                                            </TouchableOpacity>
                                          </View>
                                        )}
                                        <View style={styles.replyInputActions}>
                                          <TouchableOpacity
                                            style={styles.replyImageBtn}
                                            onPress={pickReplyImage}
                                          >
                                            <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                                          </TouchableOpacity>
                                        </View>
                                      </>
                                    ) : (
                                      <>
                                        {String(reply.authorId) === String(recipe?.authorId) && (
                                          <View style={[styles.authorTagReply, { backgroundColor: colors.primary + '20', marginBottom: 6 }]}>
                                            <ThemedText style={[styles.authorTagTextReply, { color: colors.primary }]}>
                                              TÁC GIẢ
                                            </ThemedText>
                                          </View>
                                        )}
                                        <ThemedText style={[styles.replyText, { color: colors.text }]}>
                                          {reply.reply}
                                        </ThemedText>
                                        {reply.image && (
                                          <Image
                                            source={{ uri: reply.image }}
                                            style={styles.replyImage}
                                            resizeMode="cover"
                                          />
                                        )}
                                      </>
                                    )}
                                    <ThemedText style={[styles.replyTime, { color: colors.textSecondary }]}>
                                      {new Date(reply.createdAt).toLocaleDateString('vi-VN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                      {reply.updatedAt && reply.updatedAt !== reply.createdAt && ' (đã chỉnh sửa)'}
                                    </ThemedText>
                                  </View>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <ThemedText style={styles.tagsSectionTitle}>Tags</ThemedText>
            <View style={styles.tagsList}>
              {recipe.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                  <ThemedText style={[styles.tagText, { color: colors.primary }]}>#{tag}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Action Buttons - Fixed at Bottom */}
        <View style={styles.stickyVideoButtonContainer}>
          {/* Gradient Overlay - White fade/blur from top */}
          <LinearGradient
            colors={isDark 
              ? ['transparent', 'rgba(13, 13, 26, 0.4)', 'rgba(13, 13, 26, 0.7)', 'rgba(13, 13, 26, 0.9)', '#0D0D1A'] 
              : ['transparent', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.95)']}
            style={styles.gradientOverlay}
            locations={[0, 0.3, 0.6, 0.85, 1]}
          />
        <View style={styles.bottomActionButtonsRow}>
          {/* Thêm vào lịch - Button 1 */}
          <TouchableOpacity
            style={[styles.bottomActionBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddToMealPlan}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={Platform.OS === 'android' ? 18 : 16} color="#fff" />
            <ThemedText style={styles.bottomActionBtnText}>Thêm vào lịch</ThemedText>
          </TouchableOpacity>

          {/* Xem Video - Button 2 (chỉ hiện khi có video) */}
          {recipe.videos && recipe.videos.length > 0 && (
            <TouchableOpacity
              style={[styles.bottomActionBtn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              if (recipe.videos && recipe.videos.length > 0) {
                const firstVideo = recipe.videos[0];
                const videoUrl = typeof firstVideo === 'string' ? firstVideo : (firstVideo.url || '');
                
                // Check if it's a YouTube URL
                const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
                
                if (isYouTube) {
                  // Extract YouTube ID and open directly in YouTube app
                  const youtubeIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
                  if (youtubeIdMatch && youtubeIdMatch[1]) {
                    const youtubeId = youtubeIdMatch[1];
                    const youtubeAppUrl = `vnd.youtube:${youtubeId}`;
                    try {
                      const canOpen = await Linking.canOpenURL(youtubeAppUrl);
                      if (canOpen) {
                        await Linking.openURL(youtubeAppUrl);
                        return; // Don't show modal
                      }
                    } catch (error) {
                      // Fall through to show modal
                    }
                  }
                  // Fallback: try regular YouTube URL
                  try {
                    await Linking.openURL(videoUrl);
                    return; // Don't show modal
                  } catch (error) {
                    // Fall through to show modal
                  }
                }
                
                // For non-YouTube videos, show modal
                setSelectedVideo(firstVideo);
                setShowVideoModal(true);
              }
            }}
            activeOpacity={0.8}
          >
              <View style={styles.playIconContainerSmall}>
              <Ionicons 
                name="play" 
                  size={Platform.OS === 'android' ? 14 : 12} 
                color="#000" 
              />
            </View>
              <ThemedText style={styles.bottomActionBtnText}>Xem Video</ThemedText>
          </TouchableOpacity>
      )}
        </View>
      </View>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoModal}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowVideoModal(false)}
        transparent={false}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        {selectedVideo && (
          <VideoPlayer
            videoUrl={selectedVideo.url}
            title={selectedVideo.title}
            onClose={() => setShowVideoModal(false)}
          />
        )}
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowImageViewer(false)}
        transparent={true}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.imageViewerContainer}>
          <SafeAreaView style={styles.imageViewerSafeArea} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.imageViewerCloseBtn}
                onPress={() => setShowImageViewer(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              {recipe?.images && recipe.images.length > 1 && (
                <ThemedText style={styles.imageViewerCounter}>
                  {viewerImageIndex + 1} / {recipe.images.length}
                </ThemedText>
              )}
              <View style={{ width: 40 }} />
            </View>

            {/* Scrollable Images with Zoom */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: viewerImageIndex * width, y: 0 }}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setViewerImageIndex(index);
                setCurrentMainImageIndex(index);
              }}
              style={styles.imageViewerScrollView}
            >
              {recipe?.images?.map((img, index) => (
                <ScrollView
                  key={index}
                  style={styles.imageViewerImageContainer}
                  minimumZoomScale={1}
                  maximumZoomScale={3}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  bouncesZoom={true}
                  contentContainerStyle={styles.imageViewerImageContent}
                >
                  <Image
                    source={{ uri: img }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              ))}
            </ScrollView>

            {/* Thumbnail Strip */}
            {recipe?.images && recipe.images.length > 1 && (
              <View style={styles.imageViewerThumbnails}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imageViewerThumbnailsContent}
                >
                  {recipe.images.map((img, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.imageViewerThumbnail,
                        index === viewerImageIndex && styles.imageViewerThumbnailActive,
                      ]}
                      onPress={() => {
                        setViewerImageIndex(index);
                        setCurrentMainImageIndex(index);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: img }}
                        style={styles.imageViewerThumbnailImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
      {AlertComponent}
    </KeyboardAvoidingView>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeAreaDark: {
    backgroundColor: '#0D0D1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topHeaderDark: {
    backgroundColor: '#0D0D1A',
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerActionBtn: {
    width: Platform.OS === 'ios' ? 40 : 44,
    height: Platform.OS === 'ios' ? 40 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: Platform.OS === 'ios' ? 20 : 22,
    ...Platform.select({
      android: {
        minHeight: 44,
        minWidth: 44,
      },
    }),
  },
  headerFavoriteBtn: {
    width: Platform.OS === 'android' ? 44 : 40,
    height: Platform.OS === 'android' ? 44 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Platform.OS === 'android' ? 6 : 8,
    borderRadius: Platform.OS === 'android' ? 22 : 20,
    ...Platform.select({
      android: {
        minHeight: 44,
        minWidth: 44,
        elevation: 0,
      },
    }),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: IMAGE_HEIGHT,
    position: 'relative',
    marginTop: 0,
    marginBottom: 0,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackBtnOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainerOverlay: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitleOverlay: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#fff',
  },
  headerRightOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtnOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerFavoriteBtnOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCarousel: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  heroImage: {
    width: width,
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
  },
  thumbnailCarouselContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailCarousel: {
    paddingHorizontal: 0,
    gap: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailItem: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#fff',
    marginHorizontal: 4,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  thumbnailItemActive: {
    borderColor: '#fff',
    borderWidth: 3.5,
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      android: {
        elevation: 6,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
    }),
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  stickyVideoButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 40,
    zIndex: 10,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  bottomActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 2,
  },
  bottomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 12 : 11,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 14,
    borderRadius: Platform.OS === 'android' ? 12 : 10,
    gap: Platform.OS === 'android' ? 8 : 6,
    maxWidth: 200,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    ...Platform.select({
      android: {
        elevation: 4,
        minHeight: 44,
      },
    }),
  },
  bottomActionBtnText: {
    fontSize: Platform.OS === 'android' ? 13 : 12,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    color: '#fff',
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0.15,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  playIconContainerSmall: {
    width: Platform.OS === 'android' ? 24 : 22,
    height: Platform.OS === 'android' ? 24 : 22,
    borderRadius: Platform.OS === 'android' ? 12 : 11,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    ...Platform.select({
      android: {
        elevation: 3,
      },
    }),
  },
  watchVideosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 10 : 9,
    paddingHorizontal: Platform.OS === 'android' ? 18 : 16,
    borderRadius: Platform.OS === 'android' ? 10 : 8,
    gap: Platform.OS === 'android' ? 10 : 8,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 2,
    ...Platform.select({
      android: {
        elevation: 4,
        minHeight: 42,
      },
    }),
  },
  playIconContainer: {
    width: Platform.OS === 'android' ? 30 : 28,
    height: Platform.OS === 'android' ? 30 : 28,
    borderRadius: Platform.OS === 'android' ? 15 : 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    ...Platform.select({
      android: {
        elevation: 3,
      },
    }),
  },
  watchVideosText: {
    fontSize: Platform.OS === 'android' ? 14 : 13,
    fontWeight: Platform.OS === 'android' ? '700' : '600',
    color: '#fff',
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0.15,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerSafeArea: {
    flex: 1,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageViewerCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageViewerCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageViewerScrollView: {
    flex: 1,
  },
  imageViewerImageContainer: {
    width: width,
    height: height,
  },
  imageViewerImageContent: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: width,
    height: height,
  },
  imageViewerThumbnails: {
    height: 80,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageViewerThumbnailsContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  imageViewerThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  imageViewerThumbnailActive: {
    borderColor: '#fff',
  },
  imageViewerThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Video Modal - Removed (handled by VideoPlayer component now)
  videoPlayerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  videoPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  videoPlaceholderUrl: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  videoOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  videoOpenBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 10,
    borderTopRightRadius:10,
    marginTop: -18,
  },
  titleRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recipeTitle: {
    fontSize: Platform.OS === 'android' ? 28 : 30,
    fontWeight: Platform.OS === 'android' ? '800' : '900',
    flex: 1,
    lineHeight: Platform.OS === 'android' ? 36 : 38,
    letterSpacing: Platform.OS === 'android' ? -0.5 : -0.3,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-condensed',
      },
      ios: {
        fontFamily: 'System',
      },
    }),
  },
  ratingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  ratingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: Platform.OS === 'android' ? 16 : 17,
    fontWeight: Platform.OS === 'android' ? '600' : '700',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
        includeFontPadding: false,
      },
    }),
  },
  titleSectionDark: {
    backgroundColor: '#0D0D1A',
  },
  categoryRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  authorInfo: {
    flex: 1,
  },
  authorLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    marginBottom: 2,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  authorRole: {
    fontSize: 12,
    fontWeight: '400',
  },
  authorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  authorActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
    elevation: 2,
  },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 8 : 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 6 : 8,
    minWidth: 0,
  },
  statItemSmall: {
    flex: 1,
  },
  statItemMedium: {
    flex: 1.2,
  },
  statItemLarge: {
    flex: 1.1,
  },
  statIconContainer: {
    width: Platform.OS === 'android' ? 28 : 32,
    height: Platform.OS === 'android' ? 28 : 32,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statItemContent: {
    flex: 1,
    alignItems: 'flex-start',
    minWidth: 0,
    justifyContent: 'center',
    flexShrink: 1,
  },
  statItemValue: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: Platform.OS === 'android' ? '700' : '700',
    lineHeight: Platform.OS === 'android' ? 18 : 19,
    flexShrink: 1,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
        includeFontPadding: false,
      },
    }),
  },
  statItemLabel: {
    fontSize: Platform.OS === 'android' ? 10 : 12,
    fontWeight: '400',
    marginTop: Platform.OS === 'android' ? 1 : 2,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
        includeFontPadding: false,
      },
    }),
  },
  statDivider: {
    width: 1,
    height: Platform.OS === 'android' ? 36 : 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: Platform.OS === 'android' ? 2 : 4,
  },
  statDividerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 0,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 14 : 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    ...Platform.select({
      android: {
        minHeight: 52,
      },
    }),
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 14 : 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
        minHeight: 52,
      },
    }),
  },
  actionBtnText: {
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  actionBtnTextWhite: {
    fontSize: Platform.OS === 'ios' ? 15 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: '#fff',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  readMoreBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabsContainer: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabsContainerDark: {
    backgroundColor: '#1A1A2E',
  },
  tabsScroll: {
    paddingHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 4,
    minWidth: 120,
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  ingredientsList: {},
  ingredientItem: {
    marginBottom: 12,
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  ingredientItemDark: {
    backgroundColor: '#1A1A2E',
  },
  ingredientBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  ingredientText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  instructionsList: {},
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  instructionItemDark: {},
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  instructionCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  instructionCardDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2A2A3E',
  },
  instructionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
  },
  commentInputContainer: {
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'ios' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    ...Platform.select({
      ios: {
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  commentInputContainerDark: {
    backgroundColor: Platform.OS === 'ios' ? '#1A1A2E' : 'rgba(26, 26, 46, 0.95)',
    ...Platform.select({
      android: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    }),
  },
  commentInputGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  commentInputContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  commentInputAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
  },
  commentInputWrapper: {
    flex: 1,
  },
  commentInput: {
    minHeight: Platform.OS === 'ios' ? 40 : 44,
    maxHeight: 120,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: Platform.OS === 'ios' ? 14 : 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 12,
    fontSize: Platform.OS === 'ios' ? 14 : 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
        textAlignVertical: 'top',
      },
    }),
  },
  commentInputDark: {
    backgroundColor: '#2A2A3E',
    borderColor: '#3A3A4E',
  },
  commentImagePreview: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  commentPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  commentInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Platform.OS === 'ios' ? 8 : 10,
  },
  commentImageBtn: {
    padding: Platform.OS === 'ios' ? 8 : 6,
    borderRadius: 20,
    ...Platform.select({
      android: {
        backgroundColor: 'rgba(0,0,0,0.03)',
      },
    }),
  },
  commentSendBtn: {
    width: Platform.OS === 'ios' ? 36 : 40,
    height: Platform.OS === 'ios' ? 36 : 40,
    borderRadius: Platform.OS === 'ios' ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  commentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  commentsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  commentsList: {
    gap: 0,
    paddingHorizontal: 0,
  },
  commentItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 14,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    ...Platform.select({
      android: {
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  commentItemDark: {
    backgroundColor: Platform.OS === 'ios' ? '#1A1A2E' : 'rgba(26, 26, 46, 0.95)',
    ...Platform.select({
      android: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    }),
  },
  replyItemDark: {
    backgroundColor: Platform.OS === 'ios' ? '#1A1A2E' : 'rgba(26, 26, 46, 0.95)',
    ...Platform.select({
      android: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    }),
  },
  commentItemContent: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatarContainer: {
    position: 'relative',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#F0F0F0',
  },
  authorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 6 : 8,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  commentAuthor: {
    fontSize: Platform.OS === 'ios' ? 14 : 15,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    flexShrink: 1,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  commentRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
  },
  commentRatingBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 2 : 3,
    marginTop: 4,
    marginBottom: 2,
  },
  authorTag: {
    paddingHorizontal: Platform.OS === 'ios' ? 6 : 6,
    paddingVertical: Platform.OS === 'ios' ? 2 : 2,
    borderRadius: Platform.OS === 'ios' ? 6 : 6,
    marginLeft: Platform.OS === 'android' ? 2 : 0,
    flexShrink: 0,
    ...Platform.select({
      android: {
        minHeight: 18,
        justifyContent: 'center',
        alignItems: 'center',
      },
    }),
  },
  authorTagText: {
    fontSize: Platform.OS === 'ios' ? 10 : 9,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    textTransform: 'uppercase',
    letterSpacing: Platform.OS === 'ios' ? 0 : 0.2,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  authorTagReply: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 3,
    paddingVertical: Platform.OS === 'ios' ? 1.5 : 1,
    borderRadius: Platform.OS === 'ios' ? 3 : 3,
    flexShrink: 0,
    alignSelf: 'flex-start',
    ...Platform.select({
      android: {
        minHeight: 16,
        justifyContent: 'center',
      },
    }),
  },
  authorTagTextReply: {
    fontSize: Platform.OS === 'ios' ? 8 : 7,
    fontWeight: Platform.OS === 'ios' ? '600' : '400',
    letterSpacing: Platform.OS === 'ios' ? 0.1 : 0,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  commentActions: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 8 : 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  commentActionBtn: {
    padding: 6,
  },
  editActions: {
    flexDirection: 'row',
    gap: 4,
  },
  editActionBtn: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  commentText: {
    fontSize: Platform.OS === 'ios' ? 14 : 15,
    lineHeight: Platform.OS === 'ios' ? 20 : 22,
    marginBottom: 6,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  commentEditInput: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  commentEditInputDark: {
    backgroundColor: '#2A2A3E',
    borderColor: '#FF6B35',
  },
  commentTime: {
    fontSize: Platform.OS === 'ios' ? 11 : 12,
    fontWeight: Platform.OS === 'ios' ? '500' : '400',
    marginTop: 2,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  emptyStateGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSection: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingSectionDark: {
    backgroundColor: '#1A1A2E',
  },
  ratingContent: {
    alignItems: 'center',
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  ratingStarBtn: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Inline Rating (inside comments)
  ratingSectionInline: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  ratingSectionInlineDark: {
    backgroundColor: '#2A2A3E',
  },
  ratingContentInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingSectionTitleInline: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  ratingStarsInline: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  ratingStarBtnInline: {
    padding: 2,
  },
  ratingValueInline: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Rating Stars in Comment Input
  ratingStarsInInput: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 4 : 6,
    marginBottom: Platform.OS === 'ios' ? 8 : 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  ratingStarBtnInInput: {
    padding: Platform.OS === 'ios' ? 2 : 4,
  },
  // Comments Section
  commentsSection: {
    marginHorizontal: 0,
    marginTop: 30,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  commentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentsSectionTitle: {
    fontSize: Platform.OS === 'ios' ? 22 : 21,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  tagsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  tagsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Reply Styles
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  replyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyInputContainer: {
    marginTop: 8,
    marginLeft: 52, // Align with comment content
    borderRadius: 0,
    overflow: 'visible',
    backgroundColor: 'transparent',
    padding: 0,
    paddingBottom: 8,
  },
  replyInputContainerDark: {
    backgroundColor: 'transparent',
  },
  replyInputContent: {
    flexDirection: 'column',
  },
  replyInputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
  },
  replyInput: {
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 6,
  },
  replyInputDark: {
    backgroundColor: '#1A1A2E',
    borderColor: '#3A3A4E',
    color: '#FFFFFF',
  },
  replyImagePreview: {
    position: 'relative',
    marginBottom: 6,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 240,
    height: 140,
  },
  replyPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    resizeMode: 'cover',
  },
  replyInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  replyImageBtn: {
    padding: 4,
  },
  replySendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 36, // Lùi thêm sang trái để có chỗ cho icon và tag
    gap: 6,
    paddingLeft: 0,
  },
  replyItemWrapper: {
    position: 'relative',
    marginLeft: 0,
    flexDirection: 'row',
    marginBottom: 0,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    ...Platform.select({
      android: {
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  replyLeftBorder: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
    backgroundColor: '#FF6B35', // Orange border like in the image
    alignSelf: 'stretch',
  },
  replyItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    padding: 0,
    paddingLeft: Platform.OS === 'ios' ? 8 : 10,
  },
  replyGradient: {
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  replyItemContent: {
    flexDirection: 'row',
  },
  replyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#F0F0F0',
    ...Platform.select({
      android: {
        marginTop: 15,
      },
    }),
  },
  replyContent: {
    flex: 1,
    paddingLeft: Platform.OS === 'ios' ? 8 : 10,
    justifyContent: 'center',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    gap: 8,
    minHeight: 40,
  },
  replyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 4 : 6,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  replyAuthor: {
    fontSize: Platform.OS === 'ios' ? 10 : 11,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    flexShrink: 1,
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  replyActions: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 8 : 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  replyActionBtn: {
    padding: 4,
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  replyImage: {
    width: '100%',
    maxWidth: 240,
    height: 140,
    borderRadius: 6,
    resizeMode: 'cover',
    marginTop: 4,
    marginBottom: 2,
  },
  replyTime: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
  replyEditInput: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#FF6B35',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  replyEditInputDark: {
    backgroundColor: '#2A2A3E',
    borderColor: '#FF6B35',
  },
});

