import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import { getFileUrl } from '../middleware/upload.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Storage mode: 'local' hoặc 'cloud'
 * Tự động detect dựa trên Cloudinary config
 */
export const getStorageMode = () => {
  return isCloudinaryConfigured() ? 'cloud' : 'local';
};

/**
 * Upload file (tự động chọn local hoặc cloud)
 * @param {Object} file - File object từ multer
 * @param {string} type - 'avatar' hoặc 'meal'
 * @returns {Promise<{url: string, filename: string, storage: string}>}
 */
export const uploadFile = async (file, type = 'avatar') => {
  const storageMode = getStorageMode();
  const folder = type === 'avatar' ? 'avatars' : 
                 (type === 'banner' ? 'banners' :
                 (type === 'meal-image' ? 'meal-images' : 
                 (type === 'comment-image' ? 'comment-images' :
                 (type === 'message-image' ? 'message-images' :
                 (type === 'message-voice' ? 'message-voices' :
                 (type === 'video' ? 'videos' :
                 (type === 'challenge-proof' ? 'challenge-proofs' : 'meal-images')))))));
  
  // Detect resource type từ mimetype
  const isVideo = file.mimetype && file.mimetype.startsWith('video/');
  const isAudio = file.mimetype && file.mimetype.startsWith('audio/');
  // For audio files (voice messages), ALWAYS use 'video' resource type
  // This allows Cloudinary to properly convert and serve audio files in m4a format
  // 'raw' type doesn't support format transformation/conversion well
  const resourceType = isVideo ? 'video' : (isAudio ? 'video' : 'image');

  if (storageMode === 'cloud') {
    // Upload lên Cloudinary
    console.log(`☁️ Uploading ${resourceType} to Cloudinary, folder:`, folder);
    
    // Cảnh báo về video size
    if (isVideo && file.size > 100 * 1024 * 1024) {
      console.warn('⚠️ Video lớn hơn 100MB - có thể tốn phí trên Cloudinary!');
    }
    
    const result = await uploadToCloudinary(file.buffer, folder, null, resourceType);
    console.log('☁️ Cloudinary upload result:', {
      url: result.url,
      public_id: result.public_id,
      resource_type: resourceType,
      size: result.bytes ? `${(result.bytes / 1024 / 1024).toFixed(2)}MB` : 'unknown',
      duration: result.duration ? `${result.duration}s` : 'N/A',
    });
    return {
      url: result.url, // secure_url từ Cloudinary
      filename: result.public_id, // Lưu public_id để có thể xóa sau
      storage: 'cloud',
      public_id: result.public_id,
      resource_type: resourceType,
    };
  } else {
    // Local storage - cần lưu file vào disk
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    const fs = await import('fs');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const uploadsDir = join(__dirname, '../../uploads');
    const targetDir = join(uploadsDir, folder);
    
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // For audio files, ensure .m4a extension for compatibility
    let ext = file.originalname.split('.').pop() || 'm4a';
    if (folder === 'message-voices' && !['m4a', 'aac', 'mp3'].includes(ext.toLowerCase())) {
      ext = 'm4a'; // Force m4a for voice messages
    }
    let prefix = 'file';
    if (folder === 'avatars') prefix = 'avatar';
    else if (folder === 'banners') prefix = 'banner';
    else if (folder === 'meal-images') prefix = 'meal';
    else if (folder === 'comment-images') prefix = 'comment';
    else if (folder === 'message-images') prefix = 'message-img';
    else if (folder === 'message-voices') prefix = 'message-voice';
    else if (folder === 'videos') prefix = 'video';
    
    const filename = `${prefix}-${uniqueSuffix}.${ext}`;
    const filePath = join(targetDir, filename);
    
    // Lưu file vào disk
    fs.writeFileSync(filePath, file.buffer);
    
    return {
      url: null, // Sẽ được set sau bằng getFileUrl
      filename: filename,
      storage: 'local',
      resource_type: resourceType,
    };
  }
};

/**
 * Lấy URL của file (tự động chọn local hoặc cloud)
 * @param {Object} req - Express request object
 * @param {string} filename - Filename hoặc public_id
 * @param {string} type - 'avatar' hoặc 'meal'
 * @param {string} storage - 'local' hoặc 'cloud' (optional, tự detect)
 * @returns {string} URL của file
 */
export const getFileUrlFromStorage = (req, filename, type = 'avatar', storage = null) => {
  if (!storage) {
    storage = getStorageMode();
  }

  if (storage === 'cloud') {
    // Nếu filename đã là URL đầy đủ (từ upload result)
    if (filename && filename.startsWith('http')) {
      return filename;
    }
    // Nếu là public_id, construct URL từ Cloudinary
    if (filename && !filename.startsWith('http')) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      
      // public_id từ Cloudinary đã bao gồm folder path (cookshare/avatars/xxxxx hoặc cookshare/meal-images/xxxxx)
      // Nên chỉ cần thêm base URL
      // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id} (for images)
      // Format: https://res.cloudinary.com/{cloud_name}/video/upload/{public_id} (for videos)
      // Format: https://res.cloudinary.com/{cloud_name}/video/upload/f_m4a/{public_id} (for audio - use video resource type with format transformation)
      // Note: All new audio files are uploaded as 'video' resource type for better format conversion support
      let resourceType = 'image';
      let transformation = '';
      if (type === 'video') {
        resourceType = 'video';
      } else if (type === 'message-voice') {
        // Use 'video' resource type for audio files (allows proper format conversion)
        resourceType = 'video';
        // Use format transformation to ensure m4a format
        // f_m4a = format m4a, q_auto = quality auto
        transformation = 'f_m4a,q_auto/'; // Force m4a format with auto quality
      }
      return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transformation}${filename}`;
    }
    return filename;
  } else {
    // Local storage - map type
    let fileType = type;
    if (type === 'meal-image') fileType = 'meal';
    else if (type === 'banner') fileType = 'banner';
    else if (type === 'comment-image') fileType = 'comment';
    else if (type === 'message-image') fileType = 'message-image';
    else if (type === 'message-voice') fileType = 'message-voice';
    else if (type === 'video') fileType = 'video';
    return getFileUrl(req, filename, fileType);
  }
};

/**
 * Xóa file (tự động chọn local hoặc cloud)
 * @param {string} filename - Filename hoặc public_id
 * @param {string} type - 'avatar' hoặc 'meal'
 * @param {string} storage - 'local' hoặc 'cloud' (optional, tự detect)
 * @returns {Promise}
 */
export const deleteFile = async (filename, type = 'avatar', storage = null) => {
  if (!storage) {
    storage = getStorageMode();
  }

  if (storage === 'cloud') {
    // Xóa từ Cloudinary
    try {
      await deleteFromCloudinary(filename);
      return true;
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      return false;
    }
  } else {
    // Xóa file local
    try {
      const folder = type === 'avatar' ? 'avatars' : 'meal-images';
      const filePath = join(__dirname, '../../uploads', folder, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting local file:', error);
      return false;
    }
  }
};

