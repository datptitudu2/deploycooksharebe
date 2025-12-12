import express from 'express';
import { Challenge } from '../models/Challenge.js';
import { Achievement } from '../models/Achievement.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadChallengeProof } from '../middleware/upload.js';
import { uploadFile, getFileUrlFromStorage } from '../utils/storage.js';

const router = express.Router();

/**
 * GET /challenges/today - Lấy challenge hôm nay
 */
router.get('/today', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    
    if (userId) {
      // User đã đăng nhập - lấy cả progress
      const result = await Challenge.getUserChallengeProgress(userId);
      
      // Tính thời gian còn lại
      const now = new Date();
      const expiresAt = new Date(result.challenge.expiresAt);
      const timeRemaining = Math.max(0, expiresAt - now);
      
      res.json({
        success: true,
        data: {
          ...result.challenge,
          userProgress: result.userProgress,
          timeRemaining, // milliseconds
          timeRemainingFormatted: formatTimeRemaining(timeRemaining),
        }
      });
    } else {
      // Guest - chỉ lấy challenge info
      const challenge = await Challenge.getTodayChallenge();
      
      const now = new Date();
      const expiresAt = new Date(challenge.expiresAt);
      const timeRemaining = Math.max(0, expiresAt - now);
      
      res.json({
        success: true,
        data: {
          ...challenge,
          timeRemaining,
          timeRemainingFormatted: formatTimeRemaining(timeRemaining),
        }
      });
    }
  } catch (error) {
    console.error('Error getting today challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thử thách hôm nay'
    });
  }
});

/**
 * POST /challenges/join - Tham gia challenge (protected)
 */
router.post('/join', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    const result = await Challenge.joinChallenge(userId);
    
    if (result.alreadyJoined) {
      return res.json({
        success: true,
        message: 'Bạn đã tham gia thử thách này rồi',
        data: result.userChallenge
      });
    }
    
    res.json({
      success: true,
      message: 'Đã tham gia thử thách!',
      data: result.userChallenge
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tham gia thử thách'
    });
  }
});

/**
 * POST /challenges/complete - Hoàn thành challenge (protected)
 */
router.post('/complete', authenticate, uploadChallengeProof.single('proofImage'), async (req, res) => {
  try {
    console.log('=== Starting challenge completion ===');
    console.log('User object:', req.user);
    console.log('User ID:', req.user?.userId || req.user?._id);
    console.log('Recipe ID:', req.body?.recipeId);
    console.log('Has file:', !!req.file);
    
    // Lấy userId từ req.user (có thể là userId hoặc _id)
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      console.error('No user ID found in req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    
    const { recipeId } = req.body;
    let proofImageUrl = null;
    
    // Upload proof image nếu có
    if (req.file) {
      try {
        console.log('Uploading proof image...');
        const uploadResult = await uploadFile(req.file, 'challenge-proof');
        proofImageUrl = uploadResult.storage === 'cloud' 
          ? uploadResult.url 
          : getFileUrlFromStorage(req, uploadResult.filename, 'challenge-proof', uploadResult.storage);
        console.log('Proof image uploaded:', proofImageUrl);
      } catch (uploadError) {
        console.error('Error uploading proof image:', uploadError);
        console.error('Upload error stack:', uploadError.stack);
        // Không fail request nếu chỉ lỗi upload ảnh
      }
    }
    
    console.log('Calling Challenge.completeChallenge...');
    const result = await Challenge.completeChallenge(userId, recipeId, proofImageUrl);
    console.log('Challenge.completeChallenge result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.log('Challenge completion returned error:', result.error);
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    if (!result.pointsEarned && result.pointsEarned !== 0) {
      console.error('Invalid result from completeChallenge:', result);
      return res.status(500).json({
        success: false,
        message: 'Kết quả không hợp lệ từ server'
      });
    }
    
    // Cộng points cho user thông qua achievement service
    try {
      console.log('Adding points:', result.pointsEarned);
      const achievementResult = await Achievement.addPoints(userId, result.pointsEarned);
      console.log('Achievement result:', JSON.stringify(achievementResult, null, 2));
      result.leveledUp = achievementResult.leveledUp;
      result.newLevel = achievementResult.level;
      result.newPoints = achievementResult.points;
      result.reward = achievementResult.reward;
    } catch (error) {
      console.error('Error adding points:', error);
      console.error('Add points error stack:', error.stack);
      // Không fail request nếu chỉ lỗi cộng điểm
    }
    
    console.log('Sending success response');
    
    // Serialize challenge object để tránh lỗi circular reference
    let challengeData = null;
    if (result.challenge) {
      try {
        challengeData = {
          _id: result.challenge._id?.toString(),
          title: result.challenge.title,
          description: result.challenge.description,
          points: result.challenge.points,
          date: result.challenge.date,
          icon: result.challenge.icon,
          color: result.challenge.color,
          participantCount: result.challenge.participantCount,
          completedCount: result.challenge.completedCount,
        };
      } catch (serializeError) {
        console.error('Error serializing challenge:', serializeError);
        challengeData = { _id: result.challenge._id?.toString() };
      }
    }
    
    res.json({
      success: true,
      message: `Chúc mừng! Bạn đã hoàn thành thử thách và nhận được ${result.pointsEarned} điểm!`,
      data: {
        pointsEarned: result.pointsEarned,
        challenge: challengeData,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
        newPoints: result.newPoints,
        reward: result.reward,
        proofImageUrl
      }
    });
  } catch (error) {
    console.error('Error completing challenge:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi hoàn thành thử thách'
    });
  }
});

/**
 * GET /challenges/history - Lịch sử challenge của user (protected)
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    const limit = parseInt(req.query.limit) || 10;
    const history = await Challenge.getUserChallengeHistory(userId, limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting challenge history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử thử thách'
    });
  }
});

/**
 * GET /challenges/stats - Thống kê challenge của user (protected)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    const stats = await Challenge.getUserChallengeStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting challenge stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê thử thách'
    });
  }
});

/**
 * GET /challenges/completions/:date - Lấy danh sách người đã hoàn thành challenge theo ngày
 */
router.get('/completions/:date', optionalAuth, async (req, res) => {
  try {
    const { date } = req.params;
    console.log('Getting completions for date:', date);
    
    const completions = await Challenge.getChallengeCompletions(date);
    
    // Format avatar URLs và proof image URLs
    const formattedCompletions = completions.map(completion => {
      const formatted = {
        userId: completion.userId,
        userName: completion.userName || 'Người dùng',
        userAvatar: null,
        completedAt: completion.completedAt,
        proofImageUrl: completion.proofImageUrl || null,
      };
      
      // Format avatar URL nếu có
      if (completion.userAvatar) {
        const storage = completion.userStorage || 'local';
        formatted.userAvatar = getFileUrlFromStorage(req, completion.userAvatar, 'avatar', storage);
      }
      
      // Format proof image URL nếu có (nếu là local storage)
      if (completion.proofImageUrl && !completion.proofImageUrl.startsWith('http')) {
        // Nếu là local file, format URL
        formatted.proofImageUrl = getFileUrlFromStorage(req, completion.proofImageUrl, 'challenge-proof', 'local');
      }
      
      return formatted;
    });
    
    console.log('Returning completions:', formattedCompletions.length);
    
    res.json({
      success: true,
      data: formattedCompletions
    });
  } catch (error) {
    console.error('Error getting challenge completions:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách người hoàn thành'
    });
  }
});

// Helper function to format time remaining
function formatTimeRemaining(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}p còn lại`;
  }
  return `${minutes} phút còn lại`;
}

export default router;

