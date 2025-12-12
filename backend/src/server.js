/**
 * ============================================
 * COOKSHARE BACKEND - MAIN SERVER FILE
 * ============================================
 * 
 * Cấu trúc:
 * 1. Imports & Configuration
 * 2. Middleware Setup
 * 3. API Routes (Module-based)
 * 4. Error Handling
 * 5. Server Start
 * 
 * Xem chi tiết: BACKEND_STRUCTURE.md, API_ENDPOINTS.md
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Config
import { connectToDatabase } from './config/database.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import mealPlanningRoutes from './routes/mealPlanningRoutes.js';
import userRoutes from './routes/userRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import recipeManagementRoutes from './routes/recipeManagementRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';

// ============================================
// CONFIGURATION
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE SETUP
// ============================================

// CORS - Cho phép frontend kết nối
app.use(cors());

// Body Parser - Parse JSON và URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files - Serve uploaded files (images, videos, audio)
app.use('/uploads', express.static(join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    // Set proper content type for audio files
    if (path.endsWith('.m4a') || path.endsWith('.aac')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (path.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (path.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    }
    // Enable CORS for audio files
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

// Request Logger (Development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// DATABASE CONNECTION
// ============================================

connectToDatabase()
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1); // Exit nếu không kết nối được database
  });

// ============================================
// API ROUTES - Module-based Architecture
// ============================================
// 
// Mỗi module độc lập, có thể phát triển song song bởi team members khác nhau
// Xem chi tiết endpoints trong: API_ENDPOINTS.md
//

// Module 1: Authentication
// - Đăng ký, đăng nhập
// - Endpoints: POST /api/auth/register, /login
app.use('/api/auth', authRoutes);

// Module 2: User Profile & Management
// - Xem/sửa profile, upload avatar, đổi password
// - Endpoints: GET/PUT /api/user/profile, POST /api/user/avatar
app.use('/api/user', userRoutes);

// Module 3: AI Chatbot
// - Chat với AI, gợi ý món ăn, AI vision
// - Endpoints: POST /api/chatbot/message, /message-with-image
app.use('/api/chatbot', chatbotRoutes);

// Module 4: Meal Planning
// - Lịch ăn, AI tạo lịch tự động
// - Endpoints: GET/POST/PUT/DELETE /api/meal-planning/*
app.use('/api/meal-planning', mealPlanningRoutes);

// Module 5: Recipe Images (Meal Planning)
// - Upload/xóa ảnh cho meal planning
// - Endpoints: POST/DELETE /api/recipes/meal-image
app.use('/api/recipes', recipeRoutes);

// Module 6: Recipe Management (CRUD)
// - Tạo/sửa/xóa/xem công thức, rating
// - Endpoints: GET/POST/PUT/DELETE /api/recipe-management/*
app.use('/api/recipe-management', recipeManagementRoutes);

// Module 7: Achievements & Stats
// - Thành tích, chuỗi, badges, stats
// - Endpoints: GET /api/achievements/*
app.use('/api/achievements', achievementRoutes);

// Module 8: Messaging
// - Chat giữa users, conversations
// - Endpoints: POST /api/messages/send, GET /api/messages/conversations, /conversation/:partnerId
app.use('/api/messages', messageRoutes);

// Module 9: Notifications
// - Thông báo: comment, rating, like, follow, reply
// - Endpoints: GET /api/notifications, PUT /api/notifications/:id/read
app.use('/api/notifications', notificationRoutes);

// Module 10: Stories
// - Cooking stories, tips
// - Endpoints: GET /api/stories, POST /api/stories
app.use('/api/stories', storyRoutes);

// Module 11: Daily Challenges
// - Thử thách hàng ngày, gamification
// - Endpoints: GET /api/challenges/today, POST /api/challenges/join
app.use('/api/challenges', challengeRoutes);

// ============================================
// HEALTH CHECK & INFO
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: 'connected',
    version: '1.0.0',
    message: 'CookShare API is running',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      chatbot: '/api/chatbot',
      mealPlanning: '/api/meal-planning',
      recipes: '/api/recipes',
      recipeManagement: '/api/recipe-management',
      achievements: '/api/achievements',
      messages: '/api/messages',
    },
    documentation: {
      structure: 'BACKEND_STRUCTURE.md',
      api: 'API_ENDPOINTS.md',
    }
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🍳 Welcome to CookShare API',
    version: '1.0.0',
    healthCheck: '/api/health',
    documentation: {
      structure: 'BACKEND_STRUCTURE.md',
      endpoints: 'API_ENDPOINTS.md',
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler - Route không tồn tại
app.use(notFoundHandler);

// Global Error Handler - Xử lý tất cả lỗi
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('🍳 CookShare Backend Server');
  console.log('============================================');
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`📁 Uploads directory: ${join(__dirname, '../uploads')}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log(' Documentation:');
  console.log('   - API Endpoints: API_ENDPOINTS.md');
  console.log('');
  console.log(' Modules:');
  console.log('   [1] Authentication         → /api/auth');
  console.log('   [2] User Profile           → /api/user');
  console.log('   [3] AI Chatbot             → /api/chatbot');
  console.log('   [4] Meal Planning          → /api/meal-planning');
  console.log('   [5] Recipe Images          → /api/recipes');
  console.log('   [6] Recipe Management      → /api/recipe-management');
  console.log('   [7] Achievements & Stats   → /api/achievements');
  console.log('============================================');
  console.log('');
});

