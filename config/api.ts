import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Cấu hình API URL
 * 
 * ⚠️ QUAN TRỌNG: File này ảnh hưởng đến TOÀN BỘ app (41+ vị trí sử dụng)
 * 
 * Development: Tự động detect IP từ Expo hoặc sử dụng localhost/emulator
 * Production: Sử dụng production API URL từ environment variable hoặc hardcode
 * 
 * 📋 TRƯỚC KHI BUILD PRODUCTION:
 * 1. Đảm bảo backend đã deploy và có HTTPS
 * 2. Chọn một trong hai cách:
 *    - Cách 1 (KHUYẾN NGHỊ): Tạo file .env và thêm:
 *      EXPO_PUBLIC_API_URL=https://your-api-domain.com/api
 *    - Cách 2: Thay đổi PRODUCTION_API_URL bên dưới thành URL thật
 * 
 * 📖 Xem chi tiết: API_CONFIG_GUIDE.md
 */

// Production API URL - ⚠️ THAY ĐỔI URL NÀY THÀNH URL THẬT CỦA BẠN TRƯỚC KHI BUILD PRODUCTION
// Ví dụ: 'https://api.cookshare.com/api' hoặc 'https://cookshare-api.herokuapp.com/api'
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-production-api.com/api';

// Development IP - chỉ dùng khi test trên thiết bị thật (KHÔNG ảnh hưởng production)
const YOUR_COMPUTER_IP = '192.168.1.126'; // ⬅️ IP của máy tính (Wi-Fi) - chỉ dùng trong development

export const getApiUrl = () => {
  // Production build
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }
  
  // Development mode
  // Tự động detect IP từ Expo (nếu có)
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost && debuggerHost !== 'localhost' && debuggerHost !== '127.0.0.1') {
    return `http://${debuggerHost}:3000/api`;
  }
  
  // Android Emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }
  
  // iOS Simulator hoặc thiết bị thật (cần set IP)
  return `http://${YOUR_COMPUTER_IP}:3000/api`;
};

export const API_URL = getApiUrl();

