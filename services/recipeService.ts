/**
 * Recipe Service
 * API calls for recipe-related operations
 */

import api, { ApiResponse, PaginatedResponse } from './api';

// Types
export interface Recipe {
  _id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime: number;
  prepTime: number;
  servings: number;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  category: string;
  cuisine: string;
  image?: string; // Main image (backward compatible)
  images?: string[]; // Array of images
  videos?: Array<{
    url: string;
    thumbnail?: string;
    title?: string;
    duration?: number;
  }>; // Array of videos
  // Author info (from backend)
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  // Stats
  viewCount: number;
  likeCount: number;
  saveCount: number;
  ratingCount: number;
  averageRating: number;
  // Metadata
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFilters {
  category?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'snack';
  difficulty?: string;
  cuisine?: string;
  maxTime?: number;
  search?: string;
  sortBy?: 'popular' | 'newest' | 'rating' | 'quickest';
  page?: number;
  limit?: number;
  authorId?: string;
}

export interface CreateRecipeData {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime: number;
  prepTime: number;
  servings: number;
  difficulty: string;
  category: string;
  cuisine?: string;
  tags?: string[];
  isPublic?: boolean;
}

// API Functions
const recipeService = {
  /**
   * Get all recipes with filters
   */
  async getRecipes(filters?: RecipeFilters): Promise<PaginatedResponse<Recipe>> {
    const params = new URLSearchParams();
    if (filters) {
      // Map sortBy values
      let sortBy = filters.sortBy || 'createdAt';
      if (sortBy === 'popular') sortBy = 'likeCount';
      if (sortBy === 'newest') sortBy = 'createdAt';
      if (sortBy === 'rating') sortBy = 'averageRating';
      if (sortBy === 'quickest') sortBy = 'cookTime';
      
      params.append('sortBy', sortBy);
      params.append('sortOrder', 'desc');
      
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      if (filters.mealType) {
        params.append('mealType', filters.mealType);
      }
      if (filters.difficulty) {
        params.append('difficulty', filters.difficulty);
      }
      if (filters.authorId) {
        params.append('authorId', filters.authorId);
      }
      if (filters.limit) {
        params.append('limit', String(filters.limit));
      }
      if (filters.page) {
        params.append('page', String(filters.page));
      }
    }
    
    // If search query, use search endpoint instead
    if (filters?.search) {
      return this.search(filters.search, filters.limit || 50);
    }
    
    const response = await api.get(`/recipe-management?${params.toString()}`);
    return response.data;
  },

  /**
   * Get trending recipes
   */
  async getTrending(limit: number = 5): Promise<ApiResponse<Recipe[]>> {
    const response = await api.get(`/recipe-management/trending?limit=${limit}`);
    return response.data;
  },

  /**
   * Get newest recipes
   */
  async getNewest(limit: number = 10): Promise<ApiResponse<Recipe[]>> {
    const response = await api.get(`/recipe-management/newest?limit=${limit}`);
    return response.data;
  },

  /**
   * Get recipe by ID
   */
  async getById(id: string): Promise<ApiResponse<Recipe>> {
    const response = await api.get(`/recipe-management/${id}`);
    return response.data;
  },

  /**
   * Create new recipe
   */
  async create(data: CreateRecipeData): Promise<ApiResponse<Recipe>> {
    const response = await api.post('/recipe-management', data);
    return response.data;
  },

  /**
   * Update recipe
   */
  async update(id: string, data: Partial<CreateRecipeData>): Promise<ApiResponse<Recipe>> {
    const response = await api.put(`/recipe-management/${id}`, data);
    return response.data;
  },

  /**
   * Delete recipe
   */
  async delete(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/recipe-management/${id}`);
    return response.data;
  },

  /**
   * Rate recipe
   */
  async rate(id: string, rating: number, comment?: string): Promise<ApiResponse<Recipe>> {
    const response = await api.post(`/recipe-management/${id}/rate`, { rating, comment });
    return response.data;
  },

  /**
   * Save/Unsave recipe
   */
  async toggleSave(id: string): Promise<ApiResponse<{ saved: boolean }>> {
    const response = await api.post(`/recipe-management/${id}/save`);
    return response.data;
  },

  /**
   * Like/Unlike recipe
   */
  async toggleLike(id: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    const response = await api.post(`/recipe-management/${id}/like`);
    return response.data;
  },

  /**
   * Get user's saved recipes
   */
  async getSaved(): Promise<ApiResponse<Recipe[]>> {
    const response = await api.get('/recipe-management/saved');
    return response.data;
  },

  /**
   * Get user's own recipes
   */
  async getMyRecipes(): Promise<ApiResponse<Recipe[]>> {
    const response = await api.get('/recipe-management/my/recipes');
    return response.data;
  },

  /**
   * Upload recipe image
   */
  async uploadImage(recipeId: string, imageUri: string): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'recipe-image.jpg',
    } as any);

    const response = await api.post(`/recipe-management/${recipeId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Search recipes
   */
  async search(query: string, limit: number = 20): Promise<PaginatedResponse<Recipe>> {
    const response = await api.get(`/recipe-management/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    // Backend returns { success, data, query, page, limit }
    // Convert to PaginatedResponse format
    return {
      success: response.data.success,
      data: response.data.data || [],
      pagination: {
        page: response.data.page || 1,
        limit: response.data.limit || limit,
        total: response.data.data?.length || 0,
        totalPages: 1,
      },
    };
  },

  /**
   * Get recipes by category
   */
  async getByCategory(category: string, limit: number = 20): Promise<ApiResponse<Recipe[]>> {
    const response = await api.get(`/recipe-management/category/${category}?limit=${limit}`);
    return response.data;
  },

  /**
   * Get recipe categories with counts
   */
  async getCategories(): Promise<ApiResponse<{ name: string; count: number; icon: string }[]>> {
    const response = await api.get('/recipe-management/categories');
    return response.data;
  },

  /**
   * Get comments for a recipe
   */
  async getComments(recipeId: string): Promise<ApiResponse<any[]>> {
    const response = await api.get(`/recipe-management/${recipeId}/comments`);
    return response.data;
  },

  /**
   * Add a comment to a recipe
   */
  async addComment(recipeId: string, comment: string, imageUri?: string | null, rating?: number | null): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('comment', comment);
    if (rating !== undefined && rating !== null) {
      formData.append('rating', rating.toString());
    }
    
    if (imageUri) {
      // Convert local URI to FormData file
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);
    }
    
    const response = await api.post(`/recipe-management/${recipeId}/comments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update a comment
   */
  async updateComment(recipeId: string, commentId: string, comment: string): Promise<ApiResponse<any>> {
    const response = await api.put(`/recipe-management/${recipeId}/comments/${commentId}`, { comment });
    return response.data;
  },

  /**
   * Delete a comment
   */
  async deleteComment(recipeId: string, commentId: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/recipe-management/${recipeId}/comments/${commentId}`);
    return response.data;
  },

  /**
   * Add reply to a comment (author only)
   */
  async addReply(recipeId: string, commentId: string, reply: string, replyImage?: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('reply', reply);
    if (replyImage) {
      const uriParts = replyImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image', {
        uri: replyImage,
        name: `reply_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    const response = await api.post(`/recipe-management/${recipeId}/comments/${commentId}/replies`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update a reply (author only)
   */
  async updateReply(recipeId: string, commentId: string, replyId: string, reply: string, replyImage?: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('reply', reply);
    if (replyImage) {
      const uriParts = replyImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image', {
        uri: replyImage,
        name: `reply_edit_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    } else {
      formData.append('replyImage', '');
    }

    const response = await api.put(`/recipe-management/${recipeId}/comments/${commentId}/replies/${replyId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete a reply (author only)
   */
  async deleteReply(recipeId: string, commentId: string, replyId: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/recipe-management/${recipeId}/comments/${commentId}/replies/${replyId}`);
    return response.data;
  },
};

export default recipeService;

