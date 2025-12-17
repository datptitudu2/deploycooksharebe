import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  View,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config/api';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { achievementService } from '@/services';
import { alertService } from '@/services/alertService';
import { StreakBreakAnimation } from '@/components/common/StreakBreakAnimation';
import { CustomAlert } from '@/components/common/CustomAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pushNotificationService } from '@/services/pushNotificationService';
import { CookingTimer } from '@/components/cooking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MealDetail {
  name: string;
  time?: string;
  ingredients?: string;   // Nguyên liệu cần thiết
  instructions?: string;  // Công thức, hướng dẫn nấu
  notes?: string;         // Ghi chú, tips, lưu ý
  source?: string;        // Nguồn tham khảo (công thức từ đâu)
  image?: string;         // Hình ảnh món ăn
  isCooked?: boolean;      // Đã nấu chưa
  cookedAt?: string;      // Thời gian nấu
  cookingStartTime?: string | null; // Thời gian bắt đầu nấu (for timer)
  expectedTime?: number | null; // Thời gian dự kiến nấu (phút)
}

interface MealPlan {
  date: string;
  breakfast?: string;
  breakfastTime?: string;
  breakfastDetail?: MealDetail;
  lunch?: string;
  lunchTime?: string;
  lunchDetail?: MealDetail;
  dinner?: string;
  dinnerTime?: string;
  dinnerDetail?: MealDetail;
  snack?: string;
  snackTime?: string;
  snackDetail?: MealDetail;
}

const mealConfig = {
  breakfast: { 
    icon: 'sunny-outline' as const, 
    label: 'Sáng', 
    color: '#FF9500',
    gradient: ['#FFB347', '#FF9500'] as const,
    defaultTime: '7:00' // Chỉ hiển thị giờ bắt đầu
  },
  lunch: { 
    icon: 'restaurant-outline' as const, 
    label: 'Trưa', 
    color: '#34C759',
    gradient: ['#5CD85A', '#34C759'] as const,
    defaultTime: '12:00'
  },
  dinner: { 
    icon: 'moon-outline' as const, 
    label: 'Tối', 
    color: '#AF52DE',
    gradient: ['#C77DFF', '#AF52DE'] as const,
    defaultTime: '18:00'
  },
  snack: { 
    icon: 'cafe-outline' as const, 
    label: 'Xế', 
    color: '#FF6B6B',
    gradient: ['#FF8E8E', '#FF6B6B'] as const,
    defaultTime: '15:00'
  },
};

export default function MealPlanningScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const router = useRouter();

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Auto scroll to top when edit modal opens
  useEffect(() => {
    if (showEditModal && editModalScrollRef.current) {
      // Scroll lên đầu ngay khi modal mở - thử nhiều lần để đảm bảo
      const scrollToTop = () => {
        editModalScrollRef.current?.scrollTo({ y: 0, animated: false });
      };
      
      // Scroll ngay lập tức
      scrollToTop();
      
      // Scroll lại sau các khoảng thời gian để đảm bảo
      setTimeout(scrollToTop, 50);
      setTimeout(scrollToTop, 150);
      setTimeout(scrollToTop, 300);
      setTimeout(scrollToTop, 500);
    }
  }, [showEditModal]);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [selectedMealDetail, setSelectedMealDetail] = useState<MealDetail | null>(null);
  const [mealInputText, setMealInputText] = useState('');
  const [mealInputTime, setMealInputTime] = useState('12:00');
  const [mealInputIngredients, setMealInputIngredients] = useState('');
  const [mealInputInstructions, setMealInputInstructions] = useState('');
  const [mealInputNotes, setMealInputNotes] = useState('');
  const [mealInputSource, setMealInputSource] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [generateStartDate, setGenerateStartDate] = useState(new Date());
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [alertData, setAlertData] = useState<{ title: string; message: string } | null>(null);
  const [generateDays, setGenerateDays] = useState(7);
  const [selectedRegion, setSelectedRegion] = useState<string>('vietnam-north'); // Mặc định miền Bắc
  const [isFromRecipe, setIsFromRecipe] = useState(false); // Flag để biết data đến từ recipe
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerMealType, setTimerMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [timerMealName, setTimerMealName] = useState('');
  const [timerMealDetail, setTimerMealDetail] = useState<MealDetail | null>(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const editModalScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMealPlans();
    // FAB pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Xử lý khi có params từ recipe detail
  useEffect(() => {
    if (params.addRecipe && params.recipeName) {
      
      // Set flag để biết data đến từ recipe
      setIsFromRecipe(true);
      
      // Điền thông tin món ăn từ recipe
      setMealInputText(params.recipeName as string);
      
      // Parse ingredients
      if (params.recipeIngredients) {
        try {
          const ingredients = JSON.parse(params.recipeIngredients as string);
          const ingredientsText = Array.isArray(ingredients) 
            ? ingredients.map((ing: any) => typeof ing === 'string' ? ing : ing.name || ing).join('\n')
            : String(ingredients);
          setMealInputIngredients(ingredientsText);
        } catch (e) {
        }
      }
      
      // Parse instructions
      if (params.recipeInstructions) {
        try {
          const instructions = JSON.parse(params.recipeInstructions as string);
          const instructionsText = Array.isArray(instructions)
            ? instructions.map((step: any, index: number) => {
                if (typeof step === 'string') return `${index + 1}. ${step}`;
                return `${index + 1}. ${step.step || step.text || step}`;
              }).join('\n\n')
            : String(instructions);
          setMealInputInstructions(instructionsText);
        } catch (e) {
        }
      }
      
      
      // Tự động mở modal "Thêm món" với meal type mặc định dựa trên giờ hiện tại
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 10) {
        setSelectedMealType('breakfast');
        setMealInputTime('7:00');
      } else if (currentHour >= 10 && currentHour < 14) {
        setSelectedMealType('lunch');
        setMealInputTime('12:00');
      } else if (currentHour >= 14 && currentHour < 17) {
        setSelectedMealType('snack');
        setMealInputTime('15:00');
      } else {
        setSelectedMealType('dinner');
        setMealInputTime('18:00');
      }
      
      // Mở modal sau một chút để đảm bảo state đã được set
      setTimeout(() => {
        setShowAddModal(true);
        console.log('📝 Modal opened with recipe data');
        // Clear params sau khi đã load xong để tránh mở lại modal khi quay lại
        setTimeout(() => {
          router.setParams({
            addRecipe: undefined,
            recipeName: undefined,
            recipeIngredients: undefined,
            recipeInstructions: undefined,
            recipeImage: undefined,
            recipeDescription: undefined,
          });
        }, 500);
      }, 300);
    }
  }, [params.addRecipe, params.recipeName]);

  const loadMealPlans = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/meal-planning/week`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMealPlans(response.data.plan || []);
      }
    } catch (error) {
    }
  };

  const handleGenerateWeekPlan = async () => {
    setIsGenerating(true);
    setShowGenerateModal(false);
    try {
      const response = await axios.post(
        `${API_URL}/meal-planning/generate-week`,
        { 
          startDate: generateStartDate.toISOString().split('T')[0],
          days: generateDays,
          region: selectedRegion
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
      );
      if (response.data.success) {
        setMealPlans(response.data.plan || []);
        alertService.success(`AI đã tạo lịch ăn ${generateDays} ngày cho bạn!`);
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể tạo lịch');
    } finally {
      setIsGenerating(false);
    }
  };

  const validateTime = (time: string): boolean => {
    // Format: HH:mm hoặc H:mm (0-23:00-59)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  const resetMealInputs = () => {
    setMealInputText('');
    setMealInputTime(getDefaultTime(selectedMealType));
    setMealInputIngredients('');
    setMealInputInstructions('');
    setMealInputNotes('');
  };

  const handleAddMeal = async () => {
    if (!token || !mealInputText.trim()) {
      alertService.warning('Vui lòng nhập tên món ăn');
      return;
    }

    // Validate time format
    if (mealInputTime && !validateTime(mealInputTime)) {
      alertService.warning('Vui lòng nhập đúng định dạng giờ (VD: 7:16, 12:30)');
      return;
    }
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const mealDetail: MealDetail = {
        name: mealInputText.trim(),
        time: mealInputTime || getDefaultTime(selectedMealType),
        ingredients: mealInputIngredients.trim() || undefined,
        instructions: mealInputInstructions.trim() || undefined,
        notes: mealInputNotes.trim() || undefined,
      };

      const response = await axios.post(
        `${API_URL}/meal-planning/add`,
        { 
          date: dateStr, 
          mealType: selectedMealType, 
          mealName: mealInputText.trim(),
          mealTime: mealInputTime || getDefaultTime(selectedMealType),
          mealDetail: Object.keys(mealDetail).length > 2 ? mealDetail : undefined // Only send if has extra info
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        // Reload meal plans để đồng bộ data
        await loadMealPlans();
        setShowAddModal(false);
        // Reset inputs và flag
        resetMealInputs();
        setIsFromRecipe(false);
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể thêm');
    }
  };

  const handleEditMeal = async () => {
    if (!token || !mealInputText.trim() || !selectedMealDetail) {
      alertService.warning('Vui lòng nhập tên món ăn');
      return;
    }
    
    if (mealInputTime && !validateTime(mealInputTime)) {
      alertService.warning('Vui lòng nhập đúng định dạng giờ');
      return;
    }
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const mealDetail: MealDetail = {
        name: mealInputText.trim(),
        time: mealInputTime || getDefaultTime(selectedMealType),
        ingredients: mealInputIngredients.trim() || undefined,
        instructions: mealInputInstructions.trim() || undefined,
        notes: mealInputNotes.trim() || undefined,
      };

      const response = await axios.put(
        `${API_URL}/meal-planning/update`,
        { 
          date: dateStr, 
          mealType: selectedMealType, 
          mealDetail
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        await loadMealPlans();
        setShowEditModal(false);
        setSelectedMealDetail(null);
        resetMealInputs();
        // Cập nhật meal reminders với meal plan mới
        await pushNotificationService.updateMealReminders();
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể cập nhật');
    }
  };
  
  const getDefaultTime = (type: string) => {
    return mealConfig[type as keyof typeof mealConfig]?.defaultTime || '12:00';
  };

  const handleDeleteMeal = async (date: string, mealType: string) => {
    try {
      await axios.delete(`${API_URL}/meal-planning/delete`, {
        data: { date, mealType },
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadMealPlans();
      // Cập nhật meal reminders sau khi xóa
      await pushNotificationService.updateMealReminders();
    } catch (error) {
      alertService.error('Không thể xóa');
    }
  };

  const formatDateShort = (date: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`;
  };

  const formatDateLong = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${days[date.getDay()]}, ${date.getDate()} tháng ${date.getMonth() + 1}`;
  };

  const getNext7Days = () => {
    const dates = [];
    const today = new Date();
    // Hiển thị 3 ngày trước, hôm nay, và 7 ngày tới (tổng 11 ngày)
    for (let i = -3; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getMealsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlans.find(p => p.date === dateStr);
  };

  const totalMeals = mealPlans.reduce((acc, p) => 
    acc + (p.breakfast ? 1 : 0) + (p.lunch ? 1 : 0) + (p.dinner ? 1 : 0) + (p.snack ? 1 : 0), 0
  );

  const next7Days = getNext7Days();
  const selectedDayMeals = getMealsForDate(selectedDate);

  // Theme colors
  const theme = {
    bg: isDark ? '#0A0A0F' : '#F8F9FE',
    card: isDark ? '#16161F' : '#FFFFFF',
    cardBorder: isDark ? '#252530' : '#F0F0F5',
    text: isDark ? '#FFFFFF' : '#1A1A2E',
    textSecondary: isDark ? '#8888AA' : '#6B6B80',
    accent: '#FF6B35',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1A1A2E', '#16161F'] : ['#FF6B35', '#FF8F5A']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <ThemedText 
                style={styles.headerTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Lịch Ăn Uống
              </ThemedText>
              <ThemedText 
                style={styles.headerSubtitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {totalMeals > 0 ? `${totalMeals} bữa ăn đã lên kế hoạch` : 'Bắt đầu lên kế hoạch nào!'}
              </ThemedText>
            </View>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowGenerateModal(true)}
            >
              <Ionicons name="construct" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        
        {/* Level Up Animation - Break Chuỗi Lửa */}
        <StreakBreakAnimation
          visible={showLevelUpAnimation}
          newLevel={newLevel}
          onComplete={() => {
            // Không set false ngay, để animation hiển thị đủ thời gian
            // Sẽ được set false sau khi alert hiện
          }}
        />
        
        <CookingTimer
          visible={showTimerModal}
          onClose={() => setShowTimerModal(false)}
          onStart={async (expectedMinutes) => {
            try {
              const dateStr = selectedDate.toISOString().split('T')[0];
              const response = await axios.post(
                `${API_URL}/meal-planning/start-timer`,
                {
                  date: dateStr,
                  mealType: timerMealType,
                  expectedTime: expectedMinutes,
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              
              if (response.data.success) {
                alertService.success('Đã bắt đầu timer! Nấu đúng giờ để nhận full exp nhé!');
                loadMealPlans(); // Reload to get updated cookingStartTime
              }
            } catch (error: any) {
              alertService.error(error.response?.data?.message || 'Không thể bắt đầu timer');
            }
          }}
          mealName={timerMealName}
          cookingStartTime={timerMealDetail?.cookingStartTime}
          expectedTime={timerMealDetail?.expectedTime}
        />
        
        <CustomAlert
          visible={showCustomAlert}
          title={alertData?.title || '🎉 Chúc mừng!'}
          message={alertData?.message || ''}
          onClose={() => {
            setShowCustomAlert(false);
            setAlertData(null);
          }}
        />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* AI Generate Card */}
        <TouchableOpacity 
          style={[styles.aiCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => setShowGenerateModal(true)}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8F5A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCardGradient}
          >
            <View style={styles.aiCardIcon}>
              <Ionicons name="construct" size={28} color="#FFFFFF" />
            </View>
          </LinearGradient>
          <View style={styles.aiCardContent}>
            <ThemedText style={[styles.aiCardTitle, { color: theme.text }]}>
              {isGenerating ? 'Đang tạo lịch...' : 'AI Tạo Lịch Thông Minh'}
            </ThemedText>
            <ThemedText style={[styles.aiCardDesc, { color: theme.textSecondary }]}>
              Để AI gợi ý thực đơn phù hợp với bạn
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Date Selector */}
        <View style={styles.dateSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Chọn ngày
          </ThemedText>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScrollContent}
          >
            {next7Days.map((date, index) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dateOnly = new Date(date);
              dateOnly.setHours(0, 0, 0, 0);
              const isPast = dateOnly < today;
              const hasMeals = getMealsForDate(date);
              // Đếm số món (có thể là string hoặc object)
              const mealCount = hasMeals ? 
                (() => {
                  let count = 0;
                  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
                  mealTypes.forEach(type => {
                    const meal = hasMeals[type];
                    if (meal) {
                      if (typeof meal === 'string' || (typeof meal === 'object' && (meal as any).name)) {
                        count++;
                      }
                    }
                  });
                  return count;
                })() : 0;
              
              // Đếm số món đã nấu (kiểm tra cả meal object và mealDetail)
              const cookedCount = hasMeals ? 
                (() => {
                  let count = 0;
                  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
                  mealTypes.forEach(type => {
                    const meal = hasMeals[type];
                    const mealDetail = hasMeals[`${type}Detail` as keyof MealPlan] as MealDetail | undefined;
                    if (mealDetail?.isCooked) {
                      count++;
                    } else if (meal && typeof meal === 'object' && (meal as any).isCooked) {
                      count++;
                    }
                  });
                  return count;
                })() : 0;
              const allCooked = mealCount > 0 && cookedCount === mealCount;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateCard,
                    { backgroundColor: isSelected ? theme.accent : theme.card, borderColor: theme.cardBorder },
                    isSelected && styles.dateCardSelected,
                    isPast && !isToday && { opacity: 0.7 }
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[
                    styles.dateDay,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary }
                  ]}>
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}
                  </ThemedText>
                  <ThemedText style={[
                    styles.dateNum,
                    { color: isSelected ? '#FFFFFF' : theme.text }
                  ]}>
                    {date.getDate()}
                  </ThemedText>
                  {isToday && (
                    <View style={[styles.todayDot, { backgroundColor: isSelected ? '#FFFFFF' : theme.accent }]} />
                  )}
                  {mealCount > 0 && (
                    <View style={[styles.mealBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : theme.accent + '20' }]}>
                      <ThemedText style={[styles.mealBadgeText, { color: isSelected ? '#FFFFFF' : theme.accent }]}>
                        {mealCount}
                      </ThemedText>
                    </View>
                  )}
                  {allCooked && (
                    <View style={[styles.cookedDateBadge, { backgroundColor: isSelected ? 'rgba(52, 199, 89, 0.3)' : '#34C759' + '40' }]}>
                      <Ionicons name="checkmark-circle" size={12} color={isSelected ? '#FFFFFF' : '#34C759'} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Date Header */}
        <View style={styles.selectedDateHeader}>
          <ThemedText style={[styles.selectedDateText, { color: theme.text }]}>
            {formatDateLong(selectedDate)}
          </ThemedText>
        </View>

        {/* Meals Grid */}
        <View style={styles.mealsGrid}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
            const config = mealConfig[type];
            const meal = selectedDayMeals?.[type];
            const mealDetail = selectedDayMeals?.[`${type}Detail` as keyof MealPlan] as MealDetail | undefined;
            const customTime = selectedDayMeals?.[`${type}Time` as keyof MealPlan] as string | undefined;
            const displayTime = customTime || mealDetail?.time || config.defaultTime;
            
            // Xử lý meal có thể là string hoặc object {name, isCooked, cookedAt}
            let mealName = '';
            let actualMealDetail = mealDetail;
            
            if (meal) {
              if (typeof meal === 'string') {
                mealName = meal;
              } else if (typeof meal === 'object' && meal !== null) {
                // meal là object {name, isCooked, cookedAt}
                mealName = (meal as any).name || '';
                // Nếu mealDetail chưa có, dùng từ meal object
                if (!actualMealDetail && (meal as any).name) {
                  actualMealDetail = {
                    name: (meal as any).name,
                    isCooked: (meal as any).isCooked || false,
                    cookedAt: (meal as any).cookedAt,
                  } as MealDetail;
                }
              }
            }
            
            // Ưu tiên mealDetail.name nếu có
            if (mealDetail?.name) {
              mealName = mealDetail.name;
              actualMealDetail = mealDetail;
            }
            
            // Kiểm tra xem ngày có phải là tương lai không
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDateOnly = new Date(selectedDate);
            selectedDateOnly.setHours(0, 0, 0, 0);
            const isFutureDate = selectedDateOnly > today;
            const canMarkAsCooked = !isFutureDate && !actualMealDetail?.isCooked;

            return (
              <TouchableOpacity
                key={type}
                style={[styles.mealCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => {
                  if (mealName || actualMealDetail) {
                    // Show detail modal
                    const detail: MealDetail = actualMealDetail || {
                      name: mealName || '',
                      time: displayTime,
                    };
                    setSelectedMealType(type);
                    setSelectedMealDetail(detail);
                    setShowDetailModal(true);
                  } else {
                    setSelectedMealType(type);
                    resetMealInputs();
                    setShowAddModal(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={config.gradient}
                  style={styles.mealCardIcon}
                >
                  <Ionicons name={config.icon} size={22} color="#FFFFFF" />
                </LinearGradient>
                
                <View style={styles.mealCardContent}>
                  <View style={styles.mealCardHeader}>
                    <ThemedText 
                      style={[styles.mealCardLabel, { color: config.color }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {config.label}
                    </ThemedText>
                    <View style={styles.mealCardTimeContainer}>
                      <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                      <ThemedText style={[styles.mealCardTime, { color: theme.textSecondary }]}>
                        {displayTime}
                      </ThemedText>
                    </View>
                  </View>
                  
                  {mealName ? (
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={[styles.mealCardName, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                          {mealName}
                        </ThemedText>
                        {mealDetail?.isCooked && (
                          <View style={[styles.cookedBadge, { backgroundColor: '#34C759' }]}>
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      {mealDetail?.ingredients && (
                        <View style={styles.mealCardIngredients}>
                          <Ionicons name="list" size={10} color={theme.textSecondary} />
                          <ThemedText style={[styles.mealCardIngredientsText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {mealDetail.ingredients}
                          </ThemedText>
                        </View>
                      )}
                      {(mealDetail?.notes || mealDetail?.instructions) && (
                        <View style={styles.mealCardNote}>
                          <Ionicons name="bulb-outline" size={10} color={theme.textSecondary} />
                          <ThemedText style={[styles.mealCardNoteText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {mealDetail.notes || mealDetail.instructions}
                          </ThemedText>
                        </View>
                      )}
                      {canMarkAsCooked && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                          <TouchableOpacity
                            style={[styles.markCookedBtn, { backgroundColor: '#FFB84D' + '20', flex: 1 }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setTimerMealType(type);
                              setTimerMealName(mealName);
                              setTimerMealDetail(actualMealDetail || null);
                              setShowTimerModal(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="timer-outline" size={14} color="#FFB84D" />
                            <ThemedText style={[styles.markCookedBtnText, { color: '#FFB84D' }]}>
                              Timer
                            </ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.markCookedBtn, { backgroundColor: theme.accent + '20', flex: 1 }]}
                            onPress={async (e) => {
                              e.stopPropagation();
                              try {
                                const dateStr = selectedDate.toISOString().split('T')[0];
                                const response = await achievementService.markMealAsCooked(dateStr, type);
                                if (response.success) {
                                  // Reload meal plans
                                  loadMealPlans();
                                  
                                  if (response.leveledUp) {
                                    // Hiển thị animation break chuỗi lửa
                                    setNewLevel(response.newLevel || 1);
                                    setShowLevelUpAnimation(true);
                                    
                                    // Hiển thị custom alert ngay sau khi animation kết thúc
                                    setTimeout(() => {
                                      setShowLevelUpAnimation(false); // Ẩn animation
                                      const message = `Bạn đã lên Level ${response.newLevel}!${response.reward?.points ? `\n\n+${response.reward.points} điểm thưởng` : ''}${response.reward?.badge ? `\n\n🏆 Unlock badge mới!` : ''}`;
                                      setAlertData({
                                        title: '🎉 Chúc mừng!',
                                        message: message,
                                      });
                                      setShowCustomAlert(true);
                                    }, 12000); // Sau ~12 giây animation
                                } else {
                                  // Hiển thị message từ backend (có thể có penalty info)
                                  const pointsEarned = response.pointsEarned ?? response.points ?? 12;
                                  const message = response.message || `Đã đánh dấu món đã nấu! +${pointsEarned} điểm`;
                                  if (response.penalty && response.penalty > 0) {
                                    alertService.warning(message);
                                  } else {
                                    alertService.success(message);
                                  }
                                }
                                }
                              } catch (error: any) {
                                alertService.error(error.response?.data?.message || 'Không thể đánh dấu món đã nấu');
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark-circle-outline" size={14} color={theme.accent} />
                            <ThemedText style={[styles.markCookedBtnText, { color: theme.accent }]}>
                              Đã nấu
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                      {actualMealDetail?.isCooked && (
                        <View style={[styles.markCookedBtn, { backgroundColor: '#34C759' }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                          <ThemedText style={[styles.markCookedBtnText, { color: '#FFFFFF' }]}>
                            Đã nấu
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.mealCardEmpty}>
                      <Ionicons name="add-circle-outline" size={18} color={theme.textSecondary} />
                      <ThemedText style={[styles.mealCardEmptyText, { color: theme.textSecondary }]}>
                        Thêm món
                      </ThemedText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats */}
        {totalMeals > 0 && (
          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color={theme.accent} />
              <View>
                <ThemedText style={[styles.statValue, { color: theme.text }]}>{totalMeals}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Bữa ăn</ThemedText>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
              <View>
                <ThemedText style={[styles.statValue, { color: theme.text }]}>{mealPlans.length}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Ngày</ThemedText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
                onPress={() => {
                  setSelectedMealType('lunch');
                  resetMealInputs();
                  setShowAddModal(true);
                }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8F5A']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Add Meal Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
              <View style={styles.modalHandle} />
              
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                  Thêm món ăn
                </ThemedText>
                <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {formatDateLong(selectedDate)}
                </ThemedText>

                {/* Meal Type Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                  const config = mealConfig[type];
                  const isSelected = selectedMealType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pill,
                        { 
                          backgroundColor: isSelected ? config.color : theme.bg,
                          borderColor: isSelected ? config.color : theme.cardBorder
                        }
                      ]}
                      onPress={() => {
                        setSelectedMealType(type);
                        setMealInputTime(getDefaultTime(type));
                      }}
                    >
                      <Ionicons 
                        name={config.icon} 
                        size={16} 
                        color={isSelected ? '#FFFFFF' : config.color} 
                      />
                      <ThemedText style={[
                        styles.pillText,
                        { color: isSelected ? '#FFFFFF' : theme.text }
                      ]}>
                        {config.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time Selector */}
              <View style={styles.timeSection}>
                <ThemedText style={[styles.timeLabel, { color: theme.textSecondary }]}>
                  Thời gian
                </ThemedText>
                
                {/* Quick Select Buttons */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.timeQuickSelect}
                  contentContainerStyle={styles.timeQuickSelectContent}
                >
                  {['6:00', '7:00', '8:00', '9:00', '12:00', '13:00', '18:00', '19:00', '20:00'].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        { 
                          backgroundColor: mealInputTime === time ? theme.accent : theme.bg,
                          borderColor: mealInputTime === time ? theme.accent : theme.cardBorder
                        }
                      ]}
                      onPress={() => setMealInputTime(time)}
                    >
                      <ThemedText style={[
                        styles.timeChipText,
                        { color: mealInputTime === time ? '#FFFFFF' : theme.text }
                      ]}>
                        {time}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Custom Time Input */}
                <View style={styles.customTimeContainer}>
                  <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.customTimeInput, { 
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: mealInputTime && validateTime(mealInputTime) ? '#34C759' : theme.cardBorder
                    }]}
                    placeholder="Hoặc nhập giờ (VD: 7:16, 8:45)"
                    placeholderTextColor={theme.textSecondary}
                    value={mealInputTime}
                    onChangeText={(text) => {
                      // Allow typing freely, validate on submit
                      // Format: H:mm or HH:mm
                      const cleanText = text.replace(/[^0-9:]/g, '');
                      
                      // Auto-format: add colon after 1-2 digits
                      let formatted = cleanText;
                      if (cleanText.length === 2 && !cleanText.includes(':')) {
                        formatted = cleanText + ':';
                      } else if (cleanText.length > 2 && !cleanText.includes(':')) {
                        formatted = cleanText.slice(0, 2) + ':' + cleanText.slice(2);
                      }
                      
                      // Limit to HH:mm format
                      if (formatted.length <= 5) {
                        setMealInputTime(formatted);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {mealInputTime && validateTime(mealInputTime) && (
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  )}
                </View>
              </View>

              {/* Meal Name */}
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="Tên món ăn *"
                placeholderTextColor={theme.textSecondary}
                value={mealInputText}
                onChangeText={setMealInputText}
                autoFocus
                returnKeyType="next"
              />

              {/* Ingredients */}
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder=" Nguyên liệu (VD: Thịt bò 500g, Hành tây, Gia vị...)"
                placeholderTextColor={theme.textSecondary}
                value={mealInputIngredients}
                onChangeText={setMealInputIngredients}
                multiline
                numberOfLines={2}
                returnKeyType="next"
              />

              {/* Instructions */}
              <TextInput
                style={[styles.modalInput, styles.instructionsInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="📖 Công thức, hướng dẫn nấu..."
                placeholderTextColor={theme.textSecondary}
                value={mealInputInstructions}
                onChangeText={setMealInputInstructions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="next"
              />

              {/* Notes */}
              <TextInput
                style={[styles.modalInput, styles.notesInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="💡 Mẹo & Lưu ý (tips nấu ăn, cách bảo quản...)"
                placeholderTextColor={theme.textSecondary}
                value={mealInputNotes}
                onChangeText={setMealInputNotes}
                multiline
                numberOfLines={2}
                returnKeyType="next"
              />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: theme.bg }]}
                    onPress={() => setShowAddModal(false)}
                  >
                    <ThemedText style={[styles.modalBtnText, { color: theme.textSecondary }]}>Hủy</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={handleAddMeal}
                  >
                    <LinearGradient colors={['#FF6B35', '#FF8F5A']} style={styles.modalBtnGradient}>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <ThemedText style={styles.modalBtnTextWhite}>Thêm</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Meal Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowDetailModal(false)}>
          <View style={styles.detailModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.detailModal, { backgroundColor: theme.card }]}>
                {selectedMealDetail && (
                  <>
                    {/* Header */}
                    <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderLeft}>
                        <LinearGradient
                          colors={mealConfig[selectedMealType].gradient}
                          style={styles.detailIcon}
                        >
                          <Ionicons name={mealConfig[selectedMealType].icon} size={24} color="#FFFFFF" />
                        </LinearGradient>
                        <View>
                          <ThemedText style={[styles.detailTitle, { color: theme.text }]}>
                            {selectedMealDetail.name}
                          </ThemedText>
                          <ThemedText style={[styles.detailSubtitle, { color: theme.textSecondary }]}>
                            {mealConfig[selectedMealType].label}
                          </ThemedText>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowDetailModal(false)}
                        style={styles.detailCloseBtn}
                      >
                        <Ionicons name="close" size={24} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                      {/* Time */}
                      <View style={styles.detailRow}>
                        <View style={styles.detailRowIcon}>
                          <Ionicons name="time-outline" size={20} color={mealConfig[selectedMealType].color} />
                        </View>
                        <View style={styles.detailRowContent}>
                          <ThemedText style={[styles.detailRowLabel, { color: theme.textSecondary }]}>
                            Thời gian
                          </ThemedText>
                          <ThemedText style={[styles.detailRowValue, { color: theme.text }]}>
                            {selectedMealDetail.time || getDefaultTime(selectedMealType)} - {formatDateLong(selectedDate)}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Ingredients */}
                      {selectedMealDetail.ingredients && (
                        <View style={styles.detailRow}>
                          <View style={styles.detailRowIcon}>
                            <Ionicons name="list-outline" size={20} color={mealConfig[selectedMealType].color} />
                          </View>
                          <View style={styles.detailRowContent}>
                            <ThemedText style={[styles.detailRowLabel, { color: theme.textSecondary }]}>
                              Nguyên liệu
                            </ThemedText>
                            <ThemedText style={[styles.detailRowValue, { color: theme.text }]}>
                              {selectedMealDetail.ingredients}
                            </ThemedText>
                          </View>
                        </View>
                      )}

                      {/* Instructions */}
                      {selectedMealDetail.instructions && (
                        <View style={styles.detailRow}>
                          <View style={styles.detailRowIcon}>
                            <Ionicons name="book-outline" size={20} color={mealConfig[selectedMealType].color} />
                          </View>
                          <View style={styles.detailRowContent}>
                            <ThemedText style={[styles.detailRowLabel, { color: theme.textSecondary }]}>
                              Công thức
                            </ThemedText>
                            <ThemedText style={[styles.detailRowValue, { color: theme.text, lineHeight: 22 }]}>
                              {selectedMealDetail.instructions}
                            </ThemedText>
                          </View>
                        </View>
                      )}

                      {/* Notes */}
                      {selectedMealDetail.notes && (
                        <View style={styles.detailRow}>
                          <View style={styles.detailRowIcon}>
                            <Ionicons name="bulb-outline" size={20} color={mealConfig[selectedMealType].color} />
                          </View>
                          <View style={styles.detailRowContent}>
                            <ThemedText style={[styles.detailRowLabel, { color: theme.textSecondary }]}>
                              Mẹo & Lưu ý
                            </ThemedText>
                            <ThemedText style={[styles.detailRowValue, { color: theme.text }]}>
                              {selectedMealDetail.notes}
                            </ThemedText>
                          </View>
                        </View>
                      )}

                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.detailActions}>
                      <TouchableOpacity
                        style={[styles.detailActionBtn, { backgroundColor: theme.bg }]}
                        onPress={() => {
                          setShowDetailModal(false);
                          // Load data vào edit form
                          setMealInputText(selectedMealDetail.name);
                          setMealInputTime(selectedMealDetail.time || getDefaultTime(selectedMealType));
                          setMealInputIngredients(selectedMealDetail.ingredients || '');
                          setMealInputInstructions(selectedMealDetail.instructions || '');
                          setMealInputNotes(selectedMealDetail.notes || '');
                          // Mở modal
                          setShowEditModal(true);
                          // Scroll lên đầu ngay sau khi modal mở
                          setTimeout(() => {
                            editModalScrollRef.current?.scrollTo({ y: 0, animated: false });
                          }, 150);
                          setTimeout(() => {
                            editModalScrollRef.current?.scrollTo({ y: 0, animated: false });
                          }, 400);
                        }}
                      >
                        <Ionicons name="create-outline" size={18} color={theme.text} />
                        <ThemedText style={[styles.detailActionText, { color: theme.text }]}>
                          Chỉnh sửa
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.detailActionBtn, styles.detailActionBtnPrimary]}
                        onPress={() => {
                          alertService.confirm(
                            `Bạn có muốn xóa "${selectedMealDetail.name}"?`,
                            'Xóa món ăn',
                            async () => {
                              await handleDeleteMeal(selectedDate.toISOString().split('T')[0], selectedMealType);
                              setShowDetailModal(false);
                              setSelectedMealDetail(null);
                            }
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                        <ThemedText style={styles.detailActionTextWhite}>
                          Xóa
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Modal - Reuse Add Modal structure but with edit mode */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
              <View style={styles.modalHandle} />
              
              <ScrollView 
                ref={editModalScrollRef}
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={false}
                nestedScrollEnabled={true}
              >
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                  Chỉnh sửa món ăn
                </ThemedText>
                <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {formatDateLong(selectedDate)}
                </ThemedText>

                {/* Meal Type Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                  const config = mealConfig[type];
                  const isSelected = selectedMealType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pill,
                        { 
                          backgroundColor: isSelected ? config.color : theme.bg,
                          borderColor: isSelected ? config.color : theme.cardBorder
                        }
                      ]}
                      onPress={() => {
                        setSelectedMealType(type);
                        setMealInputTime(getDefaultTime(type));
                      }}
                    >
                      <Ionicons 
                        name={config.icon} 
                        size={16} 
                        color={isSelected ? '#FFFFFF' : config.color} 
                      />
                      <ThemedText style={[
                        styles.pillText,
                        { color: isSelected ? '#FFFFFF' : theme.text }
                      ]}>
                        {config.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time Selector */}
              <View style={styles.timeSection}>
                <ThemedText style={[styles.timeLabel, { color: theme.textSecondary }]}>
                  Thời gian
                </ThemedText>
                
                {/* Quick Select Buttons */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.timeQuickSelect}
                  contentContainerStyle={styles.timeQuickSelectContent}
                >
                  {['6:00', '7:00', '8:00', '9:00', '12:00', '13:00', '18:00', '19:00', '20:00'].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        { 
                          backgroundColor: mealInputTime === time ? theme.accent : theme.bg,
                          borderColor: mealInputTime === time ? theme.accent : theme.cardBorder
                        }
                      ]}
                      onPress={() => setMealInputTime(time)}
                    >
                      <ThemedText style={[
                        styles.timeChipText,
                        { color: mealInputTime === time ? '#FFFFFF' : theme.text }
                      ]}>
                        {time}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Custom Time Input */}
                <View style={styles.customTimeContainer}>
                  <TextInput
                    style={[styles.customTimeInput, { 
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: mealInputTime && validateTime(mealInputTime) ? '#34C759' : theme.cardBorder
                    }]}
                    placeholder="Hoặc nhập giờ (VD: 7:16, 8:45)"
                    placeholderTextColor={theme.textSecondary}
                    value={mealInputTime}
                    onChangeText={(text) => {
                      const cleanText = text.replace(/[^0-9:]/g, '');
                      let formatted = cleanText;
                      if (cleanText.length === 2 && !cleanText.includes(':')) {
                        formatted = cleanText + ':';
                      } else if (cleanText.length > 2 && !cleanText.includes(':')) {
                        formatted = cleanText.slice(0, 2) + ':' + cleanText.slice(2);
                      }
                      if (formatted.length <= 5) {
                        setMealInputTime(formatted);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {mealInputTime && validateTime(mealInputTime) && (
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  )}
                </View>
              </View>

              {/* Meal Name */}
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="Tên món ăn *"
                placeholderTextColor={theme.textSecondary}
                value={mealInputText}
                onChangeText={setMealInputText}
                returnKeyType="next"
              />

              {/* Ingredients */}
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="🥘 Nguyên liệu (VD: Thịt bò 500g, Hành tây, Gia vị...)"
                placeholderTextColor={theme.textSecondary}
                value={mealInputIngredients}
                onChangeText={setMealInputIngredients}
                multiline
                numberOfLines={2}
                returnKeyType="next"
              />

              {/* Instructions */}
              <TextInput
                style={[styles.modalInput, styles.instructionsInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="📖 Công thức, hướng dẫn nấu..."
                placeholderTextColor={theme.textSecondary}
                value={mealInputInstructions}
                onChangeText={setMealInputInstructions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="next"
              />

              {/* Notes */}
              <TextInput
                style={[styles.modalInput, styles.notesInput, { 
                  backgroundColor: theme.bg, 
                  color: theme.text,
                  borderColor: theme.cardBorder
                }]}
                placeholder="💡 Mẹo & Lưu ý (tips nấu ăn, cách bảo quản...)"
                placeholderTextColor={theme.textSecondary}
                value={mealInputNotes}
                onChangeText={setMealInputNotes}
                multiline
                numberOfLines={2}
                returnKeyType="next"
              />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: theme.bg }]}
                    onPress={() => {
                      setShowEditModal(false);
                      resetMealInputs();
                    }}
                  >
                    <ThemedText style={[styles.modalBtnText, { color: theme.textSecondary }]}>Hủy</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={handleEditMeal}
                  >
                    <LinearGradient colors={['#FF6B35', '#FF8F5A']} style={styles.modalBtnGradient}>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <ThemedText style={styles.modalBtnTextWhite}>Lưu</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Generate Modal */}
      <Modal visible={showGenerateModal} transparent animationType="fade">
        <View style={styles.generateModalOverlay}>
          <View style={[styles.generateModal, { backgroundColor: theme.card }]}>
            <View style={styles.generateHeader}>
              <LinearGradient colors={['#FF6B35', '#FF8F5A']} style={styles.generateIcon}>
                <Ionicons name="construct" size={32} color="#FFFFFF" />
              </LinearGradient>
              <ThemedText style={[styles.generateTitle, { color: theme.text }]}>
                AI Tạo Lịch Ăn
              </ThemedText>
              <ThemedText style={[styles.generateDesc, { color: theme.textSecondary }]}>
                Chọn khoảng thời gian để AI gợi ý thực đơn
              </ThemedText>
            </View>

            {/* Start Date */}
            <View style={styles.generateSection}>
              <ThemedText style={[styles.generateLabel, { color: theme.textSecondary }]}>
                Bắt đầu từ
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                  const date = new Date();
                  date.setDate(date.getDate() + offset);
                  const isSelected = date.toDateString() === generateStartDate.toDateString();
                  return (
                    <TouchableOpacity
                      key={offset}
                      style={[
                        styles.generateDateBtn,
                        { 
                          backgroundColor: isSelected ? theme.accent : theme.bg,
                          borderColor: isSelected ? theme.accent : theme.cardBorder
                        }
                      ]}
                      onPress={() => setGenerateStartDate(date)}
                    >
                      <ThemedText style={[
                        styles.generateDateText,
                        { color: isSelected ? '#FFFFFF' : theme.text }
                      ]}>
                        {offset === 0 ? 'Hôm nay' : formatDateShort(date)}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Duration */}
            <View style={styles.generateSection}>
              <ThemedText style={[styles.generateLabel, { color: theme.textSecondary }]}>
                Số ngày
              </ThemedText>
              <View style={styles.durationRow}>
                {[3, 5, 7, 14].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.durationBtn,
                      { 
                        backgroundColor: generateDays === days ? theme.accent : theme.bg,
                        borderColor: generateDays === days ? theme.accent : theme.cardBorder
                      }
                    ]}
                    onPress={() => setGenerateDays(days)}
                  >
                    <ThemedText style={[
                      styles.durationText,
                      { color: generateDays === days ? '#FFFFFF' : theme.text }
                    ]}>
                      {days} ngày
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Region Selection */}
            <View style={styles.generateSection}>
              <ThemedText style={[styles.generateLabel, { color: theme.textSecondary }]}>
                Khẩu vị vùng miền
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
                {[
                  { id: 'vietnam-north', label: 'Miền Bắc', icon: '🌾' },
                  { id: 'vietnam-central', label: 'Miền Trung', icon: '🌶️' },
                  { id: 'vietnam-south', label: 'Miền Nam', icon: '🥥' },
                  { id: 'asia', label: 'Châu Á', icon: '🍜' },
                  { id: 'europe', label: 'Châu Âu', icon: '🍝' },
                  { id: 'america', label: 'Châu Mỹ', icon: '🌮' },
                  { id: 'mixed', label: 'Đa dạng', icon: '🌍' },
                ].map((region) => (
                  <TouchableOpacity
                    key={region.id}
                    style={[
                      styles.regionBtn,
                      { 
                        backgroundColor: selectedRegion === region.id ? theme.accent : theme.bg,
                        borderColor: selectedRegion === region.id ? theme.accent : theme.cardBorder
                      }
                    ]}
                    onPress={() => setSelectedRegion(region.id)}
                  >
                    <ThemedText style={styles.regionIcon}>{region.icon}</ThemedText>
                    <ThemedText style={[
                      styles.regionText,
                      { color: selectedRegion === region.id ? '#FFFFFF' : theme.text }
                    ]}>
                      {region.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Actions */}
            <View style={styles.generateActions}>
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: theme.bg }]}
                onPress={() => setShowGenerateModal(false)}
              >
                <ThemedText style={[styles.generateBtnText, { color: theme.textSecondary }]}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateBtn, styles.generateBtnPrimary]}
                onPress={handleGenerateWeekPlan}
              >
                <LinearGradient colors={['#FF6B35', '#FF8F5A']} style={styles.generateBtnGradient}>
                  <Ionicons name="construct" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.generateBtnTextWhite}>Tạo lịch</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
    ...Platform.select({
      android: {
        minHeight: 50,
      },
    }),
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 26 : 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        lineHeight: 32,
      },
    }),
  },
  headerSubtitle: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        lineHeight: 18,
      },
    }),
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  aiCardGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardIcon: {},
  aiCardContent: {
    flex: 1,
    marginLeft: 16,
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiCardDesc: {
    fontSize: 13,
  },
  dateSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  dateScrollContent: {
    gap: 10,
  },
  dateCard: {
    width: 60,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dateCardSelected: {
    borderWidth: 0,
  },
  dateDay: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  mealBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookedDateBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedDateHeader: {
    marginBottom: 16,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  mealCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    ...Platform.select({
      android: {
        minHeight: 20,
      },
    }),
  },
  mealCardLabel: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
        lineHeight: 16,
      },
    }),
  },
  mealCardTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    marginLeft: 8,
  },
  mealCardTime: {
    fontSize: 11,
  },
  mealCardName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  mealCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealCardEmptyText: {
    fontSize: 14,
  },
  mealCardIngredients: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mealCardIngredientsText: {
    fontSize: 11,
    flex: 1,
  },
  mealCardNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  mealCardNoteText: {
    fontSize: 10,
    flex: 1,
    fontStyle: 'italic',
  },
  cookedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markCookedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 6 : 5,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
    ...Platform.select({
      android: {
        minHeight: 32,
      },
    }),
  },
  markCookedBtnText: {
    fontSize: Platform.OS === 'ios' ? 12 : 13,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    ...Platform.select({
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  instructionsInput: {
    minHeight: Platform.OS === 'android' ? 80 : 90,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'android' ? 10 : 12,
  },
  statsCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flexGrow: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Platform.OS === 'android' ? 16 : 20,
  },
  pillsScroll: {
    marginBottom: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    gap: 6,
  },
  pillText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  timeSection: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    marginBottom: Platform.OS === 'android' ? 8 : 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  timeQuickSelect: {
    marginBottom: 12,
  },
  timeQuickSelectContent: {
    gap: 8,
  },
  timeChip: {
    paddingVertical: Platform.OS === 'android' ? 6 : 8,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeChipText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  customTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  customTimeInput: {
    flex: 1,
    borderRadius: 10,
    padding: Platform.OS === 'android' ? 10 : 12,
    fontSize: Platform.OS === 'android' ? 14 : 15,
    borderWidth: 1,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  modalInput: {
    borderRadius: 12,
    padding: Platform.OS === 'android' ? 12 : 14,
    fontSize: Platform.OS === 'android' ? 14 : 15,
    borderWidth: 1,
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalBtnPrimary: {},
  modalBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  modalBtnText: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: Platform.OS === 'android' ? 14 : 16,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  modalBtnTextWhite: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  generateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  generateModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
  },
  generateHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  generateIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  generateTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  generateDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  generateSection: {
    marginBottom: 20,
  },
  generateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  generateDateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
  },
  generateDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  regionScroll: {
    marginTop: 8,
  },
  regionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  regionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  regionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  generateBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateBtnPrimary: {},
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 16,
  },
  generateBtnTextWhite: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 14,
  },
  detailCloseBtn: {
    padding: 4,
  },
  detailContent: {
    padding: 20,
    maxHeight: 400,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailRowIcon: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailRowContent: {
    flex: 1,
  },
  detailRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailRowValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailActionBtnPrimary: {
    backgroundColor: '#E63946',
  },
  detailActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailActionTextWhite: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notesInput: {
    minHeight: Platform.OS === 'android' ? 60 : 70,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'android' ? 10 : 12,
  },
});
