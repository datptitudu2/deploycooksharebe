import { MealPlan } from '../models/MealPlan.js';
import { uploadFile, getFileUrlFromStorage, deleteFile } from '../utils/storage.js';

/**
 * Upload ảnh món ăn cho meal plan
 */
export const uploadMealImage = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { date, mealType } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp date và mealType',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh',
      });
    }

    // Lấy meal plan hiện tại
    const mealPlan = await MealPlan.findByDate(userId, date);
    
    // Xóa ảnh cũ nếu có
    if (mealPlan && mealPlan[`${mealType}Image`]) {
      const oldStorage = mealPlan.storage || 'local';
      await deleteFile(mealPlan[`${mealType}Image`], 'meal', oldStorage);
    }

    // Upload ảnh mới (tự động chọn local hoặc cloud)
    const uploadResult = await uploadFile(req.file, 'meal');
    
    // Lấy URL đầy đủ
    const imageUrl = uploadResult.storage === 'cloud' 
      ? uploadResult.url 
      : getFileUrlFromStorage(req, uploadResult.filename, 'meal', uploadResult.storage);
    const updateData = {
      [`${mealType}Image`]: uploadResult.filename,
      storage: uploadResult.storage, // Lưu storage mode
    };

    await MealPlan.update(userId, date, updateData);

    res.json({
      success: true,
      message: 'Upload ảnh món ăn thành công',
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Upload meal image error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi upload ảnh món ăn',
    });
  }
};

/**
 * Xóa ảnh món ăn
 */
export const deleteMealImage = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { date, mealType } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp date và mealType',
      });
    }

    const mealPlan = await MealPlan.findByDate(userId, date);
    if (!mealPlan || !mealPlan[`${mealType}Image`]) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ảnh để xóa',
      });
    }

    // Xóa file (tự động chọn local hoặc cloud)
    const storage = mealPlan.storage || 'local';
    await deleteFile(mealPlan[`${mealType}Image`], 'meal', storage);

    // Xóa reference trong database
    const updateData = {
      $unset: { [`${mealType}Image`]: '' },
    };
    await MealPlan.update(userId, date, updateData);

    res.json({
      success: true,
      message: 'Xóa ảnh món ăn thành công',
    });
  } catch (error) {
    console.error('Delete meal image error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa ảnh món ăn',
    });
  }
};

