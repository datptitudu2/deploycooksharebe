import express from 'express';
import {
  generateWeekPlan,
  addMeal,
  updateMeal,
  getWeekPlan,
  startCookingTimer,
} from '../controllers/mealPlanningController.js';
import { authenticate } from '../middleware/auth.js';
import { MealPlan } from '../models/MealPlan.js';

const router = express.Router();

router.use(authenticate);

router.post('/generate-week', generateWeekPlan);
router.post('/add', addMeal);
router.put('/update', updateMeal);
router.get('/week', getWeekPlan);
router.post('/start-timer', startCookingTimer);
router.delete('/delete', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { date, mealType } = req.body;

    console.log('Delete request:', { userId, date, mealType, user: req.user });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    if (!date || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    const result = await MealPlan.delete(userId, date, mealType);
    
    console.log('Delete result:', result);

    // Even if not modified, still return success (field might not exist)
    res.json({
      success: true,
      message: 'Đã xóa món ăn',
    });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi xóa món ăn',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;

