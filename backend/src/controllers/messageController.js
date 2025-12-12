import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { getFileUrlFromStorage, getStorageMode } from '../utils/storage.js';

/**
 * Gửi message mới
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { receiverId, content, type = 'text', voiceDuration, replyTo } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    // For voice and image messages, content can be empty
    if (!receiverId || (!content || !content.trim()) && type !== 'voice' && type !== 'image') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung message',
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người nhận',
      });
    }

    // Get sender info
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người gửi',
      });
    }

    // CHAT RULE: Chỉ cho phép User → Chef chat
    // Chef có thể chat với Chef hoặc User
    // User chỉ có thể chat với Chef
    if (sender.role === 'user' && receiver.role !== 'chef') {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể nhắn tin với đầu bếp (Chef)',
      });
    }

    // Upload image nếu có
    let imageUrl = null;
    if (req.files && req.files.image && req.files.image[0] && type === 'image') {
      const { uploadFile } = await import('../utils/storage.js');
      const uploadResult = await uploadFile(req.files.image[0], 'message-image');
      imageUrl = getFileUrlFromStorage(req, uploadResult.filename, 'message-image', uploadResult.storage);
    }

    // Upload voice nếu có
    let voiceUrl = null;
    if (req.files && req.files.voice && req.files.voice[0] && type === 'voice') {
      const { uploadFile } = await import('../utils/storage.js');
      const uploadResult = await uploadFile(req.files.voice[0], 'message-voice');
      // For Cloudinary, use the secure_url directly and add format transformation
      // For local, construct URL from filename
      if (uploadResult.storage === 'cloud' && uploadResult.url) {
        // Add format transformation to secure_url if not present
        let cloudUrl = uploadResult.url;
        if (cloudUrl.includes('cloudinary.com')) {
          // For audio files, convert raw to video with format transformation
          // Video resource type has better format conversion support
          if (cloudUrl.includes('/raw/upload/') && !cloudUrl.includes('f_m4a')) {
            // Convert raw to video with format transformation
            cloudUrl = cloudUrl.replace('/raw/upload/', '/video/upload/f_m4a,q_auto/');
          } else if (cloudUrl.includes('/raw/upload') && !cloudUrl.includes('f_m4a')) {
            cloudUrl = cloudUrl.replace('/raw/upload', '/video/upload/f_m4a,q_auto');
          } else if (cloudUrl.includes('/video/upload/') && !cloudUrl.includes('f_m4a')) {
            cloudUrl = cloudUrl.replace('/video/upload/', '/video/upload/f_m4a,q_auto/');
          } else if (cloudUrl.includes('/video/upload') && !cloudUrl.includes('f_m4a')) {
            cloudUrl = cloudUrl.replace('/video/upload', '/video/upload/f_m4a,q_auto');
          }
        }
        voiceUrl = cloudUrl;
      } else {
        voiceUrl = getFileUrlFromStorage(req, uploadResult.filename, 'message-voice', uploadResult.storage);
      }
      console.log('🎤 Voice uploaded:', { filename: uploadResult.filename, storage: uploadResult.storage, url: voiceUrl });
    }

    // Validate replyTo if provided
    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo);
      if (!replyToMessage) {
        return res.status(404).json({
          success: false,
          message: 'Tin nhắn được trả lời không tồn tại',
        });
      }
      // Verify replyTo message is in the same conversation
      const replySenderId = replyToMessage.senderId?.toString ? replyToMessage.senderId.toString() : String(replyToMessage.senderId);
      const replyReceiverId = replyToMessage.receiverId?.toString ? replyToMessage.receiverId.toString() : String(replyToMessage.receiverId);
      if (replySenderId !== userId && replyReceiverId !== userId && replySenderId !== receiverId && replyReceiverId !== receiverId) {
        return res.status(403).json({
          success: false,
          message: 'Không thể trả lời tin nhắn này',
        });
      }
    }

    const newMessage = await Message.create({
      senderId: userId,
      receiverId,
      content: content || (type === 'image' ? 'Image' : (type === 'voice' ? 'Voice message' : '')),
      type,
      imageUrl,
      voiceUrl,
      voiceDuration: voiceDuration ? parseFloat(voiceDuration) : null,
      replyTo: replyTo || null,
    });

    // Get sender avatar (sender đã được lấy ở trên)
    const senderAvatar = sender?.avatar
      ? getFileUrlFromStorage(req, sender.avatar, 'avatar', sender.storage || 'local')
      : null;

    const receiverAvatar = receiver?.avatar
      ? getFileUrlFromStorage(req, receiver.avatar, 'avatar', receiver.storage || 'local')
      : null;

    // Get final voice URL - use the processed voiceUrl if available, otherwise process newMessage.voiceUrl
    let finalVoiceUrl = null;
    if (voiceUrl) {
      // voiceUrl đã được xử lý từ uploadResult với storage mode đúng
      finalVoiceUrl = voiceUrl;
    } else if (newMessage.voiceUrl) {
      // Nếu có voiceUrl trong message (từ database), cần convert từ filename sang URL
      const storageMode = getStorageMode();
      finalVoiceUrl = getFileUrlFromStorage(req, newMessage.voiceUrl, 'message-voice', storageMode);
    }

    res.json({
      success: true,
      data: {
        ...newMessage,
        _id: newMessage._id.toString(),
        senderId: newMessage.senderId.toString(),
        receiverId: newMessage.receiverId.toString(),
        voiceUrl: finalVoiceUrl,
        sender: {
          id: sender?._id?.toString() || userId,
          name: sender?.name || 'User',
          avatar: senderAvatar,
        },
        receiver: {
          id: receiver?._id?.toString() || receiverId,
          name: receiver?.name || 'User',
          avatar: receiverAvatar,
        },
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi gửi message',
    });
  }
};

/**
 * Lấy conversation giữa 2 users
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { partnerId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const messages = await Message.getConversation(userId, partnerId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    // Get user info for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const sender = await User.findById(msg.senderId.toString());
        const senderAvatar = sender?.avatar
          ? getFileUrlFromStorage(req, sender.avatar, 'avatar', sender.storage || 'local')
          : null;

        // Get voice URL if exists
        // Try to detect storage mode from the voiceUrl
        let msgVoiceUrl = null;
        if (msg.voiceUrl) {
          // If voiceUrl is already a full URL, use it directly
          if (msg.voiceUrl.startsWith('http://') || msg.voiceUrl.startsWith('https://')) {
            msgVoiceUrl = msg.voiceUrl;
          } else {
            // Try to get from storage - check if it's cloud or local
            const storageMode = getStorageMode();
            msgVoiceUrl = getFileUrlFromStorage(req, msg.voiceUrl, 'message-voice', storageMode);
          }
        }

        // Get replyTo message if exists
        let replyToMessage = null;
        if (msg.replyTo) {
          try {
            const replyMsg = await Message.findById(msg.replyTo.toString());
            if (replyMsg) {
              const replySender = await User.findById(replyMsg.senderId.toString());
              const replySenderAvatar = replySender?.avatar
                ? getFileUrlFromStorage(req, replySender.avatar, 'avatar', replySender.storage || 'local')
                : null;
              
              // Get image/voice URL for reply preview
              let replyImageUrl = null;
              let replyVoiceUrl = null;
              
              if (replyMsg.imageUrl) {
                // Check if imageUrl is already a full URL (from previous messages) or just a filename
                if (replyMsg.imageUrl.startsWith('http://') || replyMsg.imageUrl.startsWith('https://')) {
                  // Already a full URL
                  replyImageUrl = replyMsg.imageUrl;
                } else {
                  // Need to construct URL - use current storage mode
                  const storageMode = getStorageMode();
                  replyImageUrl = getFileUrlFromStorage(req, replyMsg.imageUrl, 'message-image', storageMode);
                }
              }
              
              if (replyMsg.voiceUrl) {
                // Check if voiceUrl is already a full URL
                if (replyMsg.voiceUrl.startsWith('http://') || replyMsg.voiceUrl.startsWith('https://')) {
                  replyVoiceUrl = replyMsg.voiceUrl;
                } else {
                  // Use current storage mode
                  const storageMode = getStorageMode();
                  replyVoiceUrl = getFileUrlFromStorage(req, replyMsg.voiceUrl, 'message-voice', storageMode);
                }
              }
              
              replyToMessage = {
                _id: replyMsg._id.toString(),
                content: replyMsg.content,
                type: replyMsg.type,
                imageUrl: replyImageUrl,
                voiceUrl: replyVoiceUrl,
                sender: {
                  id: replySender?._id?.toString() || replyMsg.senderId.toString(),
                  name: replySender?.name || 'User',
                  avatar: replySenderAvatar,
                },
              };
            }
          } catch (error) {
            console.error('Error loading replyTo message:', error);
          }
        }

        // Get reactions with user info
        const reactionsWithUsers = [];
        if (msg.reactions && Array.isArray(msg.reactions)) {
          for (const reaction of msg.reactions) {
            const reactionUserId = reaction.userId?.toString ? reaction.userId.toString() : String(reaction.userId);
            const reactionUser = await User.findById(reactionUserId);
            reactionsWithUsers.push({
              userId: reactionUserId,
              emoji: reaction.emoji,
              userName: reactionUser?.name || 'User',
            });
          }
        }

        return {
          ...msg,
          _id: msg._id.toString(),
          senderId: msg.senderId.toString(),
          receiverId: msg.receiverId.toString(),
          voiceUrl: msgVoiceUrl,
          replyTo: msg.replyTo ? msg.replyTo.toString() : null,
          replyToMessage,
          reactions: reactionsWithUsers,
          sender: {
            id: sender?._id?.toString() || msg.senderId.toString(),
            name: sender?.name || 'User',
            avatar: senderAvatar,
          },
        };
      })
    );

    // Mark messages as read
    await Message.markAsRead(partnerId, userId);

    res.json({
      success: true,
      data: messagesWithUsers,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy conversation',
    });
  }
};

/**
 * Lấy danh sách conversations
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const conversations = await Message.getConversations(userId);

    // Get current user info
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Get partner info for each conversation
    const conversationsWithUsers = await Promise.all(
      conversations.map(async (conv) => {
        const partner = await User.findById(conv.partnerId);
        if (!partner) return null;

        // FILTER: User chỉ thấy conversations với Chef
        // Chef thấy tất cả conversations
        if (currentUser.role === 'user' && partner.role !== 'chef') {
          return null; // Skip this conversation
        }

        const partnerAvatar = partner?.avatar
          ? getFileUrlFromStorage(req, partner.avatar, 'avatar', partner.storage || 'local')
          : null;

        const lastMessage = conv.lastMessage
          ? {
              ...conv.lastMessage,
              _id: conv.lastMessage._id.toString(),
              senderId: conv.lastMessage.senderId.toString(),
              receiverId: conv.lastMessage.receiverId.toString(),
            }
          : null;

        return {
          partnerId: conv.partnerId,
          partner: {
            id: partner?._id?.toString() || conv.partnerId,
            name: partner?.name || 'User',
            avatar: partnerAvatar,
            role: partner.role || 'user',
            lastSeen: partner?.lastSeen || partner?.updatedAt || partner?.createdAt,
          },
          lastMessage,
          unreadCount: conv.unreadCount,
          updatedAt: lastMessage?.createdAt || new Date(),
        };
      })
    );

    // Filter out null values
    const filteredConversations = conversationsWithUsers.filter((conv) => conv !== null);

    // Sort by updatedAt (most recent first)
    filteredConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      data: filteredConversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy conversations',
    });
  }
};

/**
 * Đếm số unread messages
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const count = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đếm unread messages',
    });
  }
};

/**
 * Xóa tin nhắn (thu hồi)
 */
export const toggleReaction = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn cảm xúc' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });
    }

    const { connectToDatabase } = await import('../config/database.js');
    const { ObjectId } = await import('mongodb');
    const { db } = await connectToDatabase();
    const userIdObj = new ObjectId(userId);

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions?.findIndex(
      (r) => r.userId.toString() === userId && r.emoji === emoji
    ) ?? -1;

    if (existingReactionIndex >= 0) {
      // Remove reaction
      const updatedReactions = message.reactions.filter(
        (r, index) => index !== existingReactionIndex
      );
      await db.collection('messages').updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { reactions: updatedReactions, updatedAt: new Date() } }
      );
      res.json({ success: true, message: 'Đã gỡ cảm xúc', action: 'removed' });
    } else {
      // Add reaction
      const updatedReactions = [...(message.reactions || []), { userId: userIdObj, emoji }];
      await db.collection('messages').updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { reactions: updatedReactions, updatedAt: new Date() } }
      );
      res.json({ success: true, message: 'Đã thêm cảm xúc', action: 'added' });
    }
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi thêm cảm xúc' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp message ID',
      });
    }

    // Delete message from database
    const { message, deletedCount } = await Message.delete(messageId, userId);

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn hoặc không có quyền xóa',
      });
    }

    // Delete media files from storage if exists
    try {
      const storageMode = getStorageMode();

      // Delete image if exists
      if (message.imageUrl && message.type === 'image') {
        if (storageMode === 'cloud') {
          // Extract public_id from Cloudinary URL
          const urlMatch = message.imageUrl.match(/\/upload\/(?:[^/]+\/)?(.+)$/);
          if (urlMatch && urlMatch[1]) {
            let publicId = urlMatch[1];
            // Remove extension
            publicId = publicId.replace(/\.[^.]+$/, '');
            try {
              const { deleteFromCloudinary } = await import('../config/cloudinary.js');
              await deleteFromCloudinary(publicId);
              console.log('✅ Deleted image from Cloudinary:', publicId);
            } catch (error) {
              console.warn('⚠️ Failed to delete image from Cloudinary:', error);
            }
          }
        } else {
          // Local storage - delete file
          const { fileURLToPath } = await import('url');
          const { dirname, join } = await import('path');
          const fs = await import('fs');
          
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          
          // Extract filename from URL
          const filename = message.imageUrl.split('/').pop();
          if (filename) {
            const filePath = join(__dirname, '../../uploads/message-images', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log('✅ Deleted image from local storage:', filename);
            }
          }
        }
      }

      // Delete voice if exists
      if (message.voiceUrl && message.type === 'voice') {
        if (storageMode === 'cloud') {
          // Extract public_id from Cloudinary URL
          const urlMatch = message.voiceUrl.match(/\/upload\/(?:[^/]+\/)?(.+)$/);
          if (urlMatch && urlMatch[1]) {
            let publicId = urlMatch[1];
            // Remove format transformation if exists (f_m4a,q_auto/)
            publicId = publicId.replace(/^f_[^/]+,q_[^/]+\//, '');
            // Remove extension
            publicId = publicId.replace(/\.[^.]+$/, '');
            try {
              const { deleteFromCloudinary } = await import('../config/cloudinary.js');
              await deleteFromCloudinary(publicId);
              console.log('✅ Deleted voice from Cloudinary:', publicId);
            } catch (error) {
              console.warn('⚠️ Failed to delete voice from Cloudinary:', error);
            }
          }
        } else {
          // Local storage - delete file
          const { fileURLToPath } = await import('url');
          const { dirname, join } = await import('path');
          const fs = await import('fs');
          
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          
          // Extract filename from URL
          const filename = message.voiceUrl.split('/').pop();
          if (filename) {
            const filePath = join(__dirname, '../../uploads/message-voices', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log('✅ Deleted voice from local storage:', filename);
            }
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting media files:', storageError);
      // Continue even if file deletion fails - message is already deleted from DB
    }

    res.json({
      success: true,
      message: 'Đã thu hồi tin nhắn',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi xóa tin nhắn',
    });
  }
};

/**
 * Xóa toàn bộ cuộc trò chuyện
 */
export const deleteConversation = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { partnerId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp partner ID',
      });
    }

    // Delete all messages in the conversation
    const { deletedCount } = await Message.deleteConversation(userId, partnerId);

    res.json({
      success: true,
      message: 'Đã xóa cuộc trò chuyện',
      deletedCount,
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi xóa cuộc trò chuyện',
    });
  }
};

