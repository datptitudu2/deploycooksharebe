/**
 * Meal Plan Service
 * API calls for meal planning operations
 */

import api, { ApiResponse } from './api';

// Types
export interface MealDetail {
  name: string;
  time: string;
  ingredients?: string;
  instructions?: string;
  notes?: string;
  source?: string;
  recipeId?: string;
}

export interface MealPlan {
  _id: string;
  userId: string;
  date: string;
  breakfast?: MealDetail;
  lunch?: MealDetail;
  dinner?: MealDetail;
  snack?: MealDetail;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealData {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealDetail: MealDetail;
}

export interface GenerateMealPlanRequest {
  startDate: string;
  days: number;
  preferences?: {
    dietMode?: string;
    excludeIngredients?: string[];
    budget?: string;
    cookingTime?: string;
  };
}

// API Functions
const mealPlanService = {
  /**
   * Get meal plans for a date range
   */
  async getPlans(startDate: string, endDate: string): Promise<ApiResponse<MealPlan[]>> {
    const response = await api.get(`/meal-planning?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  /**
   * Get meal plan for a specific date
   */
  async getPlanByDate(date: string): Promise<ApiResponse<MealPlan>> {
    const response = await api.get(`/meal-planning/date/${date}`);
    return response.data;
  },

  /**
   * Add meal to plan
   */
  async addMeal(data: CreateMealData): Promise<ApiResponse<MealPlan>> {
    const response = await api.post('/meal-planning/add', data);
    return response.data;
  },

  /**
   * Update meal in plan
   */
  async updateMeal(data: CreateMealData): Promise<ApiResponse<MealPlan>> {
    const response = await api.put('/meal-planning/update', data);
    return response.data;
  },

  /**
   * Delete meal from plan
   */
  async deleteMeal(date: string, mealType: string): Promise<ApiResponse<null>> {
    const response = await api.delete('/meal-planning/delete', {
      data: { date, mealType },
    });
    return response.data;
  },

  /**
   * Generate AI meal plan
   */
  async generatePlan(request: GenerateMealPlanRequest): Promise<ApiResponse<MealPlan[]>> {
    const response = await api.post('/meal-planning/generate', request);
    return response.data;
  },

  /**
   * Get weekly summary
   */
  async getWeeklySummary(weekStart: string): Promise<ApiResponse<{
    totalMeals: number;
    completedMeals: number;
    upcomingMeals: number;
    nutritionSummary?: any;
  }>> {
    const response = await api.get(`/meal-planning/summary?weekStart=${weekStart}`);
    return response.data;
  },
};

export default mealPlanService;

