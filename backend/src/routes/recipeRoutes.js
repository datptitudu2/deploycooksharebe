import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadMealImage as uploadMealImageMiddleware } from '../middleware/upload.js';
import {
  uploadMealImage,
  deleteMealImage,
} from '../controllers/recipeController.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authenticate);

// POST /api/recipes/meal-image - Upload ảnh món ăn
router.post('/meal-image', uploadMealImageMiddleware.single('image'), uploadMealImage);

// DELETE /api/recipes/meal-image - Xóa ảnh món ăn
router.delete('/meal-image', deleteMealImage);

export default router;

