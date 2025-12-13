import React, { useState, useRef, useEffect, ErrorInfo } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { MessageText } from '@/components/chatbot/MessageText';
import { AddToCalendarButton } from '@/components/meal-planning/AddToCalendarButton';
import { DietModeSelector, DietMode } from '@/components/chatbot/DietModeSelector';
import { YouTubePlayer } from '@/components/chatbot/YouTubePlayer';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { API_URL } from '@/config/api';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import chatbotService, { ChatMessage } from '@/services/chatbotService';
import { alertService } from '@/services/alertService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  mealName?: string; // Tên món ăn để thêm vào lịch
  imageUri?: string; // URI của ảnh nếu có
  videoInfo?: {
    videoId: string;
    title: string;
    thumbnail?: string;
    url: string;
  }; // Thông tin video YouTube
  modelInfo?: {
    model: string;
    isFineTuned: boolean;
    type: string;
  };
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChatbotScreen Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ThemedText style={{ fontSize: 16, textAlign: 'center' }}>
            Đã xảy ra lỗi. Vui lòng thử lại sau.
          </ThemedText>
        </View>
      );
    }
    return this.props.children;
  }
}

function ChatbotScreenContent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là AI tư vấn món ăn của CookShare. Tôi có thể giúp bạn tìm món ăn phù hợp, tư vấn theo thời tiết, cảm xúc và cung cấp video hướng dẫn nấu ăn. Bạn muốn ăn gì hôm nay?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dietMode, setDietMode] = useState<DietMode>('none');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAddToCalendarModal, setShowAddToCalendarModal] = useState(false);
  const [selectedMealName, setSelectedMealName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const scrollViewRef = useRef<ScrollView>(null);
  const historyScrollRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Safe auth access - useAuth will throw if not in provider, but that's expected
  const auth = useAuth();
  const token = auth?.token || null;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load history khi mở màn hình
  useEffect(() => {
    try {
      if (token) {
        loadHistory();
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, [token]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const loadHistory = async () => {
    if (!token) return;
    
    try {
      setLoadingHistory(true);
      const response = await chatbotService.getHistory();
      if (response.success && response.data) {
        setChatHistory(response.data);
      }
    } catch (error) {
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowHistory = async () => {
    setShowHistoryModal(true);
    await loadHistory();
  };

  const handleClearHistory = async () => {
    alertService.confirm(
      'Bạn có muốn xóa toàn bộ lịch sử chat?',
      'Xóa lịch sử chat',
      async () => {
        try {
          if (!token) {
            alertService.warning('Vui lòng đăng nhập để xóa lịch sử');
            return;
          }
          await chatbotService.clearHistory();
          setChatHistory([]);
          setMessages([{
            id: '1',
            text: 'Xin chào! Tôi là AI tư vấn món ăn của CookShare. Tôi có thể giúp bạn tìm món ăn phù hợp, tư vấn theo thời tiết, cảm xúc và cung cấp video hướng dẫn nấu ăn. Bạn muốn ăn gì hôm nay?',
            isUser: false,
            timestamp: new Date(),
          }]);
          alertService.success('Đã xóa lịch sử chat');
        } catch (error) {
          alertService.error('Không thể xóa lịch sử chat');
        }
      }
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertService.warning('Vui lòng cho phép truy cập thư viện ảnh', 'Cần quyền truy cập');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
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
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim() || (selectedImage ? 'Nhận diện nguyên liệu trong ảnh này' : ''),
      isUser: true,
      timestamp: new Date(),
      imageUri: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      let response;
      
      // Add diet mode to message if selected
      const fullMessage = dietMode !== 'none' 
        ? `${messageText || 'Nhận diện nguyên liệu trong ảnh này'} (Chế độ ăn: ${getDietModeLabel(dietMode)})`
        : messageText || 'Nhận diện nguyên liệu trong ảnh này';

      if (selectedImage) {
        // Send with image using FormData
        const formData = new FormData();
        formData.append('message', fullMessage);
        formData.append('dietMode', dietMode);
        
        const filename = selectedImage.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('image', {
          uri: Platform.OS === 'android' ? selectedImage : selectedImage.replace('file://', ''),
          name: filename,
          type,
        } as any);

        response = await axios.post(
          `${API_URL}/chatbot/message`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
          }
        );
      } else {
        // Send text only
        response = await axios.post(
          `${API_URL}/chatbot/message`,
          {
            message: fullMessage,
            dietMode: dietMode,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
          }
        );
      }

      // Extract meal name from response if available
      const mealNameMatch = response.data.response.match(/\*\*([^*]+)\*\*/);
      const mealName = mealNameMatch ? mealNameMatch[1] : undefined;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
        mealName: mealName || response.data.mealName,
        videoInfo: response.data.videoInfo || undefined,
        modelInfo: response.data.modelInfo,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, tôi gặp sự cố. Vui lòng thử lại sau!',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCalendar = (mealName: string) => {
    if (!token) {
      alertService.warning('Vui lòng đăng nhập để thêm món ăn vào lịch');
      return;
    }

    // Mở modal để chọn ngày và bữa ăn
    setSelectedMealName(mealName);
    const today = new Date();
    setSelectedDate(today);
    
    // Tự động chọn mealType dựa trên thời gian hiện tại
    const currentHour = today.getHours();
    if (currentHour >= 5 && currentHour < 10) {
      setSelectedMealType('breakfast');
    } else if (currentHour >= 10 && currentHour < 14) {
      setSelectedMealType('lunch');
    } else if (currentHour >= 14 && currentHour < 17) {
      setSelectedMealType('snack');
    } else {
      setSelectedMealType('dinner');
    }
    
    setShowAddToCalendarModal(true);
  };

  const handleQuickAdd = async () => {
    if (!token) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const response = await axios.post(
        `${API_URL}/meal-planning/add`,
        {
          date: dateStr,
          mealType: selectedMealType,
          mealName: selectedMealName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const mealTypeLabels = {
          breakfast: 'bữa sáng',
          lunch: 'bữa trưa',
          dinner: 'bữa tối',
          snack: 'bữa xế',
        };
        const dateLabel = selectedDate.toDateString() === new Date().toDateString() 
          ? 'hôm nay' 
          : selectedDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
          ? 'ngày mai'
          : `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`;
        
        alertService.show({
          title: 'Thành công',
          message: `Đã thêm "${selectedMealName}" vào ${mealTypeLabels[selectedMealType]} ${dateLabel}!`,
          buttons: [
            {
              text: 'Xem lịch',
              onPress: () => {
                setShowAddToCalendarModal(false);
                router.push('/(tabs)/meal-planning');
              },
              style: 'default',
            },
            { text: 'OK', style: 'default', onPress: () => setShowAddToCalendarModal(false) },
          ],
        });
      }
    } catch (error: any) {
      alertService.error(error.response?.data?.message || 'Không thể thêm món ăn vào lịch');
    }
  };

  const handleNavigateToMealPlanning = () => {
    setShowAddToCalendarModal(false);
    router.push({
      pathname: '/(tabs)/meal-planning',
      params: { 
        mealName: selectedMealName,
        date: selectedDate.toISOString().split('T')[0],
        mealType: selectedMealType,
      },
    });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Hôm nay';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return 'Ngày mai';
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getDietModeLabel = (mode: DietMode): string => {
    const labels: Record<DietMode, string> = {
      'none': 'Bình thường',
      'weight-loss': 'Giảm cân',
      'weight-gain': 'Tăng cân',
      'muscle-gain': 'Tăng cơ',
      'healthy': 'Khỏe mạnh',
      'vegetarian': 'Chay',
      'low-carb': 'Ít tinh bột',
      'keto': 'Keto',
    };
    return labels[mode];
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedView style={styles.headerTitleContainer}>
            <MaterialIcons name="smart-toy" size={28} color={colors.primary} />
            <ThemedText type="title" style={styles.headerTitle}>
              AI Tư vấn Món ăn
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.headerActions}>
            {(() => {
              const lastBotMessage = [...messages].reverse().find(m => !m.isUser && m.modelInfo);
              if (lastBotMessage?.modelInfo) {
                return (
                  <ThemedView style={[styles.modelBadge, { backgroundColor: lastBotMessage.modelInfo.isFineTuned ? colors.secondary : '#FFB84D' }]}>
                    <MaterialIcons 
                      name={lastBotMessage.modelInfo.isFineTuned ? "verified" : "info"} 
                      size={12} 
                      color="#FFFFFF" 
                    />
                    <ThemedText style={styles.modelBadgeText}>
                      {lastBotMessage.modelInfo.isFineTuned ? 'Đã train' : 'API'}
                    </ThemedText>
                  </ThemedView>
                );
              }
              return null;
            })()}
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleShowHistory}
            >
              <MaterialIcons name="history" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleClearHistory}
            >
              <MaterialIcons name="delete-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <DietModeSelector 
          selectedMode={dietMode} 
          onSelectMode={setDietMode} 
        />

        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
                ]}
              >
                <ThemedView
                  style={[
                    styles.messageBubble,
                    (message.imageUri && !message.text) && styles.imageOnlyBubble,
                    message.isUser
                      ? [styles.userBubble, { backgroundColor: colors.primary }]
                      : [styles.botBubble, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F0F0F0' }],
                  ]}
                >
                  {message.imageUri && (
                    <View style={[styles.imageContainer, { marginBottom: message.text && message.text.trim() ? 12 : 0 }]}>
                      <Image 
                        source={{ uri: message.imageUri }} 
                        style={styles.messageImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                    </View>
                  )}
                  {message.text && message.text.trim() && (
                    <View style={styles.messageTextContainer}>
                      <MessageText text={message.text} isUser={message.isUser} />
                    </View>
                  )}
                  {!message.isUser && message.videoInfo && (
                    <YouTubePlayer
                      videoId={message.videoInfo.videoId}
                      title={message.videoInfo.title}
                      thumbnail={message.videoInfo.thumbnail}
                      url={message.videoInfo.url}
                    />
                  )}
                  {!message.isUser && message.mealName && (
                    <AddToCalendarButton
                      mealName={message.mealName}
                      onPress={() => handleAddToCalendar(message.mealName!)}
                    />
                  )}
                </ThemedView>
              </View>
            ))}
            {isLoading && (
              <View style={styles.botMessageWrapper}>
                <ThemedView style={[styles.messageBubble, styles.botBubble, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F0F0F0' }]}>
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <ThemedText style={[styles.loadingText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000', marginLeft: 8 }]}>
                      Đang suy nghĩ...
                    </ThemedText>
                  </View>
                </ThemedView>
              </View>
            )}
          </ScrollView>

          <ThemedView style={[styles.inputContainer, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF' }]}>
            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <MaterialIcons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              {!isInputFocused && (
                <>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
                    onPress={handlePickImage}
                  >
                    <MaterialIcons name="photo-library" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
                    onPress={handleTakePhoto}
                  >
                    <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5',
                    flex: 1, // Luôn flex: 1 để chiếm hết không gian còn lại
                  },
                ]}
                placeholder="Nhập câu hỏi hoặc chụp ảnh nguyên liệu..."
                placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#999999'}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                onPress={handleSend}
                disabled={isLoading || (!inputText.trim() && !selectedImage)}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </ThemedView>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.historyModal, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF' }]}>
            <View style={styles.historyModalHeader}>
              <ThemedText style={[styles.historyModalTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                Lịch sử chat
              </ThemedText>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <MaterialIcons name="close" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            {loadingHistory ? (
              <View style={styles.historyLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText style={[styles.historyLoadingText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                  Đang tải lịch sử...
                </ThemedText>
              </View>
            ) : chatHistory.length === 0 ? (
              <View style={styles.historyEmptyContainer}>
                <MaterialIcons name="history" size={64} color={colorScheme === 'dark' ? '#666666' : '#CCCCCC'} />
                <ThemedText style={[styles.historyEmptyText, { color: colorScheme === 'dark' ? '#999999' : '#666666' }]}>
                  Chưa có lịch sử chat
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                ref={historyScrollRef}
                style={styles.historyContent}
                contentContainerStyle={styles.historyContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {chatHistory.map((msg, index) => (
                  <View
                    key={index}
                    style={[
                      styles.historyMessageWrapper,
                      msg.role === 'user' ? styles.historyUserMessageWrapper : styles.historyBotMessageWrapper,
                    ]}
                  >
                    <ThemedView
                      style={[
                        styles.historyMessageBubble,
                        msg.role === 'user'
                          ? [styles.historyUserBubble, { backgroundColor: colors.primary }]
                          : [styles.historyBotBubble, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F0F0F0' }],
                      ]}
                    >
                      {msg.image && (
                        <View style={styles.historyImageContainer}>
                          <Image 
                            source={{ uri: msg.image }} 
                            style={styles.historyMessageImage}
                            contentFit="cover"
                            transition={200}
                          />
                        </View>
                      )}
                      {msg.content && (
                        <ThemedText
                          style={[
                            styles.historyMessageText,
                            { color: msg.role === 'user' ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000') },
                          ]}
                        >
                          {msg.content}
                        </ThemedText>
                      )}
                      {msg.videoInfo && (
                        <YouTubePlayer
                          videoId={msg.videoInfo.videoId}
                          title={msg.videoInfo.title}
                          thumbnail={msg.videoInfo.thumbnail}
                          url={msg.videoInfo.url}
                        />
                      )}
                    </ThemedView>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add to Calendar Modal */}
      <Modal
        visible={showAddToCalendarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddToCalendarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.addCalendarModal, { backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF' }]}>
            <View style={styles.addCalendarHeader}>
              <ThemedText style={[styles.addCalendarTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                Thêm vào lịch
              </ThemedText>
              <TouchableOpacity onPress={() => setShowAddToCalendarModal(false)}>
                <MaterialIcons name="close" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>

            <View style={styles.addCalendarContent}>
              <ThemedText style={[styles.addCalendarMealName, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                {selectedMealName}
              </ThemedText>

              {/* Date Selection */}
              <View style={styles.dateSelectionContainer}>
                <ThemedText style={[styles.addCalendarLabel, { color: colorScheme === 'dark' ? '#999999' : '#666666' }]}>
                  Chọn ngày
                </ThemedText>
                <View style={styles.dateSelector}>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
                    onPress={() => changeDate(-1)}
                  >
                    <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={[styles.dateDisplay, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}>
                    <ThemedText style={[styles.dateText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
                      {formatDate(selectedDate)}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
                    onPress={() => changeDate(1)}
                  >
                    <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Meal Type Selection */}
              <View style={styles.mealTypeContainer}>
                <ThemedText style={[styles.addCalendarLabel, { color: colorScheme === 'dark' ? '#999999' : '#666666' }]}>
                  Chọn bữa ăn
                </ThemedText>
                <View style={styles.mealTypeButtons}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                    const labels = {
                      breakfast: 'Sáng',
                      lunch: 'Trưa',
                      dinner: 'Tối',
                      snack: 'Xế',
                    };
                    const isSelected = selectedMealType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.mealTypeButton,
                          isSelected && { backgroundColor: colors.primary },
                          !isSelected && { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' },
                        ]}
                        onPress={() => setSelectedMealType(type)}
                      >
                        <ThemedText
                          style={[
                            styles.mealTypeButtonText,
                            { color: isSelected ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000') },
                          ]}
                        >
                          {labels[type]}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.addCalendarActions}>
                <TouchableOpacity
                  style={[styles.addCalendarActionButton, styles.secondaryButton, { borderColor: colors.primary }]}
                  onPress={handleNavigateToMealPlanning}
                >
                  <MaterialIcons name="calendar-month" size={20} color={colors.primary} />
                  <ThemedText style={[styles.addCalendarActionText, { color: colors.primary }]}>
                    Xem lịch
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addCalendarActionButton, { backgroundColor: colors.primary }]}
                  onPress={handleQuickAdd}
                >
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.addCalendarActionTextPrimary}>
                    Thêm ngay
                  </ThemedText>
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative',
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modelBadge: {
    position: 'absolute',
    top: -4,
    right: -60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  modelBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Platform.OS === 'android' ? 16 : 14,
    borderRadius: 18,
    overflow: 'hidden',
  },
  imageOnlyBubble: {
    padding: 0,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignSelf: 'stretch',
  },
  messageImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  messageTextContainer: {
    marginBottom: Platform.OS === 'android' ? 6 : 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    alignSelf: 'stretch',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    minHeight: 36,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  historyModal: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  historyLoadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  historyEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  historyEmptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyContentContainer: {
    padding: 16,
  },
  historyMessageWrapper: {
    marginBottom: 12,
  },
  historyUserMessageWrapper: {
    alignItems: 'flex-end',
  },
  historyBotMessageWrapper: {
    alignItems: 'flex-start',
  },
  historyMessageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  historyUserBubble: {
    backgroundColor: '#FF6B35',
  },
  historyBotBubble: {
    backgroundColor: '#F0F0F0',
  },
  historyMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  historyImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyMessageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  addCalendarModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  addCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  addCalendarTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  addCalendarContent: {
    padding: 20,
  },
  addCalendarMealName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  dateSelectionContainer: {
    marginBottom: 24,
  },
  addCalendarLabel: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealTypeContainer: {
    marginBottom: 24,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mealTypeButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTypeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  addCalendarActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  addCalendarActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  addCalendarActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addCalendarActionTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function ChatbotScreen() {
  return (
    <ErrorBoundary>
      <ChatbotScreenContent />
    </ErrorBoundary>
  );
}

