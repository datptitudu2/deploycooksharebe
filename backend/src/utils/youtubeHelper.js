import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Tạo link search YouTube (không cần API key)
 * User click sẽ mở YouTube với kết quả search
 */
export const createYouTubeSearchLink = (query) => {
  const encodedQuery = encodeURIComponent(`cách nấu ${query} ngon`);
  return `https://www.youtube.com/results?search_query=${encodedQuery}`;
};

/**
 * Search YouTube API để lấy video ID thật
 * Cần YOUTUBE_API_KEY trong .env
 */
export const searchYouTubeVideo = async (query) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    // Fallback to search link nếu không có API key
    return {
      success: false,
      fallbackUrl: createYouTubeSearchLink(query),
    };
  }

  try {
    // Clean query - loại bỏ các từ không cần thiết
    let cleanQuery = query.trim();
    // Loại bỏ các từ như "cách nấu", "cách làm", "hướng dẫn" nếu đã có
    cleanQuery = cleanQuery.replace(/^(cách nấu|cách làm|hướng dẫn|recipe|how to cook|how to make)\s+/i, '');
    // Loại bỏ dấu ngoặc và các ký tự đặc biệt
    cleanQuery = cleanQuery.replace(/[()\[\]{}]/g, '').trim();
    
    // Tạo query tối ưu
    const searchQuery = `cách nấu ${cleanQuery} ngon`;
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: 5, // Lấy 5 kết quả để filter tốt hơn
        key: apiKey,
        regionCode: 'VN',
        relevanceLanguage: 'vi',
        order: 'relevance', // Sắp xếp theo độ liên quan
        videoDuration: 'medium', // Video vừa (4-20 phút) - phù hợp với hướng dẫn nấu ăn
      },
    });

    if (!response.data.items || response.data.items.length === 0) {
      return {
        success: false,
        fallbackUrl: createYouTubeSearchLink(cleanQuery),
      };
    }

    // Filter và chọn video tốt nhất
    const videos = response.data.items;
    
    // Ưu tiên video có title chứa tên món ăn
    const bestVideo = videos.find(video => {
      const title = video.snippet.title.toLowerCase();
      const queryLower = cleanQuery.toLowerCase();
      return title.includes(queryLower) || queryLower.split(' ').some(word => title.includes(word));
    }) || videos[0]; // Nếu không tìm thấy, lấy video đầu tiên

    if (bestVideo) {
      return {
        success: true,
        videoId: bestVideo.id.videoId,
        title: bestVideo.snippet.title,
        thumbnail: bestVideo.snippet.thumbnails.medium?.url || bestVideo.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${bestVideo.id.videoId}`,
      };
    }

    return {
      success: false,
      fallbackUrl: createYouTubeSearchLink(cleanQuery),
    };
  } catch (error) {
    console.error('YouTube API error:', error.message);
    return {
      success: false,
      fallbackUrl: createYouTubeSearchLink(query),
    };
  }
};

/**
 * Extract tên món ăn từ response của chatbot
 * Tìm các pattern như "Phở bò", "Gà nướng", etc.
 */
export const extractDishNames = (text) => {
  const dishes = [];
  
  // Pattern 1: **Tên món** (markdown bold)
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = boldPattern.exec(text)) !== null) {
    const dish = match[1].trim();
    // Filter ra những từ không phải món ăn
    if (dish.length > 2 && !dish.match(/^(Thứ|Chủ nhật|Gợi ý|Món|Video|Tổng|Mẹo)/i)) {
      dishes.push(dish);
    }
  }
  
  // Pattern 2: Numbered list với tên món
  // 1. Phở bò - mô tả
  const numberedPattern = /\d+\.\s*\*?\*?([^-–\n*]+)/g;
  while ((match = numberedPattern.exec(text)) !== null) {
    const dish = match[1].trim().replace(/\*+/g, '');
    if (dish.length > 2 && dish.length < 30 && !dishes.includes(dish)) {
      dishes.push(dish);
    }
  }
  
  return [...new Set(dishes)].slice(0, 3); // Max 3 món
};

/**
 * Replace placeholder YouTube links với link thật
 * HOẶC loại bỏ nếu đã có videoInfo (vì đã có YouTubePlayer component)
 */
export const replaceYouTubeLinks = async (text) => {
  // Tìm pattern [Video: ... - https://youtube.com/watch?v=example]
  const videoPattern = /\[Video:\s*([^\]]+?)\s*-\s*https:\/\/youtube\.com\/watch\?v=example\]/gi;
  
  let result = text;
  const matches = [...text.matchAll(videoPattern)];
  
  // Nếu có matches, loại bỏ chúng vì đã có YouTubePlayer component
  for (const match of matches) {
    result = result.replace(match[0], '');
  }
  
  // Loại bỏ các dòng "Video:" từ AI response
  result = result.replace(/^Video:\s*[^\n]*$/gmi, '');
  result = result.replace(/Mở\s+YouTube/gi, '');
  
  return result.trim();
};

/**
 * Thêm video links cho các món ăn trong response
 * Nếu response không có video link, tự động thêm
 * @returns {Promise<{text: string, videoInfo: object|null}>}
 */
export const enrichWithYouTubeLinks = async (text) => {
  // Nếu đã có video link (thật hoặc example), replace chúng
  if (text.includes('youtube.com')) {
    const enrichedText = await replaceYouTubeLinks(text);
    return { text: enrichedText, videoInfo: null };
  }
  
  // Nếu chưa có video link, extract tên món và thêm vào
  const dishes = extractDishNames(text);
  
  if (dishes.length === 0) {
    return { text, videoInfo: null };
  }
  
  // Thêm video cho món đầu tiên
  const mainDish = dishes[0];
  const videoInfo = await searchYouTubeVideo(mainDish);
  
  // Nếu có videoInfo thành công, không thêm link text (vì đã có YouTubePlayer component)
  if (videoInfo.success) {
    // Không thêm link text vào response vì đã có YouTubePlayer component hiển thị
    return { 
      text: text, // Giữ nguyên text, không thêm link
      videoInfo: {
        videoId: videoInfo.videoId,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        url: videoInfo.url,
      }
    };
  } else {
    // Nếu không tìm được video, thêm search link
    const videoSection = `\n\n📺 **Video hướng dẫn:**\n🔍 ${videoInfo.fallbackUrl}`;
    return { text: text + videoSection, videoInfo: null };
  }
};

