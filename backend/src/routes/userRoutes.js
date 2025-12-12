import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadAvatar as uploadAvatarMiddleware, getFileUrl } from '../middleware/upload.js';
import {
  getProfile,
  updateProfile,
  uploadUserAvatar,
  getAllChefs,
  getAllUsers,
  getUserById,
  toggleFollow,
  getFollowers,
  getFollowing,
  updateLastSeen,
  changePassword,
} from '../controllers/userController.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authenticate);

// GET /api/user/profile - Lấy thông tin profile
router.get('/profile', getProfile);

// PUT /api/user/profile - Cập nhật thông tin profile
router.put('/profile', updateProfile);

// POST /api/user/change-password - Đổi mật khẩu
router.post('/change-password', changePassword);

// POST /api/user/avatar - Upload avatar
router.post('/avatar', uploadAvatarMiddleware.single('avatar'), uploadUserAvatar);

// GET /api/user/chefs - Lấy danh sách tất cả chefs
router.get('/chefs', getAllChefs);

// GET /api/user/users - Lấy danh sách tất cả users (cho chef)
router.get('/users', getAllUsers);

// GET /api/user/followers - Lấy danh sách followers của user hiện tại
router.get('/followers', getFollowers);

// GET /api/user/following - Lấy danh sách following của user hiện tại
router.get('/following', getFollowing);

// PUT /api/user/lastSeen - Cập nhật lastSeen (gọi khi user online)
router.put('/lastSeen', updateLastSeen);

// POST /api/user/:userId/follow - Follow/Unfollow user (phải đặt trước /:userId)
router.post('/:userId/follow', toggleFollow);

// GET /api/user/:userId - Lấy thông tin user theo ID (phải đặt sau các route cụ thể)
router.get('/:userId', getUserById);

export default router;

