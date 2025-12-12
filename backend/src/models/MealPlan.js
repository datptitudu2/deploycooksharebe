import { connectToDatabase } from '../config/database.js';

const COLLECTION_NAME = 'meal_plans';

export class MealPlan {
  static async create(userId, mealPlanData) {
    const { db } = await connectToDatabase();
    const result = await db.collection(COLLECTION_NAME).insertOne({
      userId,
      ...mealPlanData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result;
  }

  static async findByUserId(userId) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME)
      .find({ userId })
      .sort({ date: 1 })
      .toArray();
  }

  static async findByDate(userId, date) {
    const { db } = await connectToDatabase();
    return await db.collection(COLLECTION_NAME).findOne({
      userId,
      date,
    });
  }

  static async update(userId, date, updateData) {
    const { db } = await connectToDatabase();
    
    // Đảm bảo các meal detail có isCooked = false mặc định nếu chưa được set
    const processedData = { ...updateData };
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    for (const mealType of mealTypes) {
      const detailKey = `${mealType}Detail`;
      if (processedData[detailKey] && processedData[detailKey].isCooked === undefined) {
        processedData[detailKey] = {
          ...processedData[detailKey],
          isCooked: false,
        };
      }
    }
    
    return await db.collection(COLLECTION_NAME).updateOne(
      { userId, date },
      {
        $set: {
          ...processedData,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Mark meal as cooked
   */
  static async markMealAsCooked(userId, date, mealType) {
    const { db } = await connectToDatabase();
    const dateStr = typeof date === 'string' ? date : date.toString();
    
    // Lấy meal plan hiện tại
    const mealPlan = await this.findByDate(userId, dateStr);
    
    if (!mealPlan || !mealPlan[mealType]) {
      throw new Error('Không tìm thấy món ăn');
    }
    
    // Kiểm tra xem mealType là string hay object
    const currentMeal = mealPlan[mealType];
    
    // Xác định mealName và mealDetail
    let mealName;
    let mealDetail;
    
    if (typeof currentMeal === 'string') {
      // Nếu là string, convert thành object
      mealName = currentMeal;
      mealDetail = { name: currentMeal, isCooked: false };
    } else if (typeof currentMeal === 'object' && currentMeal !== null) {
      // Nếu đã là object, giữ nguyên structure
      mealName = currentMeal.name || mealPlan[mealType] || '';
      mealDetail = {
        ...currentMeal,
        name: currentMeal.name || mealName,
        isCooked: currentMeal.isCooked || false,
      };
    } else {
      throw new Error(`Invalid meal data type for ${mealType}`);
    }
    
    // Chỉ update nếu chưa được mark
    if (!mealDetail.isCooked) {
      // Update với structure đúng: mealType là object có name, isCooked, cookedAt
      const updateData = {
        [mealType]: {
          ...mealDetail,
          name: mealName,
          isCooked: true,
          cookedAt: new Date(),
        },
        updatedAt: new Date(),
      };
      
      await db.collection(COLLECTION_NAME).updateOne(
        { userId, date: dateStr },
        { $set: updateData }
      );
      return true;
    }
    
    return false; // Đã được mark rồi
  }

  /**
   * Đếm số món đã nấu của user
   */
  static async countCookedMeals(userId) {
    const { db } = await connectToDatabase();
    
    const mealPlans = await db.collection(COLLECTION_NAME)
      .find({ userId })
      .toArray();
    
    let count = 0;
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    mealPlans.forEach(plan => {
      mealTypes.forEach(type => {
        if (plan[type] && plan[type].isCooked) {
          count++;
        }
      });
    });
    
    return count;
  }

  static async delete(userId, date, mealType) {
    const { db } = await connectToDatabase();
    
    // Ensure date is in correct format
    const dateStr = typeof date === 'string' ? date : date.toString();
    
    const updateData = { 
      $unset: { [mealType]: '' }, 
      $set: { updatedAt: new Date() }
    };
    
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { userId, date: dateStr },
      updateData
    );
    
    return result;
  }
}

