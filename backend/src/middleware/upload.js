import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tạo thư mục uploads nếu chưa có
const uploadsDir = join(__dirname, '../../uploads');
const avatarDir = join(uploadsDir, 'avatars');
const bannersDir = join(uploadsDir, 'banners');
const mealImagesDir = join(uploadsDir, 'meal-images');
const commentImagesDir = join(uploadsDir, 'comment-images');
const videosDir = join(uploadsDir, 'videos');
const messageImagesDir = join(uploadsDir, 'message-images');
const messageVoicesDir = join(uploadsDir, 'message-voices');
const challengeProofDir = join(uploadsDir, 'challenge-proofs');

[uploadsDir, avatarDir, bannersDir, mealImagesDir, commentImagesDir, videosDir, messageImagesDir, messageVoicesDir, challengeProofDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Cấu hình storage cho avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `avatar-${uniqueSuffix}.${ext}`);
  },
});

// Cấu hình storage cho ảnh món ăn
const mealImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mealImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `meal-${uniqueSuffix}.${ext}`);
  },
});

// File filter - chỉ cho phép ảnh
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh!'), false);
  }
};

// File filter - cho phép cả ảnh và video
const mediaFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh hoặc video!'), false);
  }
};

// Combined upload middleware - cho phép cả images và videos
export const uploadRecipeMedia = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB - max cho video
  },
  fileFilter: mediaFilter,
});

// Multer instances
// Sử dụng memory storage để có thể upload lên cloud hoặc local
export const uploadAvatar = multer({
  storage: multer.memoryStorage(), // Dùng memory để có thể upload lên cloud
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

export const uploadMealImage = multer({
  storage: multer.memoryStorage(), // Dùng memory để có thể upload lên cloud
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: imageFilter,
});

// Memory storage cho chatbot (giữ nguyên)
export const uploadChatbotImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: imageFilter,
});

// Memory storage cho comment image
export const uploadCommentImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

// Memory storage cho video upload (recipe videos)
export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB - Cloudinary free tier limit
  },
  fileFilter: mediaFilter, // Cho phép video
});

// Memory storage cho challenge proof image
export const uploadChallengeProof = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: imageFilter,
});

// Helper function để lấy URL của file
export const getFileUrl = (req, filename, type = 'avatar') => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (type === 'avatar') {
    return `${baseUrl}/uploads/avatars/${filename}`;
  } else if (type === 'banner') {
    return `${baseUrl}/uploads/banners/${filename}`;
  } else if (type === 'meal' || type === 'meal-image') {
    return `${baseUrl}/uploads/meal-images/${filename}`;
  } else if (type === 'comment' || type === 'comment-image') {
    return `${baseUrl}/uploads/comment-images/${filename}`;
  } else if (type === 'message-image') {
    return `${baseUrl}/uploads/message-images/${filename}`;
  } else if (type === 'message-voice') {
    return `${baseUrl}/uploads/message-voices/${filename}`;
  } else if (type === 'video') {
    return `${baseUrl}/uploads/videos/${filename}`;
  } else if (type === 'challenge-proof') {
    return `${baseUrl}/uploads/challenge-proofs/${filename}`;
  }
  return null;
};

