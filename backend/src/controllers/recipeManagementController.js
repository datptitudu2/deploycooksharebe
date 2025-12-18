/**
 * Recipe Management Controller
 * Quản lý công thức nấu ăn (CRUD + Rating)
 */

import { Recipe } from '../models/Recipe.js';
import { Achievement } from '../models/Achievement.js';
import { User } from '../models/User.js';
import { HTTP_STATUS, MESSAGES } from '../constants/index.js';
import { uploadFile, getFileUrlFromStorage } from '../utils/storage.js';
import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

/**
 * Tạo công thức mới
 */
export const createRecipe = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    // Parse form data
    const recipeData = {
      name: req.body.name,
      description: req.body.description || '',
      ingredients: req.body.ingredients ? JSON.parse(req.body.ingredients) : [],
      instructions: req.body.instructions ? JSON.parse(req.body.instructions) : [],
      category: req.body.category || 'other',
      cuisine: req.body.cuisine || 'vietnamese',
      prepTime: parseInt(req.body.prepTime) || 0,
      cookTime: parseInt(req.body.cookTime) || 0,
      servings: parseInt(req.body.servings) || 1,
      difficulty: req.body.difficulty || 'Dễ',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    };

    if (!recipeData.name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập tên món ăn',
      });
    }

    // Upload images if provided (support multiple images)
    const imageUrls = [];
    
    // Handle multiple images (new way - from 'images' field)
    if (req.files && req.files.images && req.files.images.length > 0) {
      console.log(`📤 Uploading ${req.files.images.length} recipe images...`);
      for (const file of req.files.images) {
        const uploadResult = await uploadFile(file, 'meal-image');
        const imageUrl = uploadResult.storage === 'cloud' 
          ? uploadResult.url 
          : getFileUrlFromStorage(req, uploadResult.filename, 'meal-image', uploadResult.storage);
        imageUrls.push(imageUrl);
      }
      recipeData.images = imageUrls;
      recipeData.image = imageUrls[0] || ''; // First image as main (backward compatible)
    } 
    // Handle single image from 'image' field (backward compatible)
    else if (req.files && req.files.image && req.files.image.length > 0) {
      const file = req.files.image[0];
      console.log('📤 Uploading recipe image...');
      const uploadResult = await uploadFile(file, 'meal-image');
      const imageUrl = uploadResult.storage === 'cloud' 
        ? uploadResult.url 
        : getFileUrlFromStorage(req, uploadResult.filename, 'meal-image', uploadResult.storage);
      recipeData.image = imageUrl;
      recipeData.images = [imageUrl]; // Convert to array
    }
    // Handle old way (req.file - single file)
    else if (req.file) {
      console.log('📤 Uploading recipe image (legacy)...');
      const uploadResult = await uploadFile(req.file, 'meal-image');
      const imageUrl = uploadResult.storage === 'cloud' 
        ? uploadResult.url 
        : getFileUrlFromStorage(req, uploadResult.filename, 'meal-image', uploadResult.storage);
      recipeData.image = imageUrl;
      recipeData.images = [imageUrl]; // Convert to array
    }

    // Handle videos - upload local videos và combine với URLs
    const videoUrls = [];
    
    // Upload local videos (from files)
    if (req.files && req.files.videos && req.files.videos.length > 0) {
      console.log(`📹 Uploading ${req.files.videos.length} videos...`);
      for (const file of req.files.videos) {
        // Check file size (warn if > 100MB)
        if (file.size > 100 * 1024 * 1024) {
          console.warn(`⚠️ Video ${file.originalname} lớn hơn 100MB - có thể tốn phí trên Cloudinary!`);
        }
        
        const uploadResult = await uploadFile(file, 'video');
        let videoUrl;
        if (uploadResult.storage === 'cloud') {
          videoUrl = uploadResult.url;
          console.log('✅ Video uploaded to Cloudinary:', videoUrl);
        } else {
          videoUrl = getFileUrlFromStorage(req, uploadResult.filename, 'video', uploadResult.storage);
          console.log('✅ Video saved locally:', videoUrl);
        }
        
        // Validate URL - must be HTTP/HTTPS
        if (!videoUrl || (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://'))) {
          console.error('❌ Invalid video URL:', videoUrl);
          throw new Error(`Không thể tạo URL video hợp lệ cho file: ${file.originalname}`);
        }
        
        videoUrls.push({ url: videoUrl, title: file.originalname });
      }
    }
    
    // Add URL videos (from JSON string)
    if (req.body.videos) {
      try {
        const urlVideos = typeof req.body.videos === 'string' 
          ? JSON.parse(req.body.videos) 
          : req.body.videos;
        if (Array.isArray(urlVideos) && urlVideos.length > 0) {
          videoUrls.push(...urlVideos);
        }
      } catch (error) {
        console.error('Error parsing video URLs:', error);
      }
    }
    
    if (videoUrls.length > 0) {
      recipeData.videos = videoUrls;
      console.log(`✅ Total videos: ${videoUrls.length}`);
    }

    // Get user info for author
    const { User } = await import('../models/User.js');
    const user = await User.findById(userId);
    if (user) {
      recipeData.authorName = user.name;
      recipeData.authorAvatar = user.avatar ? getFileUrlFromStorage(req, user.avatar, 'avatar', user.storage || 'local') : '';
    }

    // Lấy achievements trước khi cộng điểm để check level up
    const achievementsBefore = await Achievement.get(userId);
    const oldLevel = achievementsBefore.level || 1;
    
    // Tạo recipe
    const recipe = await Recipe.create(userId, recipeData);

    // Cập nhật achievements với recipeData để tính điểm động
    const result = await Achievement.incrementRecipeCreated(userId, recipeData);
    const pointsEarned = result?.points || 20;
    
    // Cập nhật streak khi đăng công thức (hoạt động nấu ăn)
    await Achievement.updateStreak(userId);
    
    // Lấy achievements sau khi cộng điểm để check level up
    const achievementsAfter = await Achievement.get(userId);
    const newLevel = achievementsAfter.level || 1;
    const leveledUp = newLevel > oldLevel;
    
    // Tính reward nếu level up
    let reward = null;
    if (leveledUp) {
      const levelRewards = {
        2: { points: 20, badge: null },
        3: { points: 30, badge: null },
        5: { points: 50, badge: 'rising_star' },
        10: { points: 100, badge: 'master_chef' },
        20: { points: 200, badge: 'legend' },
      };
      reward = levelRewards[newLevel] || { points: newLevel * 10, badge: null };
    }

    // Tạo notifications cho followers khi đăng recipe mới
    const { createNewRecipeNotifications } = await import('../utils/notificationHelper.js');
    const recipeImage = recipe.images?.[0] || recipe.image || '';
    await createNewRecipeNotifications(
      userId,
      recipeData.authorName || user?.name || 'Chef',
      recipeData.authorAvatar || '',
      recipe._id.toString(),
      recipe.name,
      recipeImage
    );

    // Lấy streak sau khi update
    const streakInfo = await Achievement.get(userId);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Tạo công thức thành công',
      data: recipe,
      leveledUp: leveledUp,
      reward: reward,
      newLevel: newLevel,
      points: achievementsAfter.points,
      pointsEarned: pointsEarned,
      streak: {
        currentStreak: streakInfo.currentStreak || 0,
        longestStreak: streakInfo.longestStreak || 0,
      },
    });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy danh sách công thức (feed)
 */
export const getRecipes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      category,
      mealType,
      authorId,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = sortOrder === 'desc' ? -1 : 1;

    const recipes = await Recipe.findPublic({
      limit: parseInt(limit),
      skip,
      sortBy,
      sortOrder: sort,
      category,
      mealType,
      authorId,
    });

    res.json({
      success: true,
      data: recipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: recipes.length, // TODO: Get total count from DB
        totalPages: Math.ceil(recipes.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy công thức của user (my recipes)
 */
export const getMyRecipes = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const recipes = await Recipe.findByUserId(userId);

    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('Get my recipes error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy chi tiết công thức
 */
export const getRecipeById = async (req, res) => {
  try {
    const { recipeId } = req.params;

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức',
      });
    }

    // Tăng view count
    await Recipe.incrementView(recipeId);

    // Format authorAvatar URL
    if (recipe.authorAvatar) {
      const { getFileUrlFromStorage } = await import('../utils/storage.js');
      recipe.authorAvatar = getFileUrlFromStorage(req, recipe.authorAvatar, 'avatar', 'local');
    }

    // Lấy rating của user (nếu có đăng nhập)
    let userRating = null;
    if (req.user?.userId) {
      userRating = await Recipe.getUserRating(recipeId, req.user.userId);
    }

    res.json({
      success: true,
      data: recipe, // Changed to 'data' for consistency with frontend
      recipe, // Keep for backward compatibility
      userRating,
    });
  } catch (error) {
    console.error('Get recipe by id error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Cập nhật công thức
 */
export const updateRecipe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId } = req.params;

    console.log('📝 Update recipe request:', {
      recipeId,
      userId,
      bodyKeys: Object.keys(req.body),
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
    });

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    // Parse form data
    const updateData = {};
    
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    
    if (req.body.ingredients !== undefined) {
      try {
        updateData.ingredients = typeof req.body.ingredients === 'string' 
          ? JSON.parse(req.body.ingredients) 
          : req.body.ingredients;
      } catch (error) {
        console.error('Error parsing ingredients:', error);
        updateData.ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : [];
      }
    }
    
    if (req.body.instructions !== undefined) {
      try {
        updateData.instructions = typeof req.body.instructions === 'string' 
          ? JSON.parse(req.body.instructions) 
          : req.body.instructions;
      } catch (error) {
        console.error('Error parsing instructions:', error);
        updateData.instructions = Array.isArray(req.body.instructions) ? req.body.instructions : [];
      }
    }
    
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.cuisine !== undefined) updateData.cuisine = req.body.cuisine;
    if (req.body.prepTime !== undefined && req.body.prepTime !== '') updateData.prepTime = parseInt(req.body.prepTime) || 0;
    if (req.body.cookTime !== undefined && req.body.cookTime !== '') updateData.cookTime = parseInt(req.body.cookTime) || 0;
    if (req.body.servings !== undefined && req.body.servings !== '') updateData.servings = parseInt(req.body.servings) || 1;
    if (req.body.difficulty !== undefined) updateData.difficulty = req.body.difficulty;
    
    if (req.body.tags !== undefined) {
      try {
        updateData.tags = typeof req.body.tags === 'string' 
          ? JSON.parse(req.body.tags) 
          : req.body.tags;
      } catch (error) {
        console.error('Error parsing tags:', error);
        updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : [];
      }
    }

    console.log('📝 Parsed updateData:', Object.keys(updateData));

    // Upload images if provided (support multiple images)
    const imageUrls = [];
    
    // Handle multiple images (new way - from 'images' field)
    if (req.files && req.files.images && req.files.images.length > 0) {
      console.log(`📤 Uploading ${req.files.images.length} recipe images...`);
      for (const file of req.files.images) {
        const uploadResult = await uploadFile(file, 'meal-image');
        const imageUrl = uploadResult.storage === 'cloud' 
          ? uploadResult.url 
          : getFileUrlFromStorage(req, uploadResult.filename, 'meal-image', uploadResult.storage);
        imageUrls.push(imageUrl);
      }
      updateData.images = imageUrls;
      updateData.image = imageUrls[0] || ''; // First image as main (backward compatible)
    } 
    // Handle single image from 'image' field (backward compatible)
    else if (req.files && req.files.image && req.files.image.length > 0) {
      const file = req.files.image[0];
      console.log('📤 Uploading recipe image...');
      const uploadResult = await uploadFile(file, 'meal-image');
      const imageUrl = uploadResult.storage === 'cloud' 
        ? uploadResult.url 
        : getFileUrlFromStorage(req, uploadResult.filename, 'meal-image', uploadResult.storage);
      updateData.image = imageUrl;
      updateData.images = [imageUrl]; // Convert to array
    }
    // Handle old way (req.file - single file)
    else if (req.file) {
      console.log('📤 Uploading recipe image (legacy)...');
      const uploadResult = await uploadFile(req.file, 'meal-image');
      const imageUrl = uploadResult.storage === 'cloud' 
        ? uploadResult.url 
        : getFileUrlFromStorage(req, uploadResult.filename, 'meal-image', uploadResult.storage);
      updateData.image = imageUrl;
      updateData.images = [imageUrl]; // Convert to array
    }

    // Handle videos - upload local videos và combine với URLs
    const videoUrls = [];
    
    // Upload local videos (from files)
    if (req.files && req.files.videos && req.files.videos.length > 0) {
      console.log(`📹 Uploading ${req.files.videos.length} local videos...`);
      for (const file of req.files.videos) {
        // Check file size (warn if > 100MB)
        if (file.size > 100 * 1024 * 1024) {
          console.warn(`⚠️ Video ${file.originalname} lớn hơn 100MB - có thể tốn phí trên Cloudinary!`);
        }
        
        const uploadResult = await uploadFile(file, 'video');
        let videoUrl;
        if (uploadResult.storage === 'cloud') {
          videoUrl = uploadResult.url;
          console.log('✅ Video uploaded to Cloudinary:', videoUrl);
        } else {
          videoUrl = getFileUrlFromStorage(req, uploadResult.filename, 'video', uploadResult.storage);
          console.log('✅ Video saved locally:', videoUrl);
        }
        
        // Validate URL - must be HTTP/HTTPS
        if (!videoUrl || (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://'))) {
          console.error('❌ Invalid video URL:', videoUrl);
          throw new Error(`Không thể tạo URL video hợp lệ cho file: ${file.originalname}`);
        }
        
        videoUrls.push({ url: videoUrl, title: file.originalname });
      }
    }
    
    // Add URL videos (from JSON string) - these are existing YouTube URLs or already uploaded videos
    if (req.body.videos) {
      try {
        const urlVideos = typeof req.body.videos === 'string' 
          ? JSON.parse(req.body.videos) 
          : req.body.videos;
        if (Array.isArray(urlVideos) && urlVideos.length > 0) {
          console.log(`📹 Adding ${urlVideos.length} URL videos:`, urlVideos.map(v => v.url || v));
          videoUrls.push(...urlVideos);
        }
      } catch (error) {
        console.error('Error parsing video URLs:', error);
      }
    }
    
    // ALWAYS set videos in updateData (even if empty to clear)
    // This ensures videos are updated even if they're the same
    updateData.videos = videoUrls;
    console.log(`✅ Total videos to save: ${videoUrls.length}`);
    if (videoUrls.length > 0) {
      console.log('📹 Video URLs:', JSON.stringify(videoUrls.map(v => ({ url: v.url, title: v.title })), null, 2));
    }

    // Handle existing images array (if sent as JSON string)
    if (req.body.images && typeof req.body.images === 'string') {
      try {
        const imagesArray = JSON.parse(req.body.images);
        if (Array.isArray(imagesArray) && imagesArray.length > 0) {
          // Merge với ảnh mới đã upload
          const existingImages = imagesArray.filter(img => typeof img === 'string' && img.startsWith('http'));
          updateData.images = [...existingImages, ...imageUrls];
          if (updateData.images.length > 0 && !updateData.image) {
            updateData.image = updateData.images[0]; // Set first image as main
          }
          console.log('📸 Merged images:', updateData.images.length);
        }
      } catch (error) {
        console.error('Error parsing images array:', error);
        // Fallback: use uploaded images only
        if (imageUrls.length > 0) {
          updateData.images = imageUrls;
        }
      }
    } else if (imageUrls.length > 0) {
      // Nếu chỉ có ảnh mới upload, dùng chúng
      updateData.images = imageUrls;
      console.log('📸 New images only:', imageUrls.length);
    }

    console.log('📝 Final updateData keys:', Object.keys(updateData));
    console.log('📝 Calling Recipe.update...');

    const result = await Recipe.update(recipeId, userId, updateData);
    
    console.log('✅ Recipe update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    });

    // Check if update was successful
    if (result.matchedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức hoặc không có quyền chỉnh sửa',
      });
    }

    // Even if modifiedCount is 0, it might be because data is identical
    // So we still return success if matchedCount > 0
    res.json({
      success: true,
      message: 'Cập nhật công thức thành công',
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Update recipe error:', error);
    
    if (error.message.includes('Không có quyền') || error.message.includes('Không tìm thấy')) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: error.message,
      });
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Xóa công thức
 */
export const deleteRecipe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    await Recipe.delete(recipeId, userId);

    res.json({
      success: true,
      message: 'Xóa công thức thành công',
    });
  } catch (error) {
    console.error('Delete recipe error:', error);
    
    if (error.message.includes('Không có quyền')) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: error.message,
      });
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Rating công thức
 */
export const rateRecipe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId } = req.params;
    const { rating } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Rating phải từ 1-5 sao',
      });
    }

    // Lấy thông tin recipe và user
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    const result = await Recipe.rate(recipeId, userId, rating);

    // Tạo notification cho rating
    const { createRatingNotification } = await import('../utils/notificationHelper.js');
    let userAvatarUrl = '';
    if (user.avatar) {
      userAvatarUrl = getFileUrlFromStorage(req, user.avatar, 'avatar', user.storage || 'local');
    }
    const recipeImage = recipe.images?.[0] || recipe.image || '';
    
    await createRatingNotification(
      recipeId,
      recipe.authorId,
      userId,
      user.name,
      userAvatarUrl,
      recipe.name,
      recipeImage,
      rating
    );

    res.json({
      success: true,
      message: 'Đánh giá thành công',
      ...result,
    });
  } catch (error) {
    console.error('Rate recipe error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Tìm kiếm công thức
 */
export const searchRecipes = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const recipes = await Recipe.search(q, {
      limit: parseInt(limit),
      skip,
    });

    res.json({
      success: true,
      data: recipes,
      query: q,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy công thức trending
 */
export const getTrendingRecipes = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const recipes = await Recipe.getTrending(parseInt(limit));

    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('Get trending recipes error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy công thức mới nhất
 */
export const getNewestRecipes = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const recipes = await Recipe.getNewest(parseInt(limit));

    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('Get newest recipes error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy công thức theo category
 */
export const getRecipesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;
    
    const recipes = await Recipe.getByCategory(category, parseInt(limit));

    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('Get recipes by category error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Like/Unlike công thức
 */
export const toggleLikeRecipe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const result = await Recipe.toggleLike(recipeId, userId);
    const recipe = await Recipe.findById(recipeId);

    // Tạo notification cho like (chỉ khi like, không phải unlike)
    if (result.liked) {
      const user = await User.findById(userId);
      if (user && recipe) {
        const { createLikeNotification } = await import('../utils/notificationHelper.js');
        let userAvatarUrl = '';
        if (user.avatar) {
          userAvatarUrl = getFileUrlFromStorage(req, user.avatar, 'avatar', user.storage || 'local');
        }
        const recipeImage = recipe.images?.[0] || recipe.image || '';
        
        await createLikeNotification(
          recipeId,
          recipe.authorId,
          userId,
          user.name,
          userAvatarUrl,
          recipe.name,
          recipeImage
        );
      }
    }

    res.json({
      success: true,
      data: result,
      likes: recipe?.likeCount || 0,
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Save/Unsave công thức
 */
export const toggleSaveRecipe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const result = await Recipe.toggleSave(recipeId, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Toggle save error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy công thức đã save
 */
export const getSavedRecipes = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    const recipes = await Recipe.getSavedByUser(userId);

    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('Get saved recipes error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy danh sách categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Recipe.getCategories();

    res.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    console.error('Get categories error:', error);
    // Return empty array instead of error for better UX
    res.json({
      success: true,
      data: [],
    });
  }
};

/**
 * Lấy featured chefs
 */
export const getFeaturedChefs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    // Pass req object để convert avatar filename thành URL đầy đủ
    const chefs = await Recipe.getFeaturedChefs(parseInt(limit), req);

    res.json({
      success: true,
      data: chefs,
    });
  } catch (error) {
    console.error('Get featured chefs error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy comments của recipe
 */
export const getRecipeComments = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const comments = await Recipe.getComments(recipeId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Thêm comment
 */
export const addComment = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId } = req.params;
    const { comment, rating } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập nội dung comment',
      });
    }

    // Lấy thông tin user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Lấy URL avatar nếu có
    let userAvatarUrl = '';
    if (user.avatar) {
      userAvatarUrl = getFileUrlFromStorage(req, user.avatar, 'avatar', user.storage || 'local');
    }

    // Upload ảnh comment nếu có
    let commentImageUrl = '';
    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file, 'comment-image');
        commentImageUrl = getFileUrlFromStorage(req, uploadResult.filename, 'comment-image', uploadResult.storage);
      } catch (uploadError) {
        console.error('Comment image upload error:', uploadError);
        // Không fail nếu upload ảnh lỗi, chỉ log
      }
    }

    // Validate rating if provided
    let validRating = null;
    if (rating !== undefined && rating !== null) {
      const ratingNum = parseInt(rating);
      if (ratingNum >= 1 && ratingNum <= 5) {
        validRating = ratingNum;
      }
    }

    // Lấy thông tin recipe để lấy authorId
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức',
      });
    }

    const newComment = await Recipe.addComment(
      recipeId,
      userId,
      user.name,
      userAvatarUrl,
      comment,
      commentImageUrl,
      validRating
    );

    // If rating is provided, also update recipe rating
    if (validRating) {
      await Recipe.rate(recipeId, userId, validRating);
    }

    // Tạo notification cho comment
    const { createCommentNotification, createRatingNotification } = await import('../utils/notificationHelper.js');
    const recipeImage = recipe.images?.[0] || recipe.image || '';
    
    await createCommentNotification(
      recipeId,
      recipe.authorId,
      userId,
      user.name,
      userAvatarUrl,
      recipe.name,
      recipeImage,
      comment,
      newComment._id.toString()
    );

    // Nếu có rating, tạo notification cho rating
    if (validRating) {
      await createRatingNotification(
        recipeId,
        recipe.authorId,
        userId,
        user.name,
        userAvatarUrl,
        recipe.name,
        recipeImage,
        validRating
      );
    }

    res.json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Cập nhật comment
 */
export const updateComment = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { commentId } = req.params;
    const { comment } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập nội dung comment',
      });
    }

    const updatedComment = await Recipe.updateComment(commentId, userId, comment);

    res.json({
      success: true,
      data: updatedComment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    
    if (error.message.includes('Không tìm thấy')) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Xóa comment
 */
export const deleteComment = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { commentId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    await Recipe.deleteComment(commentId, userId);

    res.json({
      success: true,
      message: 'Đã xóa comment',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    
    if (error.message.includes('Không tìm thấy')) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Add reply to comment (only author can reply)
 */
export const addReply = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId, commentId } = req.params;
    const { reply, replyImage } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!reply || !reply.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập nội dung reply',
      });
    }

    // Check if user is the recipe author
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức',
      });
    }

    if (recipe.authorId.toString() !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Chỉ tác giả mới có thể reply',
      });
    }

    // Get author info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Get comment để lấy userId của người comment
    const { db } = await connectToDatabase();
    const comment = await db.collection('recipe_comments').findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy comment',
      });
    }

    // Get author avatar URL
    let authorAvatarUrl = '';
    if (user.avatar) {
      authorAvatarUrl = getFileUrlFromStorage(req, user.avatar, 'avatar', user.storage || 'local');
    }

    // Upload reply image if exists
    let replyImageUrl = '';
    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file, 'comment-image');
        replyImageUrl = getFileUrlFromStorage(req, uploadResult.filename, 'comment-image', uploadResult.storage);
      } catch (uploadError) {
        console.error('Reply image upload error:', uploadError);
      }
    } else if (replyImage) {
      replyImageUrl = replyImage;
    }

    const newReply = await Recipe.addReply(
      commentId,
      userId,
      user.name,
      authorAvatarUrl,
      reply,
      replyImageUrl
    );

    // Tạo notification cho reply
    const { createReplyNotification } = await import('../utils/notificationHelper.js');
    const recipeImage = recipe.images?.[0] || recipe.image || '';
    
    await createReplyNotification(
      comment.userId, // Người comment (sẽ nhận notification)
      userId, // Người reply (tác giả recipe)
      user.name,
      authorAvatarUrl,
      recipeId,
      recipe.name,
      recipeImage,
      commentId,
      reply
    );

    res.json({
      success: true,
      data: newReply,
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Update reply
 */
export const updateReply = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId, commentId, replyId } = req.params;
    const { reply, replyImage } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    if (!reply || !reply.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập nội dung reply',
      });
    }

    // Check if user is the recipe author
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức',
      });
    }

    if (recipe.authorId.toString() !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Chỉ tác giả mới có thể chỉnh sửa reply',
      });
    }

    // Upload reply image if exists
    let replyImageUrl = '';
    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file, 'comment-image');
        replyImageUrl = getFileUrlFromStorage(req, uploadResult.filename, 'comment-image', uploadResult.storage);
      } catch (uploadError) {
        console.error('Reply image upload error:', uploadError);
      }
    } else if (replyImage) {
      replyImageUrl = replyImage;
    }

    const updatedComment = await Recipe.updateReply(commentId, replyId, userId, reply, replyImageUrl);
    res.json({
      success: true,
      data: updatedComment,
    });
  } catch (error) {
    console.error('Update reply error:', error);
    if (error.message.includes('Không tìm thấy')) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Delete reply
 */
export const deleteReply = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipeId, commentId, replyId } = req.params;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.AUTH_UNAUTHORIZED,
      });
    }

    // Check if user is the recipe author
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy công thức',
      });
    }

    if (recipe.authorId.toString() !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Chỉ tác giả mới có thể xóa reply',
      });
    }

    await Recipe.deleteReply(commentId, replyId, userId);
    res.json({ success: true, message: 'Đã xóa reply' });
  } catch (error) {
    console.error('Delete reply error:', error);
    if (error.message.includes('Không tìm thấy')) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

/**
 * Lấy thống kê tổng quan của hệ thống
 */
export const getStats = async (req, res) => {
  try {
    const { db } = await connectToDatabase();

    // Count total recipes
    const totalRecipes = await db.collection('recipes').countDocuments({ isPublic: true });

    // Count total chefs
    const totalChefs = await db.collection('users').countDocuments({ role: 'chef' });

    // Sum total likes from all recipes
    const recipes = await db.collection('recipes').find({ isPublic: true }).toArray();
    const totalLikes = recipes.reduce((sum, recipe) => sum + (recipe.likeCount || 0), 0);

    res.json({
      success: true,
      data: {
        totalRecipes,
        totalChefs,
        totalLikes,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || MESSAGES.SERVER_ERROR,
    });
  }
};

