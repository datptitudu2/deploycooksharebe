/**
 * Achievement Routes
 * API cho thành tích/chuỗi của user
 */

import express from 'express';
import {
  getAchievements,
  getBadges,
  updateStreak,
  getStats,
  markMealAsCooked,
  getLeaderboard,
} from '../controllers/achievementController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Tất cả routes cần authentication
router.use(authenticate);

router.get('/', getAchievements); // Lấy thành tích
router.get('/badges', getBadges); // Lấy danh sách badges
router.post('/streak', updateStreak); // Update streak
router.get('/stats', getStats); // Thống kê tổng quan
router.post('/mark-meal-cooked', markMealAsCooked); // Đánh dấu món đã nấu
router.get('/leaderboard', getLeaderboard); // Bảng xếp hạng

export default router;

