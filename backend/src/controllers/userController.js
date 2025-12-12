import { User } from '../models/User.js';
import { uploadFile, getFileUrlFromStorage, deleteFile } from '../utils/storage.js';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../config/database.js';

/**
 * Lấy thông tin user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    // User.findById already handles ObjectId conversion
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user. Vui lòng đăng nhập lại.',
      });
    }

    // Lấy storage mode từ user data (nếu có) hoặc auto-detect
    const storage = user.storage || 'local';
    const avatarUrl = user.avatar ? getFileUrlFromStorage(req, user.avatar, 'avatar', storage) : null;
    const bannerUrl = user.banner ? getFileUrlFromStorage(req, user.banner, 'banner', storage) : null;

    // Get follower/following counts
    const followersCount = await User.getFollowersCount(userId);
    const followingCount = await User.getFollowingCount(userId);

    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: avatarUrl,
        banner: bannerUrl,
        bio: user.bio || '',
        phone: user.phone || '',
        gender: user.gender || '',
        role: user.role || 'user',
        createdAt: user.createdAt,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin profile',
    });
  }
};

/**
 * Lấy thông tin user theo ID
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp userId',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    const storage = user.storage || 'local';
    const avatarUrl = user.avatar ? getFileUrlFromStorage(req, user.avatar, 'avatar', storage) : null;
    const bannerUrl = user.banner ? getFileUrlFromStorage(req, user.banner, 'banner', storage) : null;

    // Get stats
    const { Recipe } = await import('../models/Recipe.js');
    const recipesCount = await Recipe.findByUserId(userId, { limit: 1000 });
    const followersCount = await User.getFollowersCount(userId);
    const followingCount = await User.getFollowingCount(userId);
    
    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      isFollowing = await User.isFollowing(currentUserId, userId);
    }

    res.json({
      success: true,
      data: {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: avatarUrl,
        banner: bannerUrl,
        bio: user.bio || '',
        phone: user.phone || '',
        gender: user.gender || '',
        role: user.role || 'user',
        createdAt: user.createdAt,
        lastSeen: user.lastSeen || user.updatedAt || user.createdAt,
        // Stats
        recipesCount: recipesCount.length,
        followersCount,
        followingCount,
        isFollowing,
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin user',
    });
  }
};

/**
 * Lấy danh sách tất cả chefs
 */
export const getAllChefs = async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { limit = 50 } = req.query;

    // Lấy tất cả users có role = 'chef'
    const chefs = await db
      .collection('users')
      .find({ role: 'chef' })
      .limit(parseInt(limit))
      .toArray();

    // Format response với avatar URLs
    const chefsWithAvatars = chefs.map((chef) => {
      const storage = chef.storage || 'local';
      const avatarUrl = chef.avatar
        ? getFileUrlFromStorage(req, chef.avatar, 'avatar', storage)
        : null;

      return {
        _id: chef._id.toString(),
        name: chef.name,
        email: chef.email,
        avatar: avatarUrl,
        bio: chef.bio || '',
        role: chef.role || 'chef',
        lastSeen: chef.lastSeen || chef.updatedAt || chef.createdAt,
      };
    });

    res.json({
      success: true,
      data: chefsWithAvatars,
    });
  } catch (error) {
    console.error('Get all chefs error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách chefs',
    });
  }
};

/**
 * Lấy danh sách tất cả users (cho chef)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { limit = 50 } = req.query;

    // Lấy tất cả users có role = 'user'
    const users = await db
      .collection('users')
      .find({ role: 'user' })
      .limit(parseInt(limit))
      .toArray();

    // Format response với avatar URLs
    const usersWithAvatars = users.map((user) => {
      const storage = user.storage || 'local';
      const avatarUrl = user.avatar
        ? getFileUrlFromStorage(req, user.avatar, 'avatar', storage)
        : null;

      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: avatarUrl,
        bio: user.bio || '',
        role: user.role || 'user',
        lastSeen: user.lastSeen || user.updatedAt || user.createdAt,
      };
    });

    res.json({
      success: true,
      data: usersWithAvatars,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách users',
    });
  }
};

/**
 * Cập nhật thông tin user
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { name, bio, phone, gender, role } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (role !== undefined) {
      // Validate role
      if (role !== 'chef' && role !== 'user') {
        return res.status(400).json({
          success: false,
          message: 'Role không hợp lệ. Chọn "chef" hoặc "user"',
        });
      }
      updateData.role = role;
    }

    // User.update already handles ObjectId conversion
    const result = await User.update(userId, updateData);
    if (!result || result.matchedCount === 0) {
      console.error('User not found for update:', userId);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user. Vui lòng đăng nhập lại.',
      });
    }

    // Lấy lại user data sau khi update
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      console.error('User not found after update:', userId);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user. Vui lòng đăng nhập lại.',
      });
    }

    // Lấy avatar URL
    const storage = updatedUser.storage || 'local';
    const avatarUrl = updatedUser.avatar ? getFileUrlFromStorage(req, updatedUser.avatar, 'avatar', storage) : null;

    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: avatarUrl,
        bio: updatedUser.bio || '',
        phone: updatedUser.phone || '',
        gender: updatedUser.gender || '',
        role: updatedUser.role || 'user',
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật profile',
    });
  }
};

/**
 * Follow/Unfollow user
 */
export const toggleFollow = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    const { userId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp userId',
      });
    }

    if (currentUserId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể follow chính mình',
      });
    }

    const result = await User.toggleFollow(currentUserId, userId);

    // Tạo notification cho follow (chỉ khi follow, không phải unfollow)
    if (result.following) {
      const currentUser = await User.findById(currentUserId);
      if (currentUser) {
        const { createFollowNotification } = await import('../utils/notificationHelper.js');
        let userAvatarUrl = '';
        if (currentUser.avatar) {
          userAvatarUrl = getFileUrlFromStorage(req, currentUser.avatar, 'avatar', currentUser.storage || 'local');
        }
        
        await createFollowNotification(
          userId, // Người được follow
          currentUserId, // Người follow
          currentUser.name,
          userAvatarUrl
        );
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi follow/unfollow user',
    });
  }
};

/**
 * Get followers list
 */
export const getFollowers = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { limit = 100 } = req.query;
    const followers = await User.getFollowers(userId, parseInt(limit));

    // Format response with avatar URLs
    const followersWithAvatars = await Promise.all(
      followers.map(async (user) => {
        const storage = user.storage || 'local';
        const avatarUrl = user.avatar
          ? getFileUrlFromStorage(req, user.avatar, 'avatar', storage)
          : null;

        return {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: avatarUrl,
          bio: user.bio || '',
          role: user.role || 'user',
        };
      })
    );

    res.json({
      success: true,
      data: followersWithAvatars,
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách followers',
    });
  }
};

/**
 * Cập nhật lastSeen (gọi khi user online/hoạt động)
 */
export const updateLastSeen = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    // Update lastSeen to current time
    await User.update(userId, { lastSeen: new Date() });

    res.json({
      success: true,
      message: 'Đã cập nhật lastSeen',
    });
  } catch (error) {
    console.error('Update lastSeen error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật lastSeen',
    });
  }
};

/**
 * Get following list
 */
export const getFollowing = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { limit = 100 } = req.query;
    const following = await User.getFollowing(userId, parseInt(limit));

    // Format response with avatar URLs
    const followingWithAvatars = await Promise.all(
      following.map(async (user) => {
        const storage = user.storage || 'local';
        const avatarUrl = user.avatar
          ? getFileUrlFromStorage(req, user.avatar, 'avatar', storage)
          : null;

        return {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: avatarUrl,
          bio: user.bio || '',
          role: user.role || 'user',
        };
      })
    );

    res.json({
      success: true,
      data: followingWithAvatars,
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách following',
    });
  }
};

/**
 * Upload avatar
 */
export const uploadUserAvatar = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh',
      });
    }

    // Get current user to check existing avatar
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Delete old avatar if exists
    if (currentUser.avatar) {
      try {
        await deleteFile(currentUser.avatar, 'avatar', currentUser.storage || 'local');
      } catch (deleteError) {
        console.error('Error deleting old avatar:', deleteError);
        // Continue even if delete fails
      }
    }

    // Upload new avatar
    const uploadResult = await uploadFile(req.file, 'avatar');
    const storage = uploadResult.storage || 'local';

    // Update user with new avatar filename
    await User.update(userId, { avatar: uploadResult.filename, storage });

    // Get updated user
    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user sau khi upload',
      });
    }

    // Get avatar URL
    const avatarUrl = getFileUrlFromStorage(req, uploadResult.filename, 'avatar', storage);

    res.json({
      success: true,
      message: 'Upload avatar thành công',
      avatarUrl,
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: avatarUrl,
        bio: updatedUser.bio || '',
        phone: updatedUser.phone || '',
        gender: updatedUser.gender || '',
        role: updatedUser.role || 'user',
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi upload avatar',
    });
  }
};

/**
 * Đổi mật khẩu
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    // Lấy thông tin user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await User.update(userId, { password: hashedNewPassword });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi mật khẩu',
    });
  }
};

