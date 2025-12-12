import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file lên Cloudinary
 * @param {Buffer} fileBuffer - File buffer từ multer
 * @param {string} folder - Folder trên Cloudinary (avatars hoặc meal-images)
 * @param {string} publicId - Public ID cho file (optional)
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadToCloudinary = async (fileBuffer, folder, publicId = null, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `cookshare/${folder}`,
      resource_type: resourceType, // 'image', 'video', hoặc 'raw' (for audio)
      // For raw/audio files, we'll use format transformation in delivery URL
      // Don't set format in upload options for raw files
    };

    // Only add transformation for image and video
    if (resourceType === 'image') {
      uploadOptions.transformation = [
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ];
    } else if (resourceType === 'video') {
      // For video resource type (used for both videos and audio files)
      // Audio files will use format transformation in delivery URL
      uploadOptions.transformation = [
        { quality: 'auto' },
        { fetch_format: 'mp4' },
      ];
    }
    // Note: For audio files uploaded as 'video' resource type, we'll add f_m4a transformation in delivery URL

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            duration: result.duration, // For videos
            bytes: result.bytes, // File size
          });
        }
      })
      .end(fileBuffer);
  });
};

/**
 * Xóa file từ Cloudinary
 * @param {string} publicId - Public ID của file cần xóa
 * @returns {Promise}
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Kiểm tra xem Cloudinary đã được cấu hình chưa
 */
export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export default cloudinary;

