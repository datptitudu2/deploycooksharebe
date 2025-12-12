/**
 * Chatbot Service
 * API calls for AI chatbot operations
 */

import api, { ApiResponse } from './api';

// Types
export interface VideoInfo {
  title: string;
  videoId: string;
  thumbnail: string;
  url: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  videoInfo?: VideoInfo;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  mealName?: string;
  videoInfo?: VideoInfo;
  modelInfo?: {
    model: string;
    isFineTuned: boolean;
  };
}

export interface SendMessageRequest {
  message: string;
  dietMode?: string;
  conversationHistory?: { role: string; content: string }[];
}

export interface SendImageMessageRequest extends SendMessageRequest {
  image: string; // base64
}

// API Functions
const chatbotService = {
  /**
   * Send text message to chatbot
   */
  async sendMessage(request: SendMessageRequest): Promise<ApiResponse<ChatResponse>> {
    const response = await api.post('/chatbot/message', request);
    return response.data;
  },

  /**
   * Send message with image to chatbot
   */
  async sendMessageWithImage(request: SendImageMessageRequest): Promise<ApiResponse<ChatResponse>> {
    const response = await api.post('/chatbot/message-with-image', request);
    return response.data;
  },

  /**
   * Get conversation history
   */
  async getHistory(): Promise<ApiResponse<ChatMessage[]>> {
    const response = await api.get('/chatbot/history');
    return response.data;
  },

  /**
   * Clear conversation history
   */
  async clearHistory(): Promise<ApiResponse<null>> {
    const response = await api.delete('/chatbot/history');
    return response.data;
  },

  /**
   * Get suggested prompts
   */
  getSuggestedPrompts(): string[] {
    return [
      'Gợi ý món ăn cho bữa tối hôm nay',
      'Công thức làm phở bò',
      'Món ăn healthy cho người giảm cân',
      'Thực đơn 1 tuần cho gia đình',
      'Món ăn nhanh dưới 30 phút',
      'Món chay ngon dễ làm',
      'Món ăn cho trẻ em biếng ăn',
      'Công thức bánh ngọt đơn giản',
    ];
  },

  /**
   * Get diet modes
   */
  getDietModes(): { id: string; name: string; icon: string; description: string }[] {
    return [
      { id: 'normal', name: 'Bình thường', icon: 'restaurant', description: 'Không kiêng khem' },
      { id: 'lowcarb', name: 'Low Carb', icon: 'leaf', description: 'Ít tinh bột' },
      { id: 'keto', name: 'Keto', icon: 'flame', description: 'Ăn keto' },
      { id: 'vegetarian', name: 'Chay', icon: 'nutrition', description: 'Ăn chay' },
      { id: 'vegan', name: 'Thuần chay', icon: 'flower', description: 'Không sản phẩm động vật' },
      { id: 'diabetes', name: 'Tiểu đường', icon: 'medical', description: 'Kiểm soát đường' },
      { id: 'highprotein', name: 'Tăng cơ', icon: 'fitness', description: 'Giàu protein' },
    ];
  },
};

export default chatbotService;

