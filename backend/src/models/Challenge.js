/**
 * Challenge Model
 * 
 * HỆ THỐNG TỰ ĐỘNG CHỌN THỬ THÁCH:
 * - Có hơn 80+ challenge templates đa dạng
 * - Mỗi ngày hệ thống tự động chọn 1 challenge dựa trên:
 *   + Ngày trong năm (deterministic - cùng ngày = cùng challenge cho tất cả user)
 *   + Mùa trong năm (mùa hè = món mát, mùa đông = món nóng)
 *   + Ngày lễ đặc biệt (Tết, Trung Thu)
 *   + Cuối tuần (ưu tiên món khó hơn, family)
 * - Challenge được lưu vào DB để tránh tạo lại
 * - Mỗi challenge có: title, description, icon, category, points, difficulty
 */

import { connectToDatabase } from '../config/database.js';

const COLLECTION_NAME = 'challenges';
const USER_CHALLENGES_COLLECTION = 'user_challenges';

// Danh sách challenges mẫu - Hệ thống tự động chọn mỗi ngày
const CHALLENGE_TEMPLATES = [
  // === HEALTHY & DIET ===
  { title: 'Món không dầu', description: 'Nấu 1 món ăn hoàn toàn không sử dụng dầu mỡ', icon: '🥗', category: 'healthy', points: 50, difficulty: 'easy' },
  { title: '5 loại rau', description: 'Chế biến món ăn với ít nhất 5 loại rau củ khác nhau', icon: '🥬', category: 'healthy', points: 60, difficulty: 'medium' },
  { title: 'Không đường', description: 'Nấu món ăn hoàn toàn không thêm đường', icon: '🚫', category: 'healthy', points: 45, difficulty: 'easy' },
  { title: 'Bữa sáng healthy', description: 'Chuẩn bị một bữa sáng lành mạnh đầy đủ dinh dưỡng', icon: '🌅', category: 'healthy', points: 50, difficulty: 'easy' },
  { title: 'Salad đầy màu sắc', description: 'Làm một món salad với ít nhất 4 màu sắc khác nhau', icon: '🥙', category: 'healthy', points: 55, difficulty: 'medium' },
  { title: 'Món hấp', description: 'Nấu một món ăn bằng phương pháp hấp', icon: '🍤', category: 'healthy', points: 50, difficulty: 'easy' },
  { title: 'Smoothie tự làm', description: 'Tự làm một ly smoothie từ trái cây tươi', icon: '🥤', category: 'healthy', points: 40, difficulty: 'easy' },
  { title: 'Món ít calo', description: 'Nấu một món ăn dưới 300 calo', icon: '📊', category: 'healthy', points: 60, difficulty: 'medium' },
  
  // === QUICK & EASY ===
  { title: 'Dưới 30 phút', description: 'Hoàn thành một món ăn trong vòng 30 phút', icon: '⚡', category: 'quick', points: 45, difficulty: 'medium' },
  { title: 'Món 15 phút', description: 'Nấu một món ăn hoàn chỉnh trong 15 phút', icon: '⏱️', category: 'quick', points: 50, difficulty: 'medium' },
  { title: 'Một chảo', description: 'Nấu toàn bộ bữa ăn chỉ trong một cái chảo', icon: '🍳', category: 'quick', points: 55, difficulty: 'medium' },
  { title: 'Món nhanh cho bữa trưa', description: 'Chuẩn bị bữa trưa nhanh gọn trong 20 phút', icon: '🍱', category: 'quick', points: 45, difficulty: 'easy' },
  { title: 'Mì tự làm', description: 'Tự làm mì từ bột hoặc sử dụng mì tươi', icon: '🍜', category: 'quick', points: 60, difficulty: 'hard' },
  
  // === VIETNAMESE TRADITIONAL ===
  { title: 'Món truyền thống', description: 'Nấu một món ăn truyền thống Việt Nam', icon: '🇻🇳', category: 'vietnamese', points: 40, difficulty: 'easy' },
  { title: 'Phở tự làm', description: 'Nấu một tô phở đúng kiểu truyền thống', icon: '🍜', category: 'vietnamese', points: 80, difficulty: 'hard' },
  { title: 'Bánh mì Việt Nam', description: 'Làm bánh mì thịt nướng hoặc bánh mì chảo', icon: '🥖', category: 'vietnamese', points: 65, difficulty: 'hard' },
  { title: 'Bún chả', description: 'Nấu bún chả Hà Nội', icon: '🍝', category: 'vietnamese', points: 70, difficulty: 'hard' },
  { title: 'Chả giò', description: 'Làm chả giò (nem rán) tự tay', icon: '🌯', category: 'vietnamese', points: 75, difficulty: 'hard' },
  { title: 'Canh chua', description: 'Nấu canh chua cá hoặc tôm', icon: '🍲', category: 'vietnamese', points: 55, difficulty: 'medium' },
  { title: 'Cơm tấm', description: 'Làm cơm tấm sườn nướng', icon: '🍚', category: 'vietnamese', points: 60, difficulty: 'medium' },
  
  // === VEGETARIAN ===
  { title: 'Món chay', description: 'Nấu một món chay hoàn toàn không có thịt', icon: '🌱', category: 'vegetarian', points: 50, difficulty: 'easy' },
  { title: 'Đậu phụ chế biến', description: 'Chế biến đậu phụ thành món ăn ngon', icon: '🧈', category: 'vegetarian', points: 55, difficulty: 'medium' },
  { title: 'Món từ nấm', description: 'Nấu một món ăn chủ đạo từ nấm', icon: '🍄', category: 'vegetarian', points: 50, difficulty: 'easy' },
  { title: 'Bữa chay đầy đủ', description: 'Chuẩn bị một bữa ăn chay đầy đủ 3 món', icon: '🥗', category: 'vegetarian', points: 70, difficulty: 'hard' },
  
  // === DESSERT & SWEET ===
  { title: 'Món tráng miệng', description: 'Tự làm một món tráng miệng ngọt ngào', icon: '🍰', category: 'dessert', points: 60, difficulty: 'medium' },
  { title: 'Bánh ngọt tự làm', description: 'Làm bánh ngọt từ bột mì', icon: '🧁', category: 'dessert', points: 70, difficulty: 'hard' },
  { title: 'Kem tự làm', description: 'Tự làm kem tại nhà', icon: '🍨', category: 'dessert', points: 65, difficulty: 'hard' },
  { title: 'Chè Việt Nam', description: 'Nấu một loại chè truyền thống', icon: '🥣', category: 'dessert', points: 55, difficulty: 'medium' },
  { title: 'Bánh flan', description: 'Làm bánh flan caramel', icon: '🍮', category: 'dessert', points: 60, difficulty: 'medium' },
  
  // === SOUP & STEW ===
  { title: 'Món soup', description: 'Nấu một món súp hoặc canh nóng hổi', icon: '🍲', category: 'soup', points: 40, difficulty: 'easy' },
  { title: 'Canh rau củ', description: 'Nấu canh từ rau củ tươi', icon: '🥘', category: 'soup', points: 45, difficulty: 'easy' },
  { title: 'Lẩu tại nhà', description: 'Chuẩn bị một bữa lẩu đầy đủ', icon: '🍲', category: 'soup', points: 75, difficulty: 'hard' },
  
  // === FITNESS & PROTEIN ===
  { title: 'Protein cao', description: 'Chế biến món có hàm lượng protein cao (thịt, đậu, trứng)', icon: '💪', category: 'fitness', points: 55, difficulty: 'medium' },
  { title: 'Món từ trứng', description: 'Chế biến món ăn chủ đạo từ trứng', icon: '🥚', category: 'fitness', points: 45, difficulty: 'easy' },
  { title: 'Thịt nướng', description: 'Nướng thịt tại nhà', icon: '🥩', category: 'fitness', points: 60, difficulty: 'medium' },
  { title: 'Cá hấp', description: 'Hấp cá tươi với rau củ', icon: '🐟', category: 'fitness', points: 55, difficulty: 'medium' },
  
  // === EXPLORE & NEW ===
  { title: 'Thử công thức mới', description: 'Thử nấu một công thức bạn chưa từng làm trước đây', icon: '🆕', category: 'explore', points: 70, difficulty: 'hard' },
  { title: 'Món nước ngoài', description: 'Nấu một món ăn từ nền ẩm thực khác', icon: '🌍', category: 'explore', points: 65, difficulty: 'hard' },
  { title: 'Fusion cuisine', description: 'Kết hợp ẩm thực Việt Nam với phong cách nước ngoài', icon: '🍽️', category: 'explore', points: 75, difficulty: 'hard' },
  { title: 'Món từ sách nấu ăn', description: 'Nấu theo công thức từ sách nấu ăn', icon: '📖', category: 'explore', points: 60, difficulty: 'medium' },
  
  // === LOCAL & FRESH ===
  { title: 'Nguyên liệu địa phương', description: 'Sử dụng ít nhất 3 nguyên liệu tươi từ chợ địa phương', icon: '🏪', category: 'local', points: 55, difficulty: 'medium' },
  { title: 'Món từ rau vườn', description: 'Nấu món ăn từ rau tự trồng hoặc mua tại chợ nông sản', icon: '🌿', category: 'local', points: 50, difficulty: 'easy' },
  { title: 'Hải sản tươi', description: 'Chế biến món từ hải sản tươi sống', icon: '🦐', category: 'local', points: 70, difficulty: 'hard' },
  
  // === BREAKFAST ===
  { title: 'Bữa sáng đầy đủ', description: 'Chuẩn bị bữa sáng với đủ 4 nhóm chất', icon: '🍳', category: 'breakfast', points: 55, difficulty: 'medium' },
  { title: 'Bánh mì sáng', description: 'Làm bánh mì cho bữa sáng', icon: '🥐', category: 'breakfast', points: 60, difficulty: 'medium' },
  { title: 'Xôi tự làm', description: 'Nấu xôi các loại', icon: '🍚', category: 'breakfast', points: 50, difficulty: 'easy' },
  
  // === SPECIAL TECHNIQUES ===
  { title: 'Món chiên giòn', description: 'Chiên một món ăn giòn tan', icon: '🍤', category: 'technique', points: 60, difficulty: 'medium' },
  { title: 'Món nướng', description: 'Nướng món ăn bằng lò hoặc than', icon: '🔥', category: 'technique', points: 55, difficulty: 'medium' },
  { title: 'Món hầm', description: 'Hầm một món ăn trong ít nhất 1 giờ', icon: '🍖', category: 'technique', points: 65, difficulty: 'hard' },
  { title: 'Món cuốn', description: 'Làm món cuốn (gỏi cuốn, nem cuốn)', icon: '🌯', category: 'technique', points: 60, difficulty: 'medium' },
  { title: 'Món xào', description: 'Xào một món ăn với kỹ thuật wok', icon: '🍳', category: 'technique', points: 50, difficulty: 'easy' },
  
  // === FAMILY & SHARING ===
  { title: 'Nấu cho gia đình', description: 'Nấu một bữa ăn đầy đủ cho cả gia đình', icon: '👨‍👩‍👧‍👦', category: 'family', points: 75, difficulty: 'hard' },
  { title: 'Món chia sẻ', description: 'Nấu món ăn để chia sẻ với bạn bè', icon: '🤝', category: 'family', points: 65, difficulty: 'medium' },
  { title: 'Bữa tiệc nhỏ', description: 'Chuẩn bị 3-4 món cho bữa tiệc nhỏ', icon: '🎉', category: 'family', points: 80, difficulty: 'hard' },
  
  // === SEASONAL ===
  { title: 'Món mùa hè', description: 'Nấu món ăn mát mẻ cho mùa hè', icon: '☀️', category: 'seasonal', points: 50, difficulty: 'easy' },
  { title: 'Món mùa đông', description: 'Nấu món ăn ấm nóng cho mùa đông', icon: '❄️', category: 'seasonal', points: 50, difficulty: 'easy' },
  { title: 'Món Tết', description: 'Nấu món ăn truyền thống ngày Tết', icon: '🧧', category: 'seasonal', points: 70, difficulty: 'hard' },
  
  // === BAKING ===
  { title: 'Bánh mì tự làm', description: 'Làm bánh mì từ bột', icon: '🍞', category: 'baking', points: 75, difficulty: 'hard' },
  { title: 'Bánh ngọt nướng', description: 'Nướng bánh ngọt trong lò', icon: '🧁', category: 'baking', points: 70, difficulty: 'hard' },
  { title: 'Bánh quy', description: 'Làm bánh quy tại nhà', icon: '🍪', category: 'baking', points: 60, difficulty: 'medium' },
  
  // === ONE POT ===
  { title: 'Món một nồi', description: 'Nấu toàn bộ bữa ăn trong một nồi', icon: '🍲', category: 'onepot', points: 55, difficulty: 'medium' },
  { title: 'Cơm rang một chảo', description: 'Làm cơm rang với đầy đủ nguyên liệu', icon: '🍛', category: 'onepot', points: 50, difficulty: 'easy' },
  
  // === MEAL PREP ===
  { title: 'Meal prep', description: 'Chuẩn bị bữa ăn cho 2-3 ngày', icon: '📦', category: 'mealprep', points: 70, difficulty: 'hard' },
  { title: 'Đông lạnh tự làm', description: 'Làm và đông lạnh thức ăn để dùng sau', icon: '🧊', category: 'mealprep', points: 60, difficulty: 'medium' },
];

export class Challenge {
  /**
   * Lấy challenge của ngày hôm nay
   * Hệ thống tự động chọn từ danh sách templates dựa trên:
   * - Ngày trong năm (deterministic - cùng ngày = cùng challenge)
   * - Mùa trong năm
   * - Cân bằng difficulty và category
   */
  static async getTodayChallenge() {
    const { db } = await connectToDatabase();
    
    // Tính ngày hiện tại (reset lúc 0h)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Kiểm tra xem đã có challenge hôm nay chưa
    let challenge = await db.collection(COLLECTION_NAME).findOne({
      date: today
    });
    
    if (!challenge) {
      // Logic chọn challenge thông minh
      const selectedTemplate = this.selectSmartChallenge(today);
      
      challenge = {
        ...selectedTemplate,
        date: today,
        expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        participantCount: 0,
        completedCount: 0,
        createdAt: new Date(),
      };
      
      await db.collection(COLLECTION_NAME).insertOne(challenge);
    }
    
    return challenge;
  }

  /**
   * Chọn challenge thông minh dựa trên ngày, mùa, và cân bằng
   */
  static selectSmartChallenge(date) {
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0 = Sunday
    
    // Xác định mùa
    const isSpring = month >= 3 && month <= 5;
    const isSummer = month >= 6 && month <= 8;
    const isFall = month >= 9 && month <= 11;
    const isWinter = month === 12 || month <= 2;
    
    // Kiểm tra ngày lễ đặc biệt
    const isTet = (month === 1 || month === 2) && day <= 15; // Tết Nguyên Đán
    const isMidAutumn = month === 9 && day >= 15 && day <= 20; // Tết Trung Thu
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Lọc templates theo điều kiện
    let filteredTemplates = [...CHALLENGE_TEMPLATES];
    
    // Ưu tiên món theo mùa
    if (isSummer) {
      // Mùa hè: ưu tiên món mát, nhanh, healthy
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === 'healthy' || 
        t.category === 'quick' || 
        t.category === 'seasonal' ||
        t.title.includes('mùa hè')
      );
    } else if (isWinter) {
      // Mùa đông: ưu tiên món nóng, soup, hầm
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === 'soup' || 
        t.category === 'technique' ||
        t.title.includes('mùa đông') ||
        t.title.includes('hầm')
      );
    }
    
    // Ngày lễ đặc biệt
    if (isTet) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === 'vietnamese' || 
        t.title.includes('Tết')
      );
    } else if (isMidAutumn) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.category === 'dessert' || 
        t.category === 'baking'
      );
    }
    
    // Cuối tuần: ưu tiên món khó hơn, family
    if (isWeekend && filteredTemplates.length > 10) {
      const weekendTemplates = filteredTemplates.filter(t => 
        t.difficulty === 'hard' || 
        t.category === 'family' ||
        t.points >= 65
      );
      if (weekendTemplates.length > 0) {
        filteredTemplates = weekendTemplates;
      }
    }
    
    // Nếu không có template phù hợp, dùng tất cả
    if (filteredTemplates.length === 0) {
      filteredTemplates = CHALLENGE_TEMPLATES;
    }
    
    // Chọn template dựa trên dayOfYear (deterministic)
    // Sử dụng hash để phân bố đều
    const hash = (dayOfYear * 17 + month * 31 + day * 7) % filteredTemplates.length;
    const selectedIndex = Math.abs(hash);
    
    return filteredTemplates[selectedIndex] || CHALLENGE_TEMPLATES[dayOfYear % CHALLENGE_TEMPLATES.length];
  }

  /**
   * Lấy tiến độ challenge của user
   */
  static async getUserChallengeProgress(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const challenge = await this.getTodayChallenge();
    
    // Lấy progress của user
    const userChallenge = await db.collection(USER_CHALLENGES_COLLECTION).findOne({
      userId: userObjId,
      challengeId: challenge._id
    });
    
    if (userChallenge) {
      return {
        challenge,
        userProgress: {
          joined: userChallenge.joined || false,
          completed: userChallenge.completed || false,
          completedAt: userChallenge.completedAt || null,
          proofRecipeId: userChallenge.proofRecipeId || null,
          proofImageUrl: userChallenge.proofImageUrl || null,
        }
      };
    }
    
    return {
      challenge,
      userProgress: {
        joined: false,
        completed: false,
        completedAt: null,
        proofRecipeId: null,
        proofImageUrl: null,
      }
    };
  }

  /**
   * Tham gia challenge
   */
  static async joinChallenge(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const challenge = await this.getTodayChallenge();
    
    // Kiểm tra đã join chưa
    const existing = await db.collection(USER_CHALLENGES_COLLECTION).findOne({
      userId: userObjId,
      challengeId: challenge._id
    });
    
    if (existing) {
      return { alreadyJoined: true, userChallenge: existing };
    }
    
    const userChallenge = {
      userId: userObjId,
      challengeId: challenge._id,
      joined: true,
      joinedAt: new Date(),
      completed: false,
      completedAt: null,
      proofRecipeId: null,
    };
    
    await db.collection(USER_CHALLENGES_COLLECTION).insertOne(userChallenge);
    
    // Tăng số người tham gia
    await db.collection(COLLECTION_NAME).updateOne(
      { _id: challenge._id },
      { $inc: { participantCount: 1 } }
    );
    
    return { alreadyJoined: false, userChallenge };
  }

  /**
   * Hoàn thành challenge
   */
  static async completeChallenge(userId, recipeId, proofImageUrl = null) {
    try {
      console.log('completeChallenge called with:', { userId, recipeId, hasProofImage: !!proofImageUrl });
      
      if (!userId) {
        console.error('userId is undefined or null');
        return { error: 'Thiếu thông tin người dùng' };
      }
      
      const { db } = await connectToDatabase();
      const { ObjectId } = await import('mongodb');
      
      const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const recipeObjId = recipeId ? (typeof recipeId === 'string' ? new ObjectId(recipeId) : recipeId) : null;
      
      console.log('Getting today challenge...');
      const challenge = await this.getTodayChallenge();
      console.log('Today challenge:', challenge ? { _id: challenge._id, points: challenge.points } : 'null');
      
      if (!challenge || !challenge._id) {
        console.error('Challenge not found or invalid');
        return { error: 'Không tìm thấy thử thách' };
      }
      
      // Đảm bảo challenge._id là ObjectId
      const challengeId = challenge._id instanceof ObjectId ? challenge._id : new ObjectId(challenge._id);
      console.log('Challenge ID:', challengeId.toString());
      
      // Kiểm tra đã join chưa
      console.log('Finding user challenge...');
      const userChallenge = await db.collection(USER_CHALLENGES_COLLECTION).findOne({
        userId: userObjId,
        challengeId: challengeId
      });
      console.log('User challenge found:', userChallenge ? { _id: userChallenge._id, joined: userChallenge.joined, completed: userChallenge.completed } : 'null');
      
      if (!userChallenge) {
        console.log('User has not joined the challenge');
        return { error: 'Bạn chưa tham gia thử thách này' };
      }
      
      // Kiểm tra đã hoàn thành chưa (check cả completed và completedAt)
      if (userChallenge.completed === true) {
        console.log('User already completed challenge:', {
          userId: userObjId ? userObjId.toString() : 'undefined',
          challengeId: challengeId ? challengeId.toString() : 'undefined',
          completed: userChallenge.completed,
          completedAt: userChallenge.completedAt
        });
        return { error: 'Bạn đã hoàn thành thử thách này rồi' };
      }
      
      // Đánh dấu hoàn thành
      const updateData = {
        completed: true,
        completedAt: new Date(),
        proofRecipeId: recipeObjId,
      };
      
      if (proofImageUrl) {
        updateData.proofImageUrl = proofImageUrl;
      }
      
      console.log('Updating user challenge with data:', updateData);
      const updateResult = await db.collection(USER_CHALLENGES_COLLECTION).updateOne(
        { _id: userChallenge._id },
        {
          $set: updateData
        }
      );
      console.log('Update result:', { matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
      
      if (updateResult.matchedCount === 0) {
        console.error('Failed to update user challenge:', userChallenge._id);
        return { error: 'Không thể cập nhật trạng thái thử thách' };
      }
      
      // Tăng số người hoàn thành
      console.log('Incrementing completedCount for challenge...');
      const challengeUpdateResult = await db.collection(COLLECTION_NAME).updateOne(
        { _id: challengeId },
        { $inc: { completedCount: 1 } }
      );
      console.log('Challenge update result:', { matchedCount: challengeUpdateResult.matchedCount, modifiedCount: challengeUpdateResult.modifiedCount });
      
      if (challengeUpdateResult.matchedCount === 0) {
        console.warn('Challenge not found when updating completedCount:', challengeId);
      }
      
      const pointsEarned = challenge.points || 0;
      console.log('Returning success with pointsEarned:', pointsEarned);
      return {
        success: true,
        pointsEarned: pointsEarned,
        challenge
      };
    } catch (error) {
      console.error('Error in completeChallenge:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error; // Re-throw để route handler catch
    }
  }

  /**
   * Lấy lịch sử challenge của user
   */
  static async getUserChallengeHistory(userId, limit = 10) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const history = await db.collection(USER_CHALLENGES_COLLECTION)
      .aggregate([
        {
          $match: { userId: userObjId }
        },
        {
          $lookup: {
            from: COLLECTION_NAME,
            localField: 'challengeId',
            foreignField: '_id',
            as: 'challenge'
          }
        },
        {
          $unwind: '$challenge'
        },
        {
          $sort: { joinedAt: -1 }
        },
        {
          $limit: limit
        }
      ])
      .toArray();
    
    return history;
  }

  /**
   * Lấy thống kê challenge của user
   */
  static async getUserChallengeStats(userId) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    
    const stats = await db.collection(USER_CHALLENGES_COLLECTION)
      .aggregate([
        {
          $match: { userId: userObjId }
        },
        {
          $group: {
            _id: null,
            totalJoined: { $sum: 1 },
            totalCompleted: { $sum: { $cond: ['$completed', 1, 0] } },
          }
        }
      ])
      .toArray();
    
    return stats[0] || { totalJoined: 0, totalCompleted: 0 };
  }

  /**
   * Lấy danh sách người đã hoàn thành challenge theo ngày
   */
  static async getChallengeCompletions(challengeDate) {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Parse date - có thể là string hoặc Date object
    let dateQuery;
    if (typeof challengeDate === 'string') {
      // Nếu là string, parse thành Date object (format: YYYY-MM-DD hoặc ISO string)
      const parsedDate = new Date(challengeDate);
      parsedDate.setHours(0, 0, 0, 0);
      dateQuery = parsedDate;
    } else {
      dateQuery = challengeDate;
    }
    
    console.log('Searching challenge with date:', dateQuery);
    
    // Tìm challenge theo ngày
    const challenge = await db.collection(COLLECTION_NAME).findOne({
      date: dateQuery
    });
    
    console.log('Challenge found:', challenge ? { _id: challenge._id, date: challenge.date } : 'null');
    
    if (!challenge) {
      console.log('No challenge found for date:', dateQuery);
      return [];
    }
    
    // Lấy danh sách user đã hoàn thành challenge này
    const completions = await db.collection(USER_CHALLENGES_COLLECTION)
      .aggregate([
        {
          $match: {
            challengeId: challenge._id,
            completed: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true // Nếu không tìm thấy user, vẫn giữ record
          }
        },
        {
          $project: {
            userId: { $toString: '$userId' },
            userName: { $ifNull: ['$user.name', 'Người dùng'] },
            userAvatar: '$user.avatar',
            userStorage: '$user.storage',
            completedAt: 1,
            proofImageUrl: 1,
          }
        },
        {
          $sort: { completedAt: -1 }
        }
      ])
      .toArray();
    
    console.log('Completions found:', completions.length);
    
    return completions;
  }
}

