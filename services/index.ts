/**
 * Services Index
 * Export all services for easy import
 */

export { default as api } from './api';
export { default as recipeService } from './recipeService';
export { default as userService } from './userService';
export { default as mealPlanService } from './mealPlanService';
export { default as chatbotService } from './chatbotService';
export { default as achievementService } from './achievementService';
export { default as messageService } from './messageService';
export { default as notificationService } from './notificationService';
export { default as storyService } from './storyService';
export { default as challengeService } from './challengeService';
export { alertService, useAlertService } from './alertService';

// Re-export types
export type { ApiResponse, PaginatedResponse } from './api';
export type { Recipe, RecipeFilters, CreateRecipeData } from './recipeService';
export type { User, UserStats, Badge, Achievement, FeaturedChef, UpdateProfileData } from './userService';
export type { MealPlan, MealDetail, CreateMealData, GenerateMealPlanRequest } from './mealPlanService';
export type { ChatMessage, ChatResponse, VideoInfo, SendMessageRequest } from './chatbotService';
export type { Message, Conversation } from './messageService';
export type { Notification } from './notificationService';
export type { Story, StoryGroup } from './storyService';
export type { Challenge, ChallengeHistory, ChallengeStats } from './challengeService';

