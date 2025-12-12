/**
 * Constants for CookShare Backend
 * Tập trung các giá trị cố định, dễ bảo trì và tìm kiếm
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Success/Error Messages
export const MESSAGES = {
  // Auth
  AUTH_REGISTER_SUCCESS: 'Đăng ký thành công',
  AUTH_LOGIN_SUCCESS: 'Đăng nhập thành công',
  AUTH_EMAIL_EXISTS: 'Email đã tồn tại',
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  AUTH_MISSING_FIELDS: 'Vui lòng điền đầy đủ thông tin',
  AUTH_UNAUTHORIZED: 'Vui lòng đăng nhập',
  AUTH_INVALID_TOKEN: 'Token không hợp lệ',

  // User Profile
  PROFILE_GET_SUCCESS: 'Lấy thông tin thành công',
  PROFILE_UPDATE_SUCCESS: 'Cập nhật thành công',
  PROFILE_NOT_FOUND: 'Không tìm thấy thông tin người dùng',
  AVATAR_UPLOAD_SUCCESS: 'Cập nhật avatar thành công',
  AVATAR_MISSING_FILE: 'Vui lòng chọn ảnh',
  PASSWORD_CHANGE_SUCCESS: 'Đổi mật khẩu thành công',
  PASSWORD_CURRENT_WRONG: 'Mật khẩu hiện tại không đúng',

  // Meal Planning
  MEAL_ADD_SUCCESS: 'Đã thêm món ăn vào lịch',
  MEAL_UPDATE_SUCCESS: 'Đã cập nhật món ăn',
  MEAL_DELETE_SUCCESS: 'Đã xóa món ăn',
  MEAL_MISSING_INFO: 'Vui lòng điền đầy đủ thông tin',
  MEAL_PLAN_GET_SUCCESS: 'Lấy lịch ăn thành công',
  MEAL_PLAN_GENERATE_SUCCESS: 'AI đã tạo lịch ăn thành công',

  // Chatbot
  CHATBOT_MISSING_MESSAGE: 'Vui lòng nhập tin nhắn',
  CHATBOT_ERROR: 'Có lỗi xảy ra khi gửi tin nhắn',
  CHATBOT_NO_API_KEY: 'OpenAI API key chưa được cấu hình',

  // Recipe
  RECIPE_UPLOAD_SUCCESS: 'Upload thành công',
  RECIPE_DELETE_SUCCESS: 'Đã xóa ảnh',
  RECIPE_MISSING_IMAGE: 'Vui lòng chọn ảnh',

  // General
  SERVER_ERROR: 'Có lỗi xảy ra',
  SUCCESS: 'Thành công',
  INVALID_REQUEST: 'Yêu cầu không hợp lệ',
};

// Meal Types
export const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
};

// Diet Modes
export const DIET_MODES = {
  NONE: 'none',
  LOSE_WEIGHT: 'lose_weight',    // Giảm cân
  GAIN_WEIGHT: 'gain_weight',    // Tăng cân
  GAIN_MUSCLE: 'gain_muscle',    // Tăng cơ
  VEGETARIAN: 'vegetarian',      // Chay
  VEGAN: 'vegan',                // Thuần chay
  KETO: 'keto',                  // Keto
  LOW_CARB: 'low_carb',          // Low-carb
  HEALTHY: 'healthy',            // Healthy
};

// File Upload
export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  FOLDERS: {
    AVATARS: 'profile_avatars',
    MEALS: 'meals',
    RECIPES: 'recipes',
  },
};

// OpenAI
export const OPENAI = {
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  MAX_HISTORY_MESSAGES: 20, // Giới hạn lịch sử chat gửi lên OpenAI
  TIMEOUT: 60000, // 60 seconds
};

// JWT
export const JWT = {
  EXPIRES_IN: '30d', // Token hết hạn sau 30 ngày
};

// Database
export const DB = {
  COLLECTIONS: {
    USERS: 'users',
    MEAL_PLANS: 'meal_plans',
    RECIPES: 'recipes',
  },
};

// Regex Patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{10,11}$/,
  PASSWORD: /^.{6,}$/, // Ít nhất 6 ký tự
};

// Validation Rules
export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 6,
  BIO_MAX_LENGTH: 200,
};

// Time Formats
export const TIME_FORMAT = {
  DATE_ONLY: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME_ONLY: 'HH:mm',
};

export default {
  HTTP_STATUS,
  MESSAGES,
  MEAL_TYPES,
  DIET_MODES,
  UPLOAD,
  OPENAI,
  JWT,
  DB,
  REGEX,
  VALIDATION,
  TIME_FORMAT,
};

