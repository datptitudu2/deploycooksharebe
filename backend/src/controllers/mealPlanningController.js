import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MealPlan } from '../models/MealPlan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Lazy initialization - chỉ khởi tạo khi cần dùng
let openai = null;
const getOpenAIClient = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

const MEAL_PLANNING_PROMPT = `Bạn là AI chuyên tư vấn lịch món ăn cho 1 tuần. 

Nhiệm vụ:
1. Tạo lịch món ăn đa dạng, cân bằng dinh dưỡng cho 7 ngày
2. Mỗi ngày có: sáng, trưa, tối, xế (nếu cần)
3. Trả về JSON format:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "breakfast": "Tên món",
      "lunch": "Tên món",
      "dinner": "Tên món",
      "snack": "Tên món (optional)"
    }
  ]
}

4. Món ăn có thể trùng sau vài ngày (ví dụ: cùng một món có thể xuất hiện lại sau 3-4 ngày)
5. Ưu tiên món Việt Nam nhưng có thể mix món quốc tế
6. Cân bằng dinh dưỡng, đủ chất`;

const REGION_PROMPTS = {
  'mien-bac': 'Ưu tiên các món ăn đặc trưng miền Bắc Việt Nam (ví dụ: Phở, Bún chả, Bánh cuốn, Chả cá Lã Vọng).',
  'mien-trung': 'Ưu tiên các món ăn đặc trưng miền Trung Việt Nam (ví dụ: Bún bò Huế, Mì Quảng, Cao lầu, Bánh xèo miền Trung).',
  'mien-nam': 'Ưu tiên các món ăn đặc trưng miền Nam Việt Nam (ví dụ: Cơm tấm, Hủ tiếu, Bánh mì Sài Gòn, Lẩu mắm).',
  'chau-a': 'Ưu tiên các món ăn Châu Á (ví dụ: Pad Thai, Ramen, Kimchi, Sushi, Cà ri Thái).',
  'chau-au': 'Ưu tiên các món ăn Châu Âu (ví dụ: Pasta, Pizza, Paella, Ratatouille, Fish and Chips).',
  'chau-my': 'Ưu tiên các món ăn Châu Mỹ (ví dụ: Tacos, Burritos, BBQ Ribs, Burgers, Hot Dogs).',
  'da-dang': 'Đa dạng các món ăn từ nhiều vùng miền và quốc gia khác nhau.',
};

export const generateWeekPlan = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { preferences, startDate, days = 7, region = 'mien-bac' } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key chưa được cấu hình',
      });
    }

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date();
    const numDays = Math.min(Math.max(days, 1), 14); // 1-14 days
    
    const dates = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Build prompt with region preference
    let prompt = MEAL_PLANNING_PROMPT;
    if (region && REGION_PROMPTS[region]) {
      prompt += `\n\n7. Khẩu vị vùng miền: ${REGION_PROMPTS[region]}`;
    }
    if (preferences) {
      prompt += `\n\nYêu cầu đặc biệt: ${preferences}`;
    }

    const client = getOpenAIClient();
    if (!client) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key chưa được cấu hình. Tính năng AI generate meal plan cần OpenAI API key.',
      });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Tạo lịch món ăn cho ${numDays} ngày với các ngày cụ thể sau: ${dates.join(', ')}. Trả về JSON format như yêu cầu với đúng các date đã cho.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    let planData;

    try {
      planData = JSON.parse(response);
    } catch (e) {
      // Fallback với dates đã tính
      planData = {
        plan: dates.map(date => ({
          date,
          breakfast: 'Phở bò',
          lunch: 'Cơm tấm sườn',
          dinner: 'Bún chả',
          snack: 'Bánh mì'
        })),
      };
    }

    // Ensure dates are correct (in case AI returns wrong dates)
    if (planData.plan && planData.plan.length > 0) {
      planData.plan = planData.plan.map((plan, index) => ({
        ...plan,
        date: dates[index] || plan.date
      }));
    }

    // Save to database if user is logged in
    if (userId && planData.plan) {
      for (const dayPlan of planData.plan) {
        await MealPlan.update(userId, dayPlan.date, {
          breakfast: dayPlan.breakfast,
          lunch: dayPlan.lunch,
          dinner: dayPlan.dinner,
          snack: dayPlan.snack,
        });
      }
      
      // Fetch saved plans to return
      const savedPlans = await MealPlan.findByUserId(userId);
      const sortedPlans = savedPlans.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      res.json({
        success: true,
        plan: sortedPlans || planData.plan || [],
        generated: planData.plan?.length || 0,
      });
    } else {
      res.json({
        success: true,
        plan: planData.plan || [],
        generated: planData.plan?.length || 0,
      });
    }
  } catch (error) {
    console.error('Generate week plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi tạo lịch món ăn',
    });
  }
};

export const addMeal = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { date, mealType, mealName, mealTime, mealDetail } = req.body;

    if (!date || !mealType || !mealName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const updateData = {
      [mealType]: mealName,
    };
    
    // Save custom time if provided
    if (mealTime) {
      updateData[`${mealType}Time`] = mealTime;
    }

    // Save meal detail if provided
    if (mealDetail) {
      // Đảm bảo isCooked = false mặc định nếu chưa được set
      updateData[`${mealType}Detail`] = {
        ...mealDetail,
        isCooked: mealDetail.isCooked !== undefined ? mealDetail.isCooked : false,
        cookingStartTime: mealDetail.cookingStartTime || null, // Thời gian bắt đầu nấu
        expectedTime: mealDetail.expectedTime || null, // Thời gian dự kiến (phút)
      };
    }

    await MealPlan.update(userId, date, updateData);

    res.json({
      success: true,
      message: 'Đã thêm món ăn vào lịch',
    });
  } catch (error) {
    console.error('Add meal error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra',
    });
  }
};

export const updateMeal = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { date, mealType, mealDetail } = req.body;

    if (!date || !mealType || !mealDetail || !mealDetail.name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const updateData = {
      [mealType]: mealDetail.name,
      [`${mealType}Time`]: mealDetail.time,
      [`${mealType}Detail`]: {
        ...mealDetail,
        // Đảm bảo isCooked = false mặc định nếu chưa được set
        isCooked: mealDetail.isCooked !== undefined ? mealDetail.isCooked : false,
        cookingStartTime: mealDetail.cookingStartTime || null, // Thời gian bắt đầu nấu
        expectedTime: mealDetail.expectedTime || null, // Thời gian dự kiến (phút)
      },
    };

    await MealPlan.update(userId, date, updateData);

    res.json({
      success: true,
      message: 'Đã cập nhật món ăn',
    });
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra',
    });
  }
};

export const getWeekPlan = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const plans = await MealPlan.findByUserId(userId);
    
    // Đảm bảo tất cả meal detail có isCooked = false mặc định nếu chưa được set
    const processedPlans = plans.map(plan => {
      const processed = { ...plan };
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      for (const mealType of mealTypes) {
        const detailKey = `${mealType}Detail`;
        if (processed[detailKey] && processed[detailKey].isCooked === undefined) {
          processed[detailKey] = {
            ...processed[detailKey],
            isCooked: false,
          };
        }
      }
      
      return processed;
    });

    res.json({
      success: true,
      plan: processedPlans,
    });
  } catch (error) {
    console.error('Get week plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra',
    });
  }
};

/**
 * Start cooking timer
 */
export const startCookingTimer = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { date, mealType, expectedTime } = req.body;

    if (!date || !mealType || !expectedTime) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    // Get current meal plan
    const plans = await MealPlan.findByUserId(userId);
    const currentPlan = plans.find(p => p.date === date);
    
    if (!currentPlan) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch ăn',
      });
    }

    const mealDetail = currentPlan[`${mealType}Detail`] || {};
    
    // Update with cooking start time
    const updateData = {
      [`${mealType}Detail`]: {
        ...mealDetail,
        cookingStartTime: new Date().toISOString(),
        expectedTime: parseInt(expectedTime),
      },
    };

    await MealPlan.update(userId, date, updateData);

    res.json({
      success: true,
      message: 'Đã bắt đầu timer nấu ăn',
      cookingStartTime: updateData[`${mealType}Detail`].cookingStartTime,
    });
  } catch (error) {
    console.error('Start cooking timer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra',
    });
  }
};

