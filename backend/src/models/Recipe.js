/**
 * Recipe Model
 * Schema cho công thức nấu ăn (recipes)
 */

import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'recipes';
const SAVES_COLLECTION = 'recipe_saves';
const LIKES_COLLECTION = 'recipe_likes';
const COMMENTS_COLLECTION = 'recipe_comments';

export class Recipe {
  /**
   * Tạo công thức mới
   */
  static async create(userId, recipeData) {
    const { db } = await connectToDatabase();
    
    // Convert userId to ObjectId if it's a string
    let authorId;
    if (typeof userId === 'string') {
      try {
        authorId = new ObjectId(userId);
      } catch (error) {
        // If invalid ObjectId format, use string
        authorId = userId;
      }
    } else {
      authorId = userId;
    }
    
    const recipe = {
      authorId: authorId,
      authorName: recipeData.authorName || '',
      authorAvatar: recipeData.authorAvatar || '',
      name: recipeData.name,
      description: recipeData.description || '',
      category: recipeData.category || 'other',
      mealType: recipeData.mealType || null, // breakfast, lunch, dinner, dessert, snack
      cuisine: recipeData.cuisine || 'vietnamese',
      prepTime: recipeData.prepTime || 0, // phút
      cookTime: recipeData.cookTime || 0, // phút
      servings: recipeData.servings || 1,
      difficulty: recipeData.difficulty || 'Dễ', // Dễ, Trung bình, Khó
      ingredients: recipeData.ingredients || [],
      instructions: recipeData.instructions || [],
      image: recipeData.image || '', // Main image (backward compatible)
      images: recipeData.images || (recipeData.image ? [recipeData.image] : []), // Array of images
      videos: recipeData.videos || [], // Array of video URLs/objects
      tags: recipeData.tags || [],
      
      // Stats
      viewCount: 0,
      likeCount: 0,
      saveCount: 0,
      ratingCount: 0,
      averageRating: 0,
      
      // Metadata
      isPublic: recipeData.isPublic !== false, // default public
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(recipe);
    return { ...recipe, _id: result.insertedId };
  }

  /**
   * Tìm công thức theo ID
   */
  static async findById(recipeId) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME).findOne({
      _id: new ObjectId(recipeId),
    });
  }

  /**
   * Tìm công thức của user
   */
  static async findByUserId(userId, options = {}) {
    const { db } = await connectToDatabase();
    const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;

    // Convert userId to ObjectId if it's a string
    let userIdObj;
    if (typeof userId === 'string') {
      try {
        userIdObj = new ObjectId(userId);
      } catch (error) {
        // If invalid ObjectId format, use string
        userIdObj = userId;
      }
    } else {
      userIdObj = userId;
    }

    // Query with $or to match both ObjectId and string formats
    const query = {
      $or: [
        { authorId: userIdObj },
        { authorId: userId }, // Also try original userId (string)
      ],
    };

    return await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Tìm công thức public (feed)
   */
  static async findPublic(options = {}) {
    const { db } = await connectToDatabase();
    const { 
      limit = 20, 
      skip = 0, 
      sortBy = 'createdAt', 
      sortOrder = -1,
      category = null,
      mealType = null,
      authorId = null,
    } = options;

    const query = { isPublic: true };
    if (category) {
      query.category = category;
    }
    if (mealType) {
      query.mealType = mealType;
    }
    if (authorId) {
      query.authorId = new (await import('mongodb')).ObjectId(authorId);
    }

    return await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Cập nhật công thức
   */
  static async update(recipeId, userId, updateData) {
    const { db } = await connectToDatabase();

    // Chỉ tác giả mới được sửa
    const recipe = await this.findById(recipeId);
    if (!recipe) {
      throw new Error('Không tìm thấy công thức');
    }

    // Normalize authorId and userId for comparison
    const recipeAuthorId = recipe.authorId?.toString ? recipe.authorId.toString() : String(recipe.authorId);
    const normalizedUserId = userId?.toString ? userId.toString() : String(userId);

    console.log('🔍 Recipe.update - Permission check:', {
      recipeId,
      recipeAuthorId,
      normalizedUserId,
      match: recipeAuthorId === normalizedUserId,
    });

    if (recipeAuthorId !== normalizedUserId) {
      throw new Error('Không có quyền chỉnh sửa công thức này');
    }

    // Try multiple query strategies to ensure we find the recipe
    let query;
    let authorIdForQuery;
    
    // Strategy 1: Try ObjectId for both
    try {
      authorIdForQuery = typeof userId === 'string' ? new ObjectId(userId) : userId;
      query = { _id: new ObjectId(recipeId), authorId: authorIdForQuery };
    } catch (error) {
      // Strategy 2: Use string comparison
      authorIdForQuery = String(userId);
      query = { _id: new ObjectId(recipeId), authorId: authorIdForQuery };
    }

    // Also try with authorId as string if ObjectId didn't work
    const queryWithStringAuthorId = { 
      _id: new ObjectId(recipeId), 
      authorId: String(userId) 
    };

    // Log what we're updating
    console.log('📝 Recipe.update - Setting videos:', updateData.videos ? updateData.videos.length : 'not in updateData');
    console.log('📝 Recipe.update - Query:', JSON.stringify(query));
    
    let result = await db.collection(COLLECTION_NAME).updateOne(
      query,
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );

    // If no match, try with string authorId
    if (result.matchedCount === 0) {
      console.log('⚠️ First query failed, trying with string authorId...');
      result = await db.collection(COLLECTION_NAME).updateOne(
        queryWithStringAuthorId,
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      );
    }

    // If still no match, try with just _id (less secure but might work)
    if (result.matchedCount === 0) {
      console.log('⚠️ Second query failed, trying with just _id (authorId check already done)...');
      result = await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(recipeId) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      );
    }

    console.log('📝 Recipe.update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    });

    if (result.matchedCount === 0) {
      throw new Error('Không tìm thấy công thức để cập nhật');
    }

    return result;
  }

  /**
   * Xóa công thức
   */
  static async delete(recipeId, userId) {
    const { db } = await connectToDatabase();

    // Chỉ tác giả mới được xóa
    const recipe = await this.findById(recipeId);
    if (!recipe) {
      throw new Error('Không tìm thấy công thức');
    }

    // Normalize authorId and userId for comparison
    const recipeAuthorId = recipe.authorId?.toString ? recipe.authorId.toString() : String(recipe.authorId);
    const normalizedUserId = userId?.toString ? userId.toString() : String(userId);

    if (recipeAuthorId !== normalizedUserId) {
      throw new Error('Không có quyền xóa công thức này');
    }

    // Convert userId to ObjectId for query if needed
    let authorIdForQuery;
    if (typeof userId === 'string') {
      try {
        authorIdForQuery = new ObjectId(userId);
      } catch (error) {
        authorIdForQuery = userId;
      }
    } else {
      authorIdForQuery = userId;
    }

    return await db.collection(COLLECTION_NAME).deleteOne({
      _id: new ObjectId(recipeId),
      authorId: authorIdForQuery,
    });
  }

  /**
   * Rating công thức
   */
  static async rate(recipeId, userId, rating) {
    const { db } = await connectToDatabase();

    // Validation
    if (rating < 1 || rating > 5) {
      throw new Error('Rating phải từ 1-5 sao');
    }

    // Lưu rating vào collection riêng
    await db.collection('recipe_ratings').updateOne(
      { recipeId: new ObjectId(recipeId), userId },
      { 
        $set: { 
          rating, 
          updatedAt: new Date() 
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );

    // Tính lại average rating
    const ratings = await db
      .collection('recipe_ratings')
      .find({ recipeId: new ObjectId(recipeId) })
      .toArray();

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    // Cập nhật recipe
    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(recipeId) },
      {
        $set: {
          ratingCount: ratings.length,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          updatedAt: new Date(),
        },
      }
    );

    return { averageRating, ratingCount: ratings.length };
  }

  /**
   * Lấy rating của user cho recipe
   */
  static async getUserRating(recipeId, userId) {
    const { db } = await connectToDatabase();
    const rating = await db.collection('recipe_ratings').findOne({
      recipeId: new ObjectId(recipeId),
      userId,
    });
    return rating?.rating || null;
  }

  /**
   * Tăng view count
   */
  static async incrementView(recipeId) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(recipeId) },
      { $inc: { viewCount: 1 } }
    );
  }

  /**
   * Tìm kiếm công thức
   */
  /**
   * Normalize Vietnamese text: remove diacritics and convert to lowercase
   * Example: "Mì tôm" -> "mi tom"
   */
  static normalizeVietnamese(text) {
    if (!text) return '';
    
    // Map Vietnamese diacritics to non-diacritic equivalents
    const diacriticsMap = {
      'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
      'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
      'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
      'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
      'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
      'đ': 'd',
      'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
      'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
      'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
      'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
      'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
      'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
      'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
      'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
      'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
      'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
      'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
      'Đ': 'D',
    };
    
    return text
      .split('')
      .map(char => diacriticsMap[char] || char)
      .join('')
      .toLowerCase()
      .trim();
  }

  /**
   * Create flexible search pattern from query
   * Handles both original and normalized text
   */
  static createSearchPattern(query) {
    const normalized = this.normalizeVietnamese(query);
    const original = query.trim();
    
    // Escape special regex characters
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create pattern that matches both original and normalized
    const patterns = [];
    
    // Add original query (case-insensitive)
    if (original) {
      patterns.push(escapeRegex(original));
    }
    
    // Add normalized query
    if (normalized && normalized !== original.toLowerCase()) {
      patterns.push(escapeRegex(normalized));
    }
    
    // Combine patterns with OR
    if (patterns.length > 0) {
      return new RegExp(patterns.join('|'), 'i');
    }
    
    return new RegExp(escapeRegex(query), 'i');
  }

  static async search(query, options = {}) {
    const { db } = await connectToDatabase();
    const { limit = 20, skip = 0 } = options;

    if (!query || !query.trim()) {
      return [];
    }

    // Create flexible search pattern
    const searchPattern = this.createSearchPattern(query);
    const normalizedQuery = this.normalizeVietnamese(query);

    // Get all recipes and filter in memory for better Vietnamese search
    // This allows us to search both original and normalized text
    const allRecipes = await db
      .collection(COLLECTION_NAME)
      .find({ isPublic: true })
      .toArray();

    // Filter recipes that match the search query
    const matchedRecipes = allRecipes.filter(recipe => {
      // Check name (original and normalized)
      const recipeNameOriginal = recipe.name || '';
      const recipeNameNormalized = this.normalizeVietnamese(recipeNameOriginal);
      if (searchPattern.test(recipeNameOriginal) || 
          searchPattern.test(recipeNameNormalized) ||
          recipeNameNormalized.includes(normalizedQuery)) {
        return true;
      }

      // Check description (original and normalized)
      const recipeDescOriginal = recipe.description || '';
      const recipeDescNormalized = this.normalizeVietnamese(recipeDescOriginal);
      if (searchPattern.test(recipeDescOriginal) || 
          searchPattern.test(recipeDescNormalized) ||
          recipeDescNormalized.includes(normalizedQuery)) {
        return true;
      }

      // Check tags
      if (recipe.tags && Array.isArray(recipe.tags)) {
        for (const tag of recipe.tags) {
          const tagOriginal = tag;
          const tagNormalized = this.normalizeVietnamese(tagOriginal);
          if (searchPattern.test(tagOriginal) || 
              searchPattern.test(tagNormalized) ||
              tagNormalized.includes(normalizedQuery)) {
            return true;
          }
        }
      }

      // Check ingredients
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        for (const ingredient of recipe.ingredients) {
          const ingOriginal = ingredient;
          const ingNormalized = this.normalizeVietnamese(ingOriginal);
          if (searchPattern.test(ingOriginal) || 
              searchPattern.test(ingNormalized) ||
              ingNormalized.includes(normalizedQuery)) {
            return true;
          }
        }
      }

      return false;
    });

    // Apply pagination
    return matchedRecipes.slice(skip, skip + limit);
  }

  /**
   * Lấy thống kê của user
   */
  static async getUserStats(userId) {
    const { db } = await connectToDatabase();

    const recipes = await this.findByUserId(userId);
    const totalViews = recipes.reduce((sum, r) => sum + (r.viewCount || 0), 0);
    const totalLikes = recipes.reduce((sum, r) => sum + (r.likeCount || 0), 0);
    const totalRatings = recipes.reduce((sum, r) => sum + (r.ratingCount || 0), 0);
    const avgRating = recipes.length > 0
      ? recipes.reduce((sum, r) => sum + (r.averageRating || 0), 0) / recipes.length
      : 0;

    return {
      recipesCount: recipes.length,
      totalViews,
      totalLikes,
      totalRatings,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }

  /**
   * Lấy công thức trending (theo likes + views)
   */
  static async getTrending(limit = 5) {
    const { db } = await connectToDatabase();
    
    return await db
      .collection(COLLECTION_NAME)
      .find({ isPublic: true })
      .sort({ likeCount: -1, viewCount: -1, averageRating: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Lấy công thức mới nhất
   */
  static async getNewest(limit = 10) {
    const { db } = await connectToDatabase();
    
    return await db
      .collection(COLLECTION_NAME)
      .find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Lấy công thức theo category
   */
  static async getByCategory(category, limit = 20) {
    const { db } = await connectToDatabase();
    
    return await db
      .collection(COLLECTION_NAME)
      .find({ isPublic: true, category })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Toggle like công thức
   */
  static async toggleLike(recipeId, userId) {
    const { db } = await connectToDatabase();
    
    const existing = await db.collection(LIKES_COLLECTION).findOne({
      recipeId: new ObjectId(recipeId),
      userId,
    });

    if (existing) {
      // Unlike
      await db.collection(LIKES_COLLECTION).deleteOne({
        recipeId: new ObjectId(recipeId),
        userId,
      });
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(recipeId) },
        { $inc: { likeCount: -1 } }
      );
      return { liked: false };
    } else {
      // Like
      await db.collection(LIKES_COLLECTION).insertOne({
        recipeId: new ObjectId(recipeId),
        userId,
        createdAt: new Date(),
      });
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(recipeId) },
        { $inc: { likeCount: 1 } }
      );
      return { liked: true };
    }
  }

  /**
   * Toggle save công thức
   */
  static async toggleSave(recipeId, userId) {
    const { db } = await connectToDatabase();
    
    const existing = await db.collection(SAVES_COLLECTION).findOne({
      recipeId: new ObjectId(recipeId),
      userId,
    });

    if (existing) {
      // Unsave
      await db.collection(SAVES_COLLECTION).deleteOne({
        recipeId: new ObjectId(recipeId),
        userId,
      });
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(recipeId) },
        { $inc: { saveCount: -1 } }
      );
      return { saved: false };
    } else {
      // Save
      await db.collection(SAVES_COLLECTION).insertOne({
        recipeId: new ObjectId(recipeId),
        userId,
        createdAt: new Date(),
      });
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(recipeId) },
        { $inc: { saveCount: 1 } }
      );
      return { saved: true };
    }
  }

  /**
   * Lấy danh sách công thức đã save của user
   */
  static async getSavedByUser(userId) {
    const { db } = await connectToDatabase();
    
    const saves = await db.collection(SAVES_COLLECTION)
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const recipeIds = saves.map(s => s.recipeId);
    
    if (recipeIds.length === 0) return [];

    return await db.collection(COLLECTION_NAME)
      .find({ _id: { $in: recipeIds } })
      .toArray();
  }

  /**
   * Check user đã like/save chưa
   */
  static async getUserInteractions(recipeId, userId) {
    const { db } = await connectToDatabase();
    
    const [liked, saved] = await Promise.all([
      db.collection(LIKES_COLLECTION).findOne({
        recipeId: new ObjectId(recipeId),
        userId,
      }),
      db.collection(SAVES_COLLECTION).findOne({
        recipeId: new ObjectId(recipeId),
        userId,
      }),
    ]);

    return {
      liked: !!liked,
      saved: !!saved,
    };
  }

  /**
   * Lấy danh sách categories với count
   */
  static async getCategories() {
    const { db } = await connectToDatabase();
    
    const categories = await db.collection(COLLECTION_NAME).aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    const categoryIcons = {
      vietnamese: 'leaf',
      asian: 'nutrition',
      western: 'pizza',
      dessert: 'ice-cream',
      drinks: 'cafe',
      healthy: 'heart',
      quick: 'flash',
      other: 'restaurant',
    };

    const categoryNames = {
      vietnamese: 'Món Việt',
      asian: 'Món Á',
      western: 'Món Âu',
      dessert: 'Tráng miệng',
      drinks: 'Đồ uống',
      healthy: 'Healthy',
      quick: 'Nhanh',
      other: 'Khác',
    };

    return categories.map(c => ({
      id: c._id,
      name: categoryNames[c._id] || c._id,
      icon: categoryIcons[c._id] || 'restaurant',
      count: c.count,
    }));
  }

  /**
   * Lấy featured chefs (users có nhiều recipes nhất)
   */
  static async getFeaturedChefs(limit = 10) {
    const { db } = await connectToDatabase();
    
    const chefs = await db.collection(COLLECTION_NAME).aggregate([
      { $match: { isPublic: true } },
      { $group: { 
        _id: '$authorId', 
        name: { $first: '$authorName' },
        avatar: { $first: '$authorAvatar' },
        recipesCount: { $sum: 1 },
        totalLikes: { $sum: '$likeCount' },
      }},
      { $sort: { recipesCount: -1, totalLikes: -1 } },
      { $limit: limit },
    ]).toArray();

    return chefs.map(c => ({
      _id: c._id,
      name: c.name || 'Chef',
      avatar: c.avatar,
      recipesCount: c.recipesCount,
      totalLikes: c.totalLikes,
    }));
  }

  /**
   * Thêm comment vào recipe
   */
  static async addComment(recipeId, userId, userName, userAvatar, comment, image = '', rating = null) {
    const { db } = await connectToDatabase();
    
    const commentDoc = {
      recipeId: new ObjectId(recipeId),
      userId,
      userName: userName || 'User',
      userAvatar: userAvatar || '',
      comment: comment.trim(),
      image: image || '',
      rating: rating || null, // Rating from 1-5, optional
      replies: [], // Array of replies from author
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COMMENTS_COLLECTION).insertOne(commentDoc);
    return { ...commentDoc, _id: result.insertedId };
  }

  /**
   * Lấy comments của recipe
   */
  static async getComments(recipeId, options = {}) {
    const { db } = await connectToDatabase();
    const { limit = 50, skip = 0, sortOrder = -1 } = options;

    return await db
      .collection(COMMENTS_COLLECTION)
      .find({ recipeId: new ObjectId(recipeId) })
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Cập nhật comment
   */
  static async updateComment(commentId, userId, comment) {
    const { db } = await connectToDatabase();
    
    const result = await db.collection(COMMENTS_COLLECTION).updateOne(
      {
        _id: new ObjectId(commentId),
        userId,
      },
      {
        $set: {
          comment: comment.trim(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Không tìm thấy comment hoặc không có quyền chỉnh sửa');
    }

    return await db.collection(COMMENTS_COLLECTION).findOne({
      _id: new ObjectId(commentId),
    });
  }

  /**
   * Xóa comment
   */
  static async deleteComment(commentId, userId) {
    const { db } = await connectToDatabase();
    
    const result = await db.collection(COMMENTS_COLLECTION).deleteOne({
      _id: new ObjectId(commentId),
      userId,
    });

    if (result.deletedCount === 0) {
      throw new Error('Không tìm thấy comment hoặc không có quyền xóa');
    }

    return true;
  }

  /**
   * Thêm reply từ tác giả vào comment
   */
  static async addReply(commentId, authorId, authorName, authorAvatar, replyText, replyImage = '') {
    const { db } = await connectToDatabase();
    
    const comment = await db.collection(COMMENTS_COLLECTION).findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      throw new Error('Không tìm thấy comment');
    }

    const reply = {
      _id: new ObjectId(),
      authorId,
      authorName: authorName || 'Author',
      authorAvatar: authorAvatar || '',
      reply: replyText.trim(),
      image: replyImage || '',
      createdAt: new Date(),
    };

    await db.collection(COMMENTS_COLLECTION).updateOne(
      { _id: new ObjectId(commentId) },
      {
        $push: { replies: reply },
        $set: { updatedAt: new Date() },
      }
    );

    return reply;
  }

  /**
   * Cập nhật reply
   */
  static async updateReply(commentId, replyId, authorId, newReplyText, replyImage = '') {
    const { db } = await connectToDatabase();
    
    const comment = await db.collection(COMMENTS_COLLECTION).findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      throw new Error('Không tìm thấy comment');
    }

    const reply = comment.replies?.find((r) => 
      r._id.toString() === replyId && r.authorId === authorId
    );

    if (!reply) {
      throw new Error('Không tìm thấy reply hoặc không có quyền chỉnh sửa');
    }

    await db.collection(COMMENTS_COLLECTION).updateOne(
      { 
        _id: new ObjectId(commentId),
        'replies._id': new ObjectId(replyId),
      },
      {
        $set: {
          'replies.$.reply': newReplyText.trim(),
          'replies.$.image': replyImage || '',
          'replies.$.updatedAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return await db.collection(COMMENTS_COLLECTION).findOne({
      _id: new ObjectId(commentId),
    });
  }

  /**
   * Xóa reply
   */
  static async deleteReply(commentId, replyId, authorId) {
    const { db } = await connectToDatabase();
    
    const comment = await db.collection(COMMENTS_COLLECTION).findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      throw new Error('Không tìm thấy comment');
    }

    const reply = comment.replies?.find((r) => 
      r._id.toString() === replyId && r.authorId === authorId
    );

    if (!reply) {
      throw new Error('Không tìm thấy reply hoặc không có quyền xóa');
    }

    await db.collection(COMMENTS_COLLECTION).updateOne(
      { _id: new ObjectId(commentId) },
      {
        $pull: { replies: { _id: new ObjectId(replyId) } },
        $set: { updatedAt: new Date() },
      }
    );

    return true;
  }
}

export default Recipe;

