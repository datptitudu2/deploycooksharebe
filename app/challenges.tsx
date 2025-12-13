import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import challengeService from '@/services/challengeService';
import { achievementService } from '@/services';
import { alertService } from '@/services/alertService';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

interface ChallengeHistory {
  _id: string;
  joined: boolean;
  completed: boolean;
  joinedAt: string;
  completedAt?: string;
  challenge: {
    title: string;
    description: string;
    icon: string;
    points: number;
    date: string;
  };
}

interface ChallengeStats {
  totalJoined: number;
  totalCompleted: number;
  totalPoints: number;
  currentStreak: number;
}

export default function ChallengesScreen() {
  const { token, user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayChallenge, setTodayChallenge] = useState<any>(null);
  const [history, setHistory] = useState<ChallengeHistory[]>([]);
  const [stats, setStats] = useState<ChallengeStats>({
    totalJoined: 0,
    totalCompleted: 0,
    totalPoints: 0,
    currentStreak: 0,
  });
  const [userStats, setUserStats] = useState<any>(null);
  const [showProofImageModal, setShowProofImageModal] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedChallengeDate, setSelectedChallengeDate] = useState<string | null>(null);
  const [showCompletionsModal, setShowCompletionsModal] = useState(false);
  const [challengeCompletions, setChallengeCompletions] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch today's challenge
      const challengeRes = await challengeService.getTodayChallenge();
      if (challengeRes.success && challengeRes.data) {
        setTodayChallenge(challengeRes.data);
      }

      // Fetch history if logged in
      if (token) {
        const [historyRes, userStatsRes] = await Promise.all([
          challengeService.getChallengeHistory(),
          achievementService.getStats(),
        ]);
        
        if (historyRes.success && historyRes.data) {
          setHistory(historyRes.data);
          
          // Calculate stats
          const completed = historyRes.data.filter((h: ChallengeHistory) => h.completed);
          const totalPoints = completed.reduce((acc: number, h: ChallengeHistory) => 
            acc + (h.challenge?.points || 0), 0
          );
          
          setStats({
            totalJoined: historyRes.data.length,
            totalCompleted: completed.length,
            totalPoints,
            currentStreak: calculateStreak(historyRes.data),
          });
        }
        
        if (userStatsRes.success && userStatsRes.data) {
          setUserStats(userStatsRes.data);
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const calculateStreak = (data: ChallengeHistory[]) => {
    // Tính streak dựa trên các ngày liên tiếp hoàn thành
    const completedDates = data
      .filter(h => h.completed && h.completedAt)
      .map(h => new Date(h.completedAt!).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (completedDates.length === 0) return 0;
    
    let streak = 1;
    for (let i = 1; i < completedDates.length; i++) {
      const curr = new Date(completedDates[i - 1]);
      const prev = new Date(completedDates[i]);
      const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleJoinChallenge = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await challengeService.joinChallenge();
      if (res.success) {
        setTodayChallenge({
          ...todayChallenge,
          userProgress: { joined: true, completed: false },
          participantCount: todayChallenge.participantCount + 1,
        });
      }
    } catch (error) {
    }
  };

  const handlePickProofImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertService.warning('Vui lòng cho phép truy cập thư viện ảnh', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProofImage(result.assets[0].uri);
    }
  };

  const handleTakeProofPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alertService.warning('Vui lòng cho phép truy cập camera', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProofImage(result.assets[0].uri);
    }
  };

  const handleCompleteChallenge = async () => {
    // Kiểm tra lại trạng thái trước khi mở modal
    const currentIsCompleted = todayChallenge?.userProgress?.completed;
    if (currentIsCompleted) {
      alertService.info('Bạn đã hoàn thành thử thách này rồi!');
      // Refresh data để đảm bảo UI đúng
      await fetchData();
      return;
    }
    
    // Mở modal để chọn ảnh proof
    setShowProofImageModal(true);
  };

  const handleSubmitProof = async () => {
    if (!proofImage) {
      alertService.warning('Vui lòng chọn ảnh món ăn đã nấu', 'Thiếu ảnh');
      return;
    }

    // Kiểm tra trạng thái trước khi submit
    const isCompleted = todayChallenge?.userProgress?.completed;
    if (isCompleted) {
      alertService.info('Bạn đã hoàn thành thử thách này rồi!');
      setShowProofImageModal(false);
      setProofImage(null);
      // Refresh data để đảm bảo UI đúng
      await fetchData();
      return;
    }

    setUploadingProof(true);
    // Lưu stats trước khi hoàn thành để so sánh
    const oldLevel = userStats?.level || 1;
    const oldPoints = userStats?.points || 0;
    
    try {
      const res = await challengeService.completeChallenge(undefined, proofImage);
      if (res.success) {
        const pointsEarned = res.data?.pointsEarned || todayChallenge.points;
        
        // Đóng modal và reset
        setShowProofImageModal(false);
        setProofImage(null);
        
        // Cập nhật UI ngay (optimistic update)
        setTodayChallenge({
          ...todayChallenge,
          userProgress: { joined: true, completed: true, completedAt: new Date().toISOString() },
          completedCount: todayChallenge.completedCount + 1,
        });
        
        // Cập nhật stats ngay lập tức từ response
        if (res.data?.newPoints !== undefined) {
          const newStats = {
            ...userStats,
            points: res.data.newPoints,
            level: res.data.newLevel || userStats?.level || 1,
          };
          setUserStats(newStats);
        }
        
        // Fetch lại stats để đảm bảo đồng bộ
        const newStatsRes = await achievementService.getStats().catch(() => ({ success: false, data: null }));
        if (newStatsRes.success && newStatsRes.data) {
          setUserStats(newStatsRes.data);
        }
        
        // Hiển thị Alert ngay lập tức
        const newLevel = res.data?.newLevel || oldLevel;
          const levelUp = newLevel > oldLevel;
          
          let message = `🎉 Chúc mừng!\n\nBạn đã hoàn thành thử thách và nhận được ${pointsEarned} điểm!`;
          
          if (levelUp) {
            message += `\n\n🏆 Level Up!\nBạn đã lên cấp ${newLevel}!`;
          }
          
          alertService.success(message, 'Hoàn thành thử thách!');
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Refresh data ngay lập tức để đảm bảo UI cập nhật đúng
        await fetchData();
      } else {
        // Nếu response không success, có thể có lỗi
        const errorMsg = res.message || 'Không thể hoàn thành thử thách';
        alertService.error(errorMsg);
        await fetchData(); // Refresh để lấy trạng thái mới nhất
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Không thể hoàn thành thử thách';
      alertService.error(errorMsg);
      
      // Đóng modal và reset
      setShowProofImageModal(false);
      setProofImage(null);
      
      if (errorMsg.includes('đã hoàn thành') || errorMsg.includes('already completed')) {
        // Nếu đã hoàn thành, refresh data để cập nhật UI đúng
        await fetchData();
        alertService.info('Bạn đã hoàn thành thử thách này rồi!');
      } else if (errorMsg.includes('chưa tham gia') || errorMsg.includes('not joined')) {
        setTodayChallenge({
          ...todayChallenge,
          userProgress: { joined: false, completed: false },
        });
        alertService.warning('Vui lòng tham gia thử thách trước!');
      } else {
        alertService.error(errorMsg || 'Không thể hoàn thành thử thách. Vui lòng thử lại.');
        // Refresh data để đảm bảo UI đúng
        await fetchData();
      }
    } finally {
      setUploadingProof(false);
    }
  };

  const handleViewCompletions = async (challengeDate: string) => {
    setSelectedChallengeDate(challengeDate);
    setShowCompletionsModal(true);
    setChallengeCompletions([]); // Reset trước khi fetch
    
    try {
      const res = await challengeService.getChallengeCompletions(challengeDate);
      
      if (res.success && res.data) {
        setChallengeCompletions(res.data);
      } else {
        setChallengeCompletions([]);
      }
    } catch (error) {
      alertService.error('Không thể tải danh sách người hoàn thành');
      setChallengeCompletions([]);
    }
  };

  const isJoined = todayChallenge?.userProgress?.joined;
  const isCompleted = todayChallenge?.userProgress?.completed;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0d0d1a' : '#f8f9fa' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          Thử Thách
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="flame" size={24} color="#fff" />
                <ThemedText style={styles.statNumber}>{stats.currentStreak}</ThemedText>
                <ThemedText style={styles.statLabel}>Streak</ThemedText>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trophy" size={24} color="#fff" />
                <ThemedText style={styles.statNumber}>{stats.totalCompleted}</ThemedText>
                <ThemedText style={styles.statLabel}>Hoàn thành</ThemedText>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={24} color="#fff" />
                <ThemedText style={styles.statNumber}>{stats.totalPoints}</ThemedText>
                <ThemedText style={styles.statLabel}>Điểm</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Today's Challenge */}
        {todayChallenge && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Thử Thách Hôm Nay
            </ThemedText>
            
            <View style={[styles.todayCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
              <LinearGradient
                colors={
                  isCompleted ? ['#06A77D', '#4ECDC4'] :
                  isJoined ? ['#667eea', '#764ba2'] :
                  ['#FF6B6B', '#FF8E53']
                }
                style={styles.todayIconBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name={
                    isCompleted ? 'checkmark-circle' :
                    isJoined ? 'rocket' :
                    'flash'
                  } 
                  size={32} 
                  color="#fff" 
                />
              </LinearGradient>

              <View style={styles.todayContent}>
                <View style={styles.todayHeader}>
                  <ThemedText style={[styles.todayTitle, { color: colors.text }]}>
                    {todayChallenge.title}
                  </ThemedText>
                  <View style={[styles.pointsBadge, { backgroundColor: isCompleted ? '#06A77D' : '#FFD93D' }]}>
                    <ThemedText style={styles.pointsText}>
                      {isCompleted ? '✓' : `+${todayChallenge.points}`}
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText style={[styles.todayDesc, { color: colors.textSecondary }]}>
                  {todayChallenge.description}
                </ThemedText>

                <View style={styles.todayFooter}>
                  <View style={styles.todayStats}>
                    <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                    <ThemedText style={[styles.todayStatText, { color: colors.textSecondary }]}>
                      {todayChallenge.participantCount} tham gia
                    </ThemedText>
                  </View>

                  {!isCompleted ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={isJoined ? handleCompleteChallenge : handleJoinChallenge}
                      disabled={uploadingProof}
                    >
                      <LinearGradient
                        colors={isJoined ? ['#06A77D', '#4ECDC4'] : ['#FF6B6B', '#FF8E53']}
                        style={[styles.actionBtnGradient, uploadingProof && { opacity: 0.6 }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {uploadingProof ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                        <ThemedText style={styles.actionBtnText}>
                          {isJoined ? 'Hoàn thành' : 'Tham gia'}
                        </ThemedText>
                        <Ionicons name={isJoined ? 'checkmark' : 'add'} size={18} color="#fff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.completedWrapper}>
                    <View style={styles.completedBadge}>
                      <Ionicons name="trophy" size={16} color="#FFD93D" />
                      <ThemedText style={styles.completedText}>Đã hoàn thành!</ThemedText>
                      </View>
                      <View style={styles.completedRewardPoints}>
                        <ThemedText style={styles.completedRewardPointsText}>
                          +{todayChallenge.points}
                        </ThemedText>
                        <Ionicons name="star" size={14} color="#FFD93D" />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* History */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Lịch Sử Thử Thách
          </ThemedText>

          {!token ? (
            <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
              <Ionicons name="lock-closed-outline" size={48} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                Đăng nhập để xem lịch sử
              </ThemedText>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/login')}
              >
                <ThemedText style={styles.loginBtnText}>Đăng nhập</ThemedText>
              </TouchableOpacity>
            </View>
          ) : history.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                Chưa có thử thách nào
              </ThemedText>
              <ThemedText style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Tham gia thử thách hôm nay để bắt đầu!
              </ThemedText>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((item, index) => (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.historyCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}
                  onPress={() => {
                    if (item.completed && item.challenge?.date) {
                      handleViewCompletions(item.challenge.date);
                    }
                  }}
                  disabled={!item.completed}
                >
                  <View style={[
                    styles.historyIcon,
                    { backgroundColor: item.completed ? '#06A77D20' : '#FF6B6B20' }
                  ]}>
                    <Ionicons 
                      name={item.completed ? 'checkmark-circle' : 'time-outline'} 
                      size={20} 
                      color={item.completed ? '#06A77D' : '#FF6B6B'} 
                    />
                  </View>

                  <View style={styles.historyContent}>
                    <ThemedText style={[styles.historyTitle, { color: colors.text }]}>
                      {item.challenge?.title || 'Thử thách'}
                    </ThemedText>
                    <ThemedText style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {new Date(item.joinedAt).toLocaleDateString('vi-VN')}
                    </ThemedText>
                  </View>

                  <View style={styles.historyRight}>
                    {item.completed ? (
                      <View style={styles.historyPoints}>
                        <ThemedText style={styles.historyPointsText}>
                          +{item.challenge?.points || 0}
                        </ThemedText>
                        <Ionicons name="star" size={14} color="#FFD93D" />
                      </View>
                    ) : (
                      <ThemedText style={[styles.historyPending, { color: colors.textSecondary }]}>
                        Chưa hoàn thành
                      </ThemedText>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <View style={[styles.tipsCard, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
            <Ionicons name="bulb" size={24} color="#FFD93D" />
            <View style={styles.tipsContent}>
              <ThemedText style={[styles.tipsTitle, { color: colors.text }]}>
                Mẹo nhỏ
              </ThemedText>
              <ThemedText style={[styles.tipsText, { color: colors.textSecondary }]}>
                Hoàn thành thử thách mỗi ngày để tăng streak và nhận nhiều điểm hơn!
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Proof Image Modal */}
      <Modal
        visible={showProofImageModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowProofImageModal(false);
          setProofImage(null);
        }}
      >
        <View style={styles.proofModalOverlay}>
          <Pressable 
            style={styles.proofModalBackdrop} 
            onPress={() => {
              setShowProofImageModal(false);
              setProofImage(null);
            }} 
          />
          <View style={[styles.proofModalContent, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
            <View style={styles.proofModalHeader}>
              <ThemedText style={[styles.proofModalTitle, { color: colors.text }]}>
                Chọn ảnh món ăn đã nấu
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowProofImageModal(false);
                  setProofImage(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {proofImage ? (
              <View style={styles.proofImageContainer}>
                <Image source={{ uri: proofImage }} style={styles.proofImage} />
                <TouchableOpacity
                  style={styles.removeProofImageBtn}
                  onPress={() => setProofImage(null)}
                >
                  <Ionicons name="close-circle" size={32} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.proofImagePickerButtons}>
                <TouchableOpacity
                  style={[styles.proofPickerBtn, { backgroundColor: isDark ? '#1f1f3a' : '#f5f5f5' }]}
                  onPress={handlePickProofImage}
                >
                  <Ionicons name="images-outline" size={40} color={colors.primary} />
                  <ThemedText style={[styles.proofPickerBtnText, { color: colors.text }]}>
                    Thư viện
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.proofPickerBtn, { backgroundColor: isDark ? '#1f1f3a' : '#f5f5f5' }]}
                  onPress={handleTakeProofPhoto}
                >
                  <Ionicons name="camera-outline" size={40} color={colors.primary} />
                  <ThemedText style={[styles.proofPickerBtnText, { color: colors.text }]}>
                    Chụp ảnh
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.proofModalActions}>
              <TouchableOpacity
                style={[styles.proofCancelBtn, { backgroundColor: isDark ? '#1f1f3a' : '#f5f5f5' }]}
                onPress={() => {
                  setShowProofImageModal(false);
                  setProofImage(null);
                }}
              >
                <ThemedText style={[styles.proofCancelBtnText, { color: colors.text }]}>
                  Hủy
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proofSubmitBtn, { opacity: proofImage ? 1 : 0.5 }]}
                onPress={handleSubmitProof}
                disabled={!proofImage || uploadingProof}
              >
                <LinearGradient
                  colors={['#06A77D', '#4ECDC4']}
                  style={styles.proofSubmitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {uploadingProof ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <ThemedText style={styles.proofSubmitBtnText}>Hoàn thành</ThemedText>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completions Modal */}
      <Modal
        visible={showCompletionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompletionsModal(false)}
      >
        <View style={styles.completionsModalOverlay}>
          <Pressable 
            style={styles.completionsModalBackdrop} 
            onPress={() => setShowCompletionsModal(false)} 
          />
          <View style={[styles.completionsModalContent, { backgroundColor: isDark ? '#1f1f3a' : '#fff' }]}>
            <View style={styles.completionsModalHeader}>
              <ThemedText style={[styles.completionsModalTitle, { color: colors.text }]}>
                Người đã hoàn thành
              </ThemedText>
              <TouchableOpacity onPress={() => setShowCompletionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.completionsList}>
              {challengeCompletions.length === 0 ? (
                <View style={styles.emptyCompletions}>
                  <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyCompletionsText, { color: colors.textSecondary }]}>
                    Chưa có ai hoàn thành thử thách này
                  </ThemedText>
                </View>
              ) : (
                challengeCompletions.map((completion, index) => (
                  <View key={completion.userId || index} style={[styles.completionItem, { backgroundColor: isDark ? '#1f1f3a' : '#f5f5f5' }]}>
                    <View style={styles.completionLeft}>
                      {completion.userAvatar ? (
                        <Image 
                          source={{ uri: completion.userAvatar }} 
                          style={styles.completionAvatar}
                        />
                      ) : (
                        <View style={[styles.completionAvatar, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                      )}
                      <View style={styles.completionInfo}>
                        <ThemedText style={[styles.completionUserName, { color: colors.text }]}>
                          {completion.userName || 'Người dùng'}
                        </ThemedText>
                        <ThemedText style={[styles.completionDate, { color: colors.textSecondary }]}>
                          {completion.completedAt ? new Date(completion.completedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </ThemedText>
                      </View>
                    </View>
                    {completion.proofImageUrl && (
                      <Image 
                        source={{ uri: completion.proofImageUrl }} 
                        style={styles.completionImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Stats
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGradient: {
    borderRadius: 20,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Today Card
  todayCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  todayIconBg: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayContent: {
    flex: 1,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  todayTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  todayDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  todayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayStatText: {
    fontSize: 12,
  },
  actionBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  completedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6,167,125,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#06A77D',
  },
  completedRewardPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,217,61,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedRewardPointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD93D',
  },

  // Empty
  emptyCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  loginBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // History
  historyList: {
    gap: 10,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyPointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06A77D',
  },
  historyPending: {
    fontSize: 11,
  },

  // Tips
  tipsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Proof Image Modal
  proofModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  proofModalBackdrop: {
    flex: 1,
  },
  proofModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: height * 0.7,
  },
  proofModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  proofModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  proofImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  proofImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  removeProofImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  proofImagePickerButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  proofPickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 8,
  },
  proofPickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  proofModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  proofCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  proofCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  proofSubmitBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  proofSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  proofSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Completions Modal
  completionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  completionsModalBackdrop: {
    flex: 1,
  },
  completionsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: height * 0.8,
  },
  completionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  completionsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  completionsList: {
    maxHeight: height * 0.6,
  },
  emptyCompletions: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyCompletionsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  completionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  completionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  completionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  completionUserName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  completionDate: {
    fontSize: 12,
  },
});

