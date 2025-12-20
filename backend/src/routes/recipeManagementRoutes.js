/**
 * Recipe Management Routes
 * API cho quản lý công thức nấu ăn
 */

import express from 'express';
import {
  createRecipe,
  getRecipes,
  getMyRecipes,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  rateRecipe,
  searchRecipes,
  getTrendingRecipes,
  getNewestRecipes,
  getRecipesByCategory,
  toggleLikeRecipe,
  toggleSaveRecipe,
  getSavedRecipes,
  getCategories,
  getFeaturedChefs,
  getRecipeComments,
  addComment,
  updateComment,
  deleteComment,
  addReply,
  updateReply,
  deleteReply,
  getStats,
} from '../controllers/recipeManagementController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadMealImage, uploadCommentImage, uploadVideo, uploadRecipeMedia } from '../middleware/upload.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (không cần đăng nhập)
// ============================================

// Feed & Discovery
router.get('/', getRecipes);                      // GET /recipes - Danh sách công thức
router.get('/trending', getTrendingRecipes);      // GET /recipes/trending - Hot recipes
router.get('/newest', getNewestRecipes);          // GET /recipes/newest - Mới nhất
router.get('/search', searchRecipes);             // GET /recipes/search?q=keyword
router.get('/categories', getCategories);         // GET /recipes/categories - Danh mục
router.get('/featured-chefs', getFeaturedChefs);  // GET /recipes/featured-chefs
router.get('/stats', getStats);                    // GET /recipes/stats - Thống kê tổng quan
router.get('/category/:category', getRecipesByCategory); // GET /recipes/category/:category

// ============================================
// PROTECTED ROUTES (cần đăng nhập)
// ============================================
// User's recipes - Phải đặt TRƯỚC route /:recipeId để không bị match nhầm
router.get('/my/recipes', authenticate, getMyRecipes); // GET /recipe-management/my/recipes
router.get('/saved', authenticate, getSavedRecipes);   // GET /recipe-management/saved

// Apply authenticate middleware cho tất cả routes còn lại
router.use(authenticate);

// CRUD
// Support both single image (backward compatible) and multiple images + videos
router.post('/', uploadRecipeMedia.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
  { name: 'videos', maxCount: 5 } // Max 5 videos, 100MB each
]), createRecipe); // POST /recipes - Tạo mới (với ảnh và video)
router.put('/:recipeId', uploadRecipeMedia.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
  { name: 'videos', maxCount: 5 } // Max 5 videos, 100MB each
]), updateRecipe);           // PUT /recipes/:id - Cập nhật
router.delete('/:recipeId', deleteRecipe);        // DELETE /recipes/:id - Xóa

// Recipe detail (optional auth để check liked/saved) - Phải đặt TRƯỚC các routes khác
router.get('/:recipeId', optionalAuth, getRecipeById); // GET /recipes/:id

// Comments (public get, protected post/put/delete) - Phải đặt TRƯỚC /:recipeId/like để không match nhầm
router.get('/:recipeId/comments', optionalAuth, getRecipeComments); // GET /recipes/:id/comments

// Apply authenticate middleware cho các routes cần auth
router.use(authenticate);

// Interactions (cần auth)
router.post('/:recipeId/like', toggleLikeRecipe); // POST /recipes/:id/like
router.post('/:recipeId/save', toggleSaveRecipe); // POST /recipes/:id/save
router.post('/:recipeId/rate', rateRecipe);       // POST /recipes/:id/rate
router.post('/:recipeId/comments', uploadCommentImage.single('image'), addComment); // POST /recipes/:id/comments
router.put('/:recipeId/comments/:commentId', updateComment); // PUT /recipes/:id/comments/:commentId
router.delete('/:recipeId/comments/:commentId', deleteComment); // DELETE /recipes/:id/comments/:commentId

// Reply routes (only author can reply)
router.post('/:recipeId/comments/:commentId/replies', uploadCommentImage.single('image'), addReply); // POST /recipes/:id/comments/:commentId/replies
router.put('/:recipeId/comments/:commentId/replies/:replyId', uploadCommentImage.single('image'), updateReply); // PUT /recipes/:id/comments/:commentId/replies/:replyId
router.delete('/:recipeId/comments/:commentId/replies/:replyId', deleteReply); // DELETE /recipes/:id/comments/:commentId/replies/:replyId

export default router;
