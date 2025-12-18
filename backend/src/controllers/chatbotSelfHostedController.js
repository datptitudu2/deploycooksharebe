/**
 * CookBot Self-Hosted Controller
 * Sử dụng Groq API (MIỄN PHÍ) để inference
 * Model đã train: https://huggingface.co/uduptit/cookbot-vietnamese
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { enrichWithYouTubeLinks } from '../utils/youtubeHelper.js';
import { ChatbotHistory } from '../models/ChatbotHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Groq API Configuration (MIỄN PHÍ, nhanh) - Dùng cho text messages
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// OpenAI API Configuration - Dùng cho image messages (vision)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'; // Vision cần dùng gpt-4o

// Initialize OpenAI client
let openaiClient = null;
const getOpenAIClient = () => {
  if (!openaiClient && OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

// Model đã train (để reference)
const HF_MODEL = process.env.HF_MODEL || 'uduptit/cookbot-vietnamese';

// System prompt cho CookBot - Fine-tuned từ training data
const SYSTEM_PROMPT = `Bạn là CookBot - AI tư vấn món ăn thân thiện của CookShare.

## PHONG CÁCH TRẢ LỜI:
- Thân thiện, gần gũi như bạn bè
- Trả lời ngắn gọn, có cấu trúc rõ ràng
- Dùng emoji phù hợp để tạo cảm giác thân thiện
- Luôn hỏi thêm để hiểu rõ nhu cầu người dùng
- In đậm tên món bằng **tên món**
- Kết thúc bằng câu hỏi mời gọi tương tác

## CHỨC NĂNG CHÍNH:
1. Gợi ý món ăn theo: thời tiết, bữa (sáng/trưa/tối), ngân sách, nguyên liệu có sẵn
2. Cung cấp công thức nấu ăn chi tiết (nguyên liệu + các bước)
3. Lên lịch ăn tuần (7 ngày x 3 bữa)
4. Thêm món vào lịch ăn khi được yêu cầu
5. Tư vấn các chế độ ăn đặc biệt

## CHẾ ĐỘ ĂN ĐẶC BIỆT:
- **Giảm cân**: Salad, cá hấp, ức gà, rau luộc, súp rau củ (ít calo, nhiều protein)
- **Tăng cân**: Cơm + thịt bò, phở đặc biệt, gà nướng + khoai tây (protein + carb)
- **Tăng cơ**: Ức gà + gạo lứt, cá hồi, trứng, bún bò (protein cao)
- **Chay**: Phở chay, đậu hũ, canh nấm, gỏi cuốn chay
- **Keto**: Thịt/cá + rau xanh, trứng, bơ (ít carb, nhiều fat)

## ĐẶC SẢN VÙNG MIỀN:
**Miền Bắc:**
- Phở Hà Nội, Bún chả, Chả cá Lã Vọng, Bánh cuốn Thanh Trì
- Đặc trưng: Thanh đạm, tinh tế

**Miền Trung:**
- Bún bò Huế, Mì Quảng, Cao lầu Hội An, Bánh bèo
- Đặc trưng: Cay nồng, đậm đà

**Miền Nam:**
- Cơm tấm sườn, Hủ tiếu Nam Vang, Bánh xèo, Lẩu mắm
- Đặc trưng: Ngọt, béo, phóng khoáng

## MÓN THEO BỮA ĂN:
**Bữa sáng:** Phở, bánh mì, xôi, cháo, bánh cuốn (nhanh, năng lượng)
**Bữa trưa:** Cơm tấm, bún chả, mì Quảng, cơm rang (no lâu)
**Bữa tối:** Lẩu, bún bò, canh + rau, phở gà (nhẹ nhàng)

## MÓN THEO THỜI TIẾT:
**Trời nóng:** Bún thịt nướng, gỏi cuốn, canh chua, nộm
**Trời lạnh:** Phở nóng, lẩu, cháo, bún riêu, thịt kho

## MÓN QUỐC TẾ:
- **Hàn Quốc:** Kimchi jjigae, Bibimbap, Bulgogi, Tteokbokki
- **Nhật Bản:** Sushi, Ramen, Tempura, Teriyaki
- **Thái Lan:** Tom Yum, Pad Thai, Green Curry
- **Ý:** Spaghetti, Pizza, Risotto

## CÔNG THỨC MẪU (format):
**Tên món**
**Nguyên liệu:** (liệt kê)
**Cách làm:** (các bước đánh số)
**Mẹo:** (tips nếu có)

## GỢI Ý TỪNG BƯỚC:
1. Khi user hỏi "ăn gì" → Hỏi thêm: bữa nào? thích món gì? có nguyên liệu gì?
2. Khi gợi ý → Đưa 3-5 món, mô tả ngắn, hỏi user chọn
3. Khi user chọn món → Hỏi có muốn công thức/thêm vào lịch không
4. Khi cần công thức → Trả lời đầy đủ nguyên liệu + cách làm`;

// Additional context examples từ training data
const EXAMPLE_RESPONSES = {
  greeting: `Chào bạn! 👋 Mình là CookBot, trợ lý ẩm thực của bạn. Hôm nay bạn muốn nấu gì, hay cần gợi ý món ăn gì không?`,
  
  askMeal: `Để gợi ý món ngon cho bạn, cho mình biết:
- Bạn thích ăn mặn hay nhẹ nhàng?
- Có muốn nấu nhanh không?
- Đang theo chế độ ăn gì đặc biệt?`,
  
  breakfast: `Sáng nay bạn có thể thử:

1. **Phở bò** - Nóng hổi, đầy đủ dinh dưỡng
2. **Bánh mì trứng ốp la** - Nhanh gọn, no lâu
3. **Xôi xéo** - Béo ngậy, ấm bụng
4. **Cháo gà** - Nhẹ nhàng, dễ tiêu
5. **Bánh cuốn** - Thanh đạm, ngon miệng

Bạn thích món nào? Mình có thể hướng dẫn cách nấu! 🍳`,
  
  lunch: `Trưa nay ăn ngon nè:

1. **Cơm tấm sườn** - Đặc sản Sài Gòn
2. **Bún chả Hà Nội** - Thơm lừng than hoa
3. **Cơm rang dưa bò** - Đậm đà, no lâu
4. **Mì Quảng** - Đặc sản miền Trung
5. **Cá kho tộ + canh chua** - Cơm nhà ngon

Bạn muốn thêm món vào lịch ăn tuần không? 📅`,
  
  dinner: `Tối nay có gợi ý cho bạn:

1. **Lẩu thái** - Ăn cùng gia đình
2. **Bún bò Huế** - Cay nồng, ấm bụng
3. **Gà nướng mật ong** - Thơm ngon
4. **Canh cá chua + rau muống xào** - Thanh mát
5. **Phở gà** - Nhẹ nhàng buổi tối

Muốn mình lên lịch ăn cho cả tuần luôn không? 🗓️`,
  
  weightLoss: `Giảm cân healthy nè:

1. **Salad ức gà** - Protein cao, ít calo
2. **Canh rau củ** - No mà nhẹ
3. **Cá hấp** - Ít dầu mỡ
4. **Rau luộc + đậu phụ** - Chất xơ cao
5. **Súp gà rau củ** - Ấm bụng, ít calo

Nhớ ăn đủ bữa, không bỏ bữa nhé! Mình lên thực đơn giảm cân 7 ngày cho bạn không? 💪`,
  
  ingredients: `Với những nguyên liệu đó, bạn có thể nấu nhiều món ngon! Cho mình biết cụ thể bạn có gì để gợi ý chính xác hơn nhé.

Ví dụ:
- **Trứng + cà chua** → Trứng chiên cà chua, canh cà chua trứng
- **Thịt bò** → Bò xào, phở bò, bún bò
- **Gà** → Gà kho gừng, canh gà, gà nướng`,
  
  weekPlan: `Mình lên lịch ăn 7 ngày cho bạn nhé!

**Thứ 2:** Phở bò, Cơm tấm sườn, Canh chua cá
**Thứ 3:** Bánh mì, Bún chả, Gà kho gừng
**Thứ 4:** Xôi xéo, Mì Quảng, Lẩu thái
**Thứ 5:** Cháo gà, Cơm rang, Bún bò Huế
**Thứ 6:** Bánh cuốn, Hủ tiếu, Cá chiên + rau
**Thứ 7:** Phở gà, Bún riêu, BBQ tại nhà
**CN:** Bánh mì, Cơm gia đình, Lẩu nấm

Bạn muốn điều chỉnh gì không? Mình thêm vào lịch nhé! 📋`,

  hotWeather: `Trời nóng thì ăn món mát:

1. **Bún thịt nướng** - Rau sống mát lành
2. **Gỏi cuốn** - Tươi mát, healthy
3. **Canh chua cá** - Thanh nhiệt
4. **Nộm đu đủ** - Giòn, chua ngọt
5. **Chè đậu xanh** - Giải nhiệt tuyệt vời

Nhớ uống nhiều nước nhé! Bạn muốn công thức món nào? 🧊`,

  coldWeather: `Trời lạnh thì ăn món nóng:

1. **Phở bò tái chín** - Nóng hổi, thơm ngon
2. **Lẩu** - Ấm áp cả nhà
3. **Cháo sườn** - Nóng, bổ dưỡng
4. **Bún riêu cua** - Chua cay ấm bụng
5. **Thịt kho tàu** - Đậm đà, ăn với cơm nóng

Món nóng hổi sẽ ấm bụng ngay! Thêm vào lịch ăn nhé? 🔥`,

  vegetarian: `Món chay ngon đây:

1. **Phở chay** - Nước dùng rau củ thơm
2. **Đậu hũ sốt cà** - Protein thực vật
3. **Canh nấm** - Ngọt tự nhiên
4. **Gỏi cuốn chay** - Tươi mát
5. **Cơm chiên chay** - Đủ rau củ

Ăn chay tốt cho sức khỏe! Bạn ăn chay thường xuyên không? 🥬`,

  korean: `Món Hàn Quốc ngon:

1. **Kimchi jjigae** - Canh kim chi
2. **Bibimbap** - Cơm trộn
3. **Bulgogi** - Thịt bò nướng
4. **Tteokbokki** - Bánh gạo cay
5. **Samgyeopsal** - Thịt ba chỉ nướng

Món Hàn đang hot! Bạn muốn công thức món nào? 🇰🇷`,

  quickMeals: `15 phút xong ngay:

1. **Mì xào trứng** - 10 phút, siêu nhanh
2. **Cơm chiên** - 12 phút nếu có cơm nguội
3. **Sandwich** - 5 phút
4. **Trứng ốp la + cơm** - 8 phút
5. **Mì gói nâng cấp** - Thêm trứng, rau

Mẹo: Chuẩn bị sẵn nguyên liệu sẽ nhanh hơn! Bạn có nguyên liệu gì? ⚡`,

  budget: `Món ăn sinh viên dưới 30k:

1. **Cơm rang trứng** - 15k, no lâu
2. **Mì gói + trứng + rau** - 12k
3. **Bánh mì trứng** - 18k
4. **Xôi** - 15k, năng lượng cao
5. **Cháo** - 20k, ấm bụng

Mẹo: Nấu tại phòng trọ tiết kiệm hơn! Bạn có bếp không? 💰`,

  thanks: `Không có gì! Chúc bạn nấu ăn ngon miệng! 🎉

Khi nào cần gợi ý món ăn hay lên lịch, cứ hỏi mình nhé. Chúc bạn một ngày tuyệt vời!`,

  bye: `Tạm biệt bạn! 👋

Hẹn gặp lại lần sau nhé. Nhớ ăn ngon, sống khỏe! 
Khi nào cần CookBot, mình luôn sẵn sàng hỗ trợ! 🍳`,
};

/**
 * Gọi Groq API (MIỄN PHÍ, nhanh)
 */
async function callGroqAPI(userMessage, maxTokens = 500) {
  try {
    if (!GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY is missing!');
      console.error('   Check .env file has GROQ_API_KEY=...');
      throw new Error('Groq API key chưa được cấu hình');
    }
    
    console.log(`🤖 Calling Groq API with model: ${GROQ_MODEL}`);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Groq API error:', response.status, error);
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    // Extract response
    const text = result.choices?.[0]?.message?.content || '';
    
    return text.trim();
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

/**
 * Smart fallback responses từ training data
 */
function getFallbackResponse(message) {
  const lowerMsg = message.toLowerCase();
  
  // Greeting patterns
  if (lowerMsg.match(/^(chào|hello|hi|xin chào|hey)\b/)) {
    return EXAMPLE_RESPONSES.greeting;
  }
  
  // Meal time patterns
  if (lowerMsg.includes('sáng') || lowerMsg.includes('breakfast')) {
    return EXAMPLE_RESPONSES.breakfast;
  }
  if (lowerMsg.includes('trưa') || lowerMsg.includes('lunch')) {
    return EXAMPLE_RESPONSES.lunch;
  }
  if (lowerMsg.includes('tối') || lowerMsg.includes('dinner')) {
    return EXAMPLE_RESPONSES.dinner;
  }
  
  // Diet patterns
  if (lowerMsg.includes('giảm cân') || lowerMsg.includes('diet') || lowerMsg.includes('ít calo')) {
    return EXAMPLE_RESPONSES.weightLoss;
  }
  
  // Meal planning
  if (lowerMsg.includes('lịch ăn') || lowerMsg.includes('tuần') || lowerMsg.includes('7 ngày')) {
    return EXAMPLE_RESPONSES.weekPlan;
  }
  
  // Ingredient-based
  if (lowerMsg.includes('có') && (lowerMsg.includes('nấu gì') || lowerMsg.includes('làm gì'))) {
    return EXAMPLE_RESPONSES.ingredients;
  }
  
  // Weather patterns
  if (lowerMsg.includes('nóng') || lowerMsg.includes('hè') || lowerMsg.includes('mùa hè')) {
    return EXAMPLE_RESPONSES.hotWeather;
  }
  if (lowerMsg.includes('lạnh') || lowerMsg.includes('đông') || lowerMsg.includes('mùa đông')) {
    return EXAMPLE_RESPONSES.coldWeather;
  }
  
  // Cuisine types
  if (lowerMsg.includes('chay') || lowerMsg.includes('vegetarian')) {
    return EXAMPLE_RESPONSES.vegetarian;
  }
  if (lowerMsg.includes('hàn') || lowerMsg.includes('korean')) {
    return EXAMPLE_RESPONSES.korean;
  }
  
  // Quick/Budget meals
  if (lowerMsg.includes('nhanh') || lowerMsg.includes('15 phút') || lowerMsg.includes('10 phút')) {
    return EXAMPLE_RESPONSES.quickMeals;
  }
  if (lowerMsg.includes('rẻ') || lowerMsg.includes('sinh viên') || lowerMsg.includes('tiết kiệm')) {
    return EXAMPLE_RESPONSES.budget;
  }
  
  // Thanks/Bye
  if (lowerMsg.includes('cảm ơn') || lowerMsg.includes('thanks') || lowerMsg.includes('thank')) {
    return EXAMPLE_RESPONSES.thanks;
  }
  if (lowerMsg.includes('tạm biệt') || lowerMsg.includes('bye') || lowerMsg.includes('goodbye')) {
    return EXAMPLE_RESPONSES.bye;
  }
  
  // General food questions
  if (lowerMsg.includes('ăn gì') || lowerMsg.includes('gợi ý')) {
    return EXAMPLE_RESPONSES.askMeal;
  }
  
  // Default
  return `Mình có thể giúp bạn:
• 🍳 Gợi ý món ăn theo sở thích, thời tiết, bữa ăn
• 📋 Công thức nấu ăn chi tiết (nguyên liệu + cách làm)
• 📅 Lên lịch ăn tuần (7 ngày x 3 bữa)
• 💪 Tư vấn chế độ ăn (giảm cân, tăng cơ, chay, keto...)
• 🌍 Món ăn quốc tế (Hàn, Nhật, Thái, Ý...)

Bạn cần mình hỗ trợ gì? 😊`;
}

/**
 * Enhance prompt với context từ training data
 */
function enhancePromptWithContext(message, dietMode) {
  let enhancedPrompt = message;
  const lowerMsg = message.toLowerCase();
  
  // Thêm hints dựa trên keywords
  if (lowerMsg.includes('nhanh') || lowerMsg.includes('15 phút')) {
    enhancedPrompt += ' (Gợi ý món nấu nhanh dưới 15 phút như: mì xào, cơm chiên, sandwich)';
  }
  
  if (lowerMsg.includes('rẻ') || lowerMsg.includes('sinh viên') || lowerMsg.includes('tiết kiệm')) {
    enhancedPrompt += ' (Gợi ý món dưới 30k như: cơm rang trứng, mì gói upgrade, xôi)';
  }
  
  if (lowerMsg.includes('nóng') || lowerMsg.includes('hè')) {
    enhancedPrompt += ' (Gợi ý món mát: bún, gỏi cuốn, canh chua, nộm)';
  }
  
  if (lowerMsg.includes('lạnh') || lowerMsg.includes('đông')) {
    enhancedPrompt += ' (Gợi ý món nóng: phở, lẩu, cháo, bún riêu)';
  }
  
  if (lowerMsg.includes('tết') || lowerMsg.includes('năm mới')) {
    enhancedPrompt += ' (Gợi ý món Tết: bánh chưng, thịt kho, gà luộc, nem rán, dưa hành)';
  }
  
  if (lowerMsg.includes('tiệc') || lowerMsg.includes('sinh nhật') || lowerMsg.includes('party')) {
    enhancedPrompt += ' (Gợi ý menu tiệc: gà rán, pizza, mì Ý, salad, bánh)';
  }
  
  // Diet mode context
  if (dietMode && dietMode !== 'none') {
    const dietContext = {
      'weight-loss': 'Ưu tiên món ít calo, nhiều rau, protein nạc',
      'weight-gain': 'Ưu tiên món nhiều protein, carb, năng lượng cao',
      'muscle-gain': 'Ưu tiên món nhiều protein: ức gà, cá, trứng, bò',
      'vegetarian': 'Chỉ gợi ý món chay, không thịt cá',
      'keto': 'Ưu tiên món ít carb, nhiều chất béo lành mạnh',
      'low-carb': 'Tránh cơm, mì, bánh mì. Ưu tiên rau và protein',
    };
    if (dietContext[dietMode]) {
      enhancedPrompt += ` (${dietContext[dietMode]})`;
    }
  }
  
  return enhancedPrompt;
}

/**
 * Send message to CookBot
 */
export const sendMessage = async (req, res) => {
  try {
    const { message, dietMode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tin nhắn',
      });
    }

    console.log('🤖 CookBot (Fine-tuned) received:', message);

    // Enhance prompt với context từ training data
    let fullMessage = enhancePromptWithContext(message, dietMode);
    
    // Thêm label chế độ ăn
    if (dietMode && dietMode !== 'none') {
      const dietLabels = {
        'weight-loss': 'giảm cân',
        'weight-gain': 'tăng cân',
        'muscle-gain': 'tăng cơ',
        'healthy': 'khỏe mạnh',
        'vegetarian': 'chay',
        'low-carb': 'ít tinh bột',
        'keto': 'keto',
      };
      fullMessage = `[Chế độ ăn: ${dietLabels[dietMode] || dietMode}] ${fullMessage}`;
    }

    let response;
    
    try {
      // Gọi Groq API (miễn phí, nhanh)
      console.log('📤 Sending message to Groq API...');
      response = await callGroqAPI(fullMessage);
      
      if (!response || response.length < 10) {
        console.warn('⚠️ Empty response from Groq API, using fallback');
        throw new Error('Empty response');
      }
      
      console.log('✅ Got response from Groq API');
    } catch (modelError) {
      console.error('❌ Groq API error:', modelError.message);
      console.log('🔄 Using fallback response...');
      response = getFallbackResponse(message);
    }

    // Enrich với YouTube links
    let videoInfo = null;
    try {
      const enriched = await enrichWithYouTubeLinks(response);
      response = enriched.text;
      videoInfo = enriched.videoInfo;
    } catch (ytError) {
      console.log('YouTube enrichment skipped:', ytError.message);
    }

    // Extract meal name
    const mealNameMatch = response.match(/\*\*([^*]+)\*\*/);
    const mealName = mealNameMatch ? mealNameMatch[1] : undefined;

    // Lưu lịch sử
    const userId = req.user?.userId;
    if (userId) {
      try {
        await ChatbotHistory.saveMessage(userId, {
          role: 'user',
          content: message,
          timestamp: new Date(),
        });
        await ChatbotHistory.saveMessage(userId, {
          role: 'assistant',
          content: response,
          videoInfo: videoInfo,
          mealName: mealName,
          timestamp: new Date(),
        });
      } catch (historyError) {
        console.log('History save error:', historyError.message);
      }
    }

    res.json({
      success: true,
      response,
      videoInfo,
      mealName,
      modelType: 'cookbot-finetuned', // Fine-tuned CookBot (Groq API + Training Data)
      trainedModel: HF_MODEL, // Model đã train: https://huggingface.co/uduptit/cookbot-vietnamese
    });
  } catch (error) {
    console.error('CookBot error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
    });
  }
};

/**
 * Gọi OpenAI Vision API để nhận diện ảnh
 */
async function callOpenAIVisionAPI(imageUrl, userMessage, dietMode) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key chưa được cấu hình');
    }

    const client = getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI client chưa được khởi tạo');
    }

    // Build system prompt với diet mode nếu có
    let visionSystemPrompt = SYSTEM_PROMPT + '\n\nBạn có thể nhìn thấy ảnh nguyên liệu. Hãy nhận diện các nguyên liệu và đề xuất món ăn phù hợp.';
    if (dietMode && dietMode !== 'none') {
      const dietModeLabels = {
        'weight-loss': 'giảm cân',
        'weight-gain': 'tăng cân',
        'muscle-gain': 'tăng cơ',
        'healthy': 'khỏe mạnh',
        'vegetarian': 'chay',
        'low-carb': 'ít tinh bột',
        'keto': 'keto',
      };
      visionSystemPrompt += `\n\nLƯU Ý: Người dùng đang theo chế độ ăn ${dietModeLabels[dietMode] || dietMode}. Hãy đề xuất món ăn từ nguyên liệu trong ảnh phù hợp với chế độ này.`;
    }

    // Prepare messages for vision API
    const messages = [
      {
        role: 'system',
        content: visionSystemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage || 'Nhận diện nguyên liệu trong ảnh này và đề xuất món ăn phù hợp. Liệt kê các nguyên liệu bạn thấy và gợi ý 2-3 món ăn có thể làm từ chúng.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ];

    console.log(`🤖 Calling OpenAI Vision API (${OPENAI_MODEL})...`);

    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL, // gpt-4o cho vision
      messages: messages,
      temperature: 0.8,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể nhận diện ảnh lúc này.';
    console.log('✅ Got response from OpenAI Vision API');
    
    return response.trim();
  } catch (error) {
    console.error('Error calling OpenAI Vision API:', error);
    throw error;
  }
}

/**
 * Send message with image - Dùng OpenAI Vision API
 */
export const sendMessageWithImage = async (req, res) => {
  try {
    const { message, dietMode } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh',
      });
    }

    // Kiểm tra OpenAI API key
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key chưa được cấu hình. Vui lòng cấu hình OPENAI_API_KEY trong .env',
      });
    }

    console.log('🤖 CookBot (OpenAI Vision) received image message:', message || 'Nhận diện nguyên liệu');

    // Convert image to base64 for OpenAI Vision API
    const base64Image = imageFile.buffer.toString('base64');
    const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

    let response;
    
    try {
      // Gọi OpenAI Vision API để nhận diện ảnh
      console.log('📤 Sending image to OpenAI Vision API...');
      response = await callOpenAIVisionAPI(imageUrl, message, dietMode);
      
      if (!response || response.length < 10) {
        throw new Error('Empty response from OpenAI Vision API');
      }
      
      console.log('✅ Got response from OpenAI Vision API');
    } catch (visionError) {
      console.error('❌ OpenAI Vision API error:', visionError.message);
      
      // Fallback: Nếu có message kèm theo, dùng Groq API
      if (message && message.trim()) {
        try {
          const fullMessage = dietMode && dietMode !== 'none' 
            ? `[Chế độ ăn: ${dietMode}] ${message}`
            : message;
          
          console.log('🔄 Falling back to Groq API for text message...');
          const groqResponse = await callGroqAPI(fullMessage);
          if (groqResponse && groqResponse.length > 10) {
            response = groqResponse;
          } else {
            throw new Error('Empty Groq response');
          }
        } catch (groqError) {
          console.log('Groq API fallback also failed:', groqError.message);
          response = `Mình chưa thể nhận diện ảnh trực tiếp. Bạn có thể mô tả các nguyên liệu trong ảnh không? Ví dụ: "Tôi có trứng, cà chua, hành" - mình sẽ gợi ý món ăn phù hợp!`;
        }
      } else {
        response = `Mình chưa thể nhận diện ảnh trực tiếp. Bạn có thể mô tả các nguyên liệu trong ảnh không? Ví dụ: "Tôi có trứng, cà chua, hành" - mình sẽ gợi ý món ăn phù hợp!`;
      }
    }

    // Enrich với YouTube links
    let videoInfo = null;
    try {
      const enriched = await enrichWithYouTubeLinks(response);
      response = enriched.text;
      videoInfo = enriched.videoInfo;
    } catch (ytError) {
      console.log('YouTube enrichment skipped:', ytError.message);
    }

    // Extract meal name
    const mealNameMatch = response.match(/\*\*([^*]+)\*\*/);
    const mealName = mealNameMatch ? mealNameMatch[1] : undefined;

    // Lưu lịch sử với ảnh
    const userId = req.user?.userId;
    if (userId) {
      try {
        await ChatbotHistory.saveMessage(userId, {
          role: 'user',
          content: message || 'Nhận diện nguyên liệu trong ảnh',
          image: imageUrl,
          timestamp: new Date(),
        });
        await ChatbotHistory.saveMessage(userId, {
          role: 'assistant',
          content: response,
          videoInfo: videoInfo,
          mealName: mealName,
          timestamp: new Date(),
        });
      } catch (historyError) {
        console.log('History save error:', historyError.message);
      }
    }

    res.json({
      success: true,
      response,
      videoInfo,
      mealName,
      modelType: 'cookbot-finetuned-vision', // Fine-tuned CookBot với OpenAI Vision cho ảnh
      trainedModel: HF_MODEL,
      visionModel: OPENAI_MODEL, // OpenAI Vision model
    });
  } catch (error) {
    console.error('Image message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra',
    });
  }
};

/**
 * Check API status
 */
export const checkApiKey = async (req, res) => {
  try {
    // Test Groq API availability
    const testResponse = await callGroqAPI('test', 10);
    
    res.json({
      success: true,
      valid: true,
      model: GROQ_MODEL,
      trainedModel: HF_MODEL, // Model đã train: https://huggingface.co/uduptit/cookbot-vietnamese
      type: 'cookbot-finetuned',
      message: '🤖 CookBot Fine-tuned đang hoạt động!',
      features: [
        'Gợi ý món ăn theo thời tiết, bữa ăn',
        'Công thức nấu ăn chi tiết',
        'Lên lịch ăn tuần',
        'Tư vấn chế độ ăn (giảm cân, tăng cơ, chay, keto)',
        'Đặc sản vùng miền Việt Nam',
        'Món ăn quốc tế (Hàn, Nhật, Thái, Ý)',
      ],
    });
  } catch (error) {
    res.json({
      success: true,
      valid: false,
      model: GROQ_MODEL,
      trainedModel: HF_MODEL,
      type: 'cookbot-finetuned',
      message: 'CookBot đang khởi động, vui lòng đợi...',
      fallbackAvailable: true,
    });
  }
};

export default {
  sendMessage,
  sendMessageWithImage,
  checkApiKey,
};

