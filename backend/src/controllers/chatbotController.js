import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { enrichWithYouTubeLinks } from '../utils/youtubeHelper.js';
import { ChatbotHistory } from '../models/ChatbotHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt cho AI tư vấn món ăn
const SYSTEM_PROMPT = `Bạn là một AI tư vấn món ăn thân thiện và dí dỏm tên là CookBot của ứng dụng CookShare. 

QUAN TRỌNG: 
- Bạn phải BÌNH TĨNH và CHỈ gợi ý món ăn khi người dùng THỰC SỰ YÊU CẦU hoặc hỏi về món ăn. KHÔNG tự động gợi ý món ăn khi người dùng chỉ chào hỏi, hỏi thời tiết, hoặc trò chuyện thông thường.
- Khi người dùng hỏi về thứ trong tuần hoặc ngày tháng, hãy sử dụng thông tin ngày hiện tại được cung cấp trong system prompt để trả lời CHÍNH XÁC.

Nhiệm vụ của bạn:
1. Trò chuyện tự nhiên, thân thiện như một người bạn. Khi người dùng chào hỏi, hãy chào lại và hỏi xem họ cần gì.

2. Khi người dùng HỎI VỀ hoặc YÊU CẦU gợi ý món ăn, lúc đó mới tư vấn món ăn phù hợp dựa trên:
   - Thời tiết (nóng/lạnh/mưa)
   - Cảm xúc của người dùng (vui/buồn/căng thẳng)
   - Sở thích và nhu cầu dinh dưỡng
   - Nguyên liệu có sẵn
   - Chế độ ăn của người dùng (giảm cân, tăng cân, tăng cơ, chay, keto, low-carb, healthy)
   - Vùng miền/châu lục (Miền Bắc/Trung/Nam Việt Nam, Châu Á/Âu/Mỹ)

3. Khi đề xuất món ăn, hãy in đậm tên món bằng **tên món** để dễ nhận diện

4. Khi người dùng hỏi về thời tiết, hãy trả lời về thời tiết một cách tự nhiên. CHỈ gợi ý món ăn nếu họ hỏi "nên ăn gì khi trời nóng/lạnh/mưa" hoặc tương tự.

5. Đề xuất món ăn Việt Nam và quốc tế, có thể gợi ý theo vùng miền:
   - Miền Bắc: Phở, bún chả, bánh cuốn, chả cá, bún đậu mắm tôm, bánh mì pate, canh chua cá, thịt kho tàu...
   - Miền Trung: Bún bò Huế, cao lầu, mì Quảng, bánh xèo, nem nướng, bánh bèo, bánh ướt...
   - Miền Nam: Cơm tấm, hủ tiếu, bánh mì Sài Gòn, bún riêu, canh chua cá lóc, thịt kho nước dừa, bánh xèo Nam Bộ...
   - Châu Á: Pad Thai, Ramen, Kimchi, Dim Sum, Curry, Nasi Goreng...
   - Châu Âu: Pasta, Paella, Ratatouille, Schnitzel, Moussaka...
   - Châu Mỹ: Tacos, BBQ, Burgers, Ceviche, Feijoada...

6. Khi người dùng chọn chế độ ăn đặc biệt (giảm cân, tăng cân, chay, etc.), hãy đề xuất món ăn phù hợp với chế độ đó:
   - Giảm cân: Món ít calo, nhiều rau xanh, protein nạc, ít dầu mỡ
   - Tăng cân: Món giàu calo, dinh dưỡng, protein và carb
   - Tăng cơ: Món nhiều protein, ít chất béo, có carb phức hợp
   - Chay: Món không có thịt, cá, trứng, sữa
   - Keto: Món ít carb, nhiều chất béo, protein vừa phải
   - Low-carb: Món ít tinh bột, nhiều rau và protein
   - Healthy: Món cân bằng dinh dưỡng, ít đường, ít muối, nhiều chất xơ

7. Khi người dùng hỏi về món ăn vùng miền, hãy giải thích đặc điểm và gợi ý món ăn phù hợp

8. KHÔNG cần thêm link video YouTube - hệ thống sẽ tự động thêm video hướng dẫn nấu ăn

9. Hãy trả lời bằng tiếng Việt một cách tự nhiên và thân thiện, nhưng nhớ: CHỈ gợi ý món ăn khi được yêu cầu, không tự động gợi ý.`;

export const sendMessage = async (req, res) => {
  try {
    const { message, dietMode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tin nhắn',
      });
    }

    // Kiểm tra API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key chưa được cấu hình',
      });
    }

    // Kiểm tra model đang dùng
    const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const isFineTuned = currentModel.startsWith('ft:');
    
    // Log model info (chỉ log lần đầu hoặc khi thay đổi)
    if (!global.lastLoggedModel || global.lastLoggedModel !== currentModel) {
      console.log('\n🤖 Chatbot Model Info:');
      console.log('  - Model:', currentModel);
      console.log('  - Type:', isFineTuned ? '✅ Fine-tuned (Đã train)' : '⚠️ Base Model (API Key only)');
      console.log('  - Status:', isFineTuned ? 'Đang dùng model đã được train' : 'Đang dùng API key thông thường\n');
      global.lastLoggedModel = currentModel;
    }

    // Lấy thông tin ngày thực tế
    const now = new Date();
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = days[now.getDay()];
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    
    // Build system prompt with diet mode if provided
    let systemPrompt = SYSTEM_PROMPT;
    systemPrompt += `\n\nTHÔNG TIN NGÀY HIỆN TẠI: Hôm nay là ${dayName}, ngày ${dateStr}. Bạn có thể sử dụng thông tin này khi người dùng hỏi về thứ trong tuần hoặc ngày tháng.`;
    
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
      systemPrompt += `\n\nLƯU Ý: Người dùng đang theo chế độ ăn ${dietModeLabels[dietMode] || dietMode}. Hãy đề xuất món ăn phù hợp với chế độ này.`;
    }

    // Gọi OpenAI API
    const completion = await openai.chat.completions.create({
      model: currentModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    let response = completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';

    // Enrich response với YouTube links thật
    let videoInfo = null;
    try {
      const enriched = await enrichWithYouTubeLinks(response);
      response = enriched.text;
      videoInfo = enriched.videoInfo;
    } catch (ytError) {
      console.log('YouTube enrichment skipped:', ytError.message);
    }

    // Extract meal name from response
    const mealNameMatch = response.match(/\*\*([^*]+)\*\*/);
    const mealName = mealNameMatch ? mealNameMatch[1] : undefined;

    // Lưu vào lịch sử
    const userId = req.user?.userId;
    if (userId) {
      try {
        // Lưu user message
        await ChatbotHistory.saveMessage(userId, {
          role: 'user',
          content: message,
          timestamp: new Date(),
        });
        // Lưu assistant response
        await ChatbotHistory.saveMessage(userId, {
          role: 'assistant',
          content: response,
          videoInfo: videoInfo,
          mealName: mealName,
          timestamp: new Date(),
        });
      } catch (historyError) {
        console.error('Error saving chat history:', historyError);
        // Không fail request nếu lưu history lỗi
      }
    }

    res.json({
      success: true,
      response: response,
      mealName: mealName,
      videoInfo: videoInfo, // Thông tin video để hiển thị player
      modelInfo: {
        model: currentModel,
        isFineTuned: isFineTuned,
        type: isFineTuned ? 'Fine-tuned (Đã train)' : 'Base Model (API Key)'
      }
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi xử lý tin nhắn',
    });
  }
};

export const sendMessageWithImage = async (req, res) => {
  try {
    const { message, dietMode } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng gửi ảnh',
      });
    }

    // Kiểm tra API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key chưa được cấu hình',
      });
    }

    // Convert image to base64
    const base64Image = imageFile.buffer.toString('base64');
    const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

    // Build system prompt with diet mode if provided
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
            text: message || 'Nhận diện nguyên liệu trong ảnh này và đề xuất món ăn phù hợp. Liệt kê các nguyên liệu bạn thấy và gợi ý 2-3 món ăn có thể làm từ chúng.',
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

    // Kiểm tra model cho vision (vision vẫn dùng gpt-4o, nhưng text có thể dùng fine-tuned)
    const visionModel = 'gpt-4o'; // Vision phải dùng gpt-4o
    const currentModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const isFineTuned = currentModel.startsWith('ft:');

    // Gọi OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: visionModel,
      messages: messages,
      temperature: 0.8,
      max_tokens: 800,
    });

    let response = completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể nhận diện ảnh lúc này.';

    // Enrich response với YouTube links thật
    let videoInfo = null;
    try {
      const enriched = await enrichWithYouTubeLinks(response);
      response = enriched.text;
      videoInfo = enriched.videoInfo;
    } catch (ytError) {
      console.log('YouTube enrichment skipped:', ytError.message);
    }

    // Extract meal name from response
    const mealNameMatch = response.match(/\*\*([^*]+)\*\*/);
    const mealName = mealNameMatch ? mealNameMatch[1] : undefined;

    // Lưu vào lịch sử
    const userId = req.user?.userId;
    if (userId) {
      try {
        // Convert image buffer to base64 for storage
        const imageBase64 = imageFile.buffer.toString('base64');
        // Lưu user message với ảnh
        await ChatbotHistory.saveMessage(userId, {
          role: 'user',
          content: message || 'Nhận diện nguyên liệu trong ảnh này',
          image: imageBase64,
          timestamp: new Date(),
        });
        // Lưu assistant response
        await ChatbotHistory.saveMessage(userId, {
          role: 'assistant',
          content: response,
          videoInfo: videoInfo,
          mealName: mealName,
          timestamp: new Date(),
        });
      } catch (historyError) {
        console.error('Error saving chat history:', historyError);
        // Không fail request nếu lưu history lỗi
      }
    }

    res.json({
      success: true,
      response: response,
      mealName: mealName,
      videoInfo: videoInfo, // Thông tin video để hiển thị player
      modelInfo: {
        model: currentModel,
        isFineTuned: isFineTuned,
        type: isFineTuned ? 'Fine-tuned (Đã train)' : 'Base Model (API Key)',
        note: 'Vision dùng gpt-4o, text dùng ' + (isFineTuned ? 'fine-tuned model' : 'base model')
      }
    });
  } catch (error) {
    console.error('Chatbot vision error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi xử lý ảnh',
    });
  }
};

/**
 * Lấy lịch sử chat
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    const { limit = 100 } = req.query;
    const history = await ChatbotHistory.getHistory(userId, { limit: parseInt(limit) });

    // Format response
    const formattedHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
      image: msg.image ? `data:image/jpeg;base64,${msg.image}` : null,
      videoInfo: msg.videoInfo || null,
      mealName: msg.mealName || null,
      timestamp: msg.timestamp,
    }));

    res.json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy lịch sử chat',
    });
  }
};

/**
 * Xóa lịch sử chat
 */
export const clearHistory = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }

    await ChatbotHistory.clearHistory(userId);

    res.json({
      success: true,
      message: 'Đã xóa lịch sử chat',
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa lịch sử chat',
    });
  }
};

