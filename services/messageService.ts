import api, { ApiResponse } from './api';

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'voice';
  imageUrl?: string | null;
  voiceUrl?: string | null;
  voiceDuration?: number | null;
  replyTo?: string | null;
  replyToMessage?: {
    _id: string;
    content: string;
    type: 'text' | 'image' | 'voice';
    imageUrl?: string | null;
    voiceUrl?: string | null;
    sender: {
      id: string;
      name: string;
      avatar?: string | null;
    };
  } | null;
  reactions?: Array<{
    userId: string;
    emoji: string;
    userName: string;
  }>;
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  receiver?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export interface Conversation {
  partnerId: string;
  partner: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

const messageService = {
  /**
   * Gửi message
   */
  async sendMessage(
    receiverId: string,
    content: string,
    type: 'text' | 'image' | 'voice' = 'text',
    imageUri?: string | null,
    voiceUri?: string | null,
    voiceDuration?: number,
    replyTo?: string | null
  ): Promise<ApiResponse<Message>> {
    const formData = new FormData();
    formData.append('receiverId', receiverId);
    formData.append('content', content);
    formData.append('type', type);
    if (replyTo) {
      formData.append('replyTo', replyTo);
    }

    if (imageUri && type === 'image') {
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: fileType,
      } as any);
    }

    if (voiceUri && type === 'voice') {
      const filename = voiceUri.split('/').pop() || 'voice.m4a';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `audio/${match[1]}` : 'audio/m4a';

      formData.append('voice', {
        uri: voiceUri,
        name: filename,
        type: fileType,
      } as any);
      
      if (voiceDuration) {
        formData.append('voiceDuration', voiceDuration.toString());
      }
    }

    const response = await api.post('/messages/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Lấy conversation giữa 2 users
   */
  async getConversation(
    partnerId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<ApiResponse<Message[]>> {
    const response = await api.get(`/messages/conversation/${partnerId}`, {
      params: { limit, skip },
    });

    return response.data;
  },

  /**
   * Lấy danh sách conversations
   */
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  /**
   * Đếm số unread messages
   */
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    const response = await api.get('/messages/unread-count');
    return response.data;
  },

  /**
   * Thêm/xóa cảm xúc
   */
  async toggleReaction(messageId: string, emoji: string): Promise<ApiResponse<any>> {
    const response = await api.put(`/messages/${messageId}/reaction`, { emoji });
    return response.data;
  },

  /**
   * Xóa tin nhắn (thu hồi)
   */
  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  /**
   * Xóa toàn bộ cuộc trò chuyện
   */
  async deleteConversation(partnerId: string): Promise<ApiResponse<{ deletedCount: number }>> {
    const response = await api.delete(`/messages/conversation/${partnerId}`);
    return response.data;
  },
};

export default messageService;

