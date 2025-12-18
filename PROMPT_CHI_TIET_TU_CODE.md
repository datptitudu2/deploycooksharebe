# 📝 PROMPT CHI TIẾT DỰA TRÊN CODE THỰC TẾ - COOKSHARE

## 🎯 LỜI MỞ ĐẦU CHO GPT/GEMINI

Bạn là trợ lý AI chuyên viết báo cáo đồ án. Nhiệm vụ: viết báo cáo 25 trang về ứng dụng **CookShare** dựa trên **CODE THỰC TẾ** đã được cung cấp. **KHÔNG được tự bịa ra** các tính năng, phải mô tả chính xác theo code.

**YÊU CẦU:**
- 25 trang (không tính bìa, mục lục)
- Format: Times New Roman, 13pt, 1.5 spacing
- **CHỪA CHỖ** cho sơ đồ và hình ảnh UI/UX từ Figma
- **KHÔNG chèn code** - chỉ mô tả logic và kiến trúc
- Số liệu cụ thể từ code thực tế

---

## 📋 THÔNG TIN DỰ ÁN TỪ CODE

### **Công nghệ (từ package.json và code):**
- **Frontend:** React Native 0.81.5, Expo SDK 54, TypeScript 5.9.2
- **Backend:** Node.js 18+, Express.js
- **Database:** MongoDB (12 collections)
- **AI:** Groq API (Llama 3.1 8B Instant) cho text, OpenAI Vision API (GPT-4o) cho image
- **Storage:** Cloudinary
- **Deployment:** Railway (backend), Expo EAS (mobile app)

### **Package Name:** com.datptitudu.cookshareapp
### **Version:** 1.0.0 (versionCode: 4)
### **Backend URL:** https://deploycooksharebe-production.up.railway.app

---

## 🎨 TÍNH NĂNG CHI TIẾT TỪ CODE THỰC TẾ

### **1. QUẢN LÝ NGƯỜI DÙNG (Từ authRoutes.js, userRoutes.js)**

**1.1. Authentication (authRoutes.js):**
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập (trả về JWT token)
- `POST /api/auth/forgot-password` - Gửi OTP qua email
- `POST /api/auth/reset-password` - Reset mật khẩu sau khi xác thực OTP

**1.2. User Management (userRoutes.js):**
- `GET /api/user/profile` - Lấy thông tin profile của user hiện tại
- `PUT /api/user/profile` - Cập nhật thông tin (tên, bio)
- `POST /api/user/avatar` - Upload avatar (Multer middleware, lưu Cloudinary)
- `POST /api/user/change-password` - Đổi mật khẩu
- `GET /api/user/:userId` - Xem profile người dùng khác
- `GET /api/user/chefs` - Lấy danh sách tất cả chefs
- `GET /api/user/users` - Lấy danh sách tất cả users

**1.3. Follow System (userRoutes.js):**
- `POST /api/user/:userId/follow` - Follow/Unfollow user (toggle)
- `GET /api/user/followers` - Lấy danh sách followers của user hiện tại
- `GET /api/user/following` - Lấy danh sách following của user hiện tại
- `PUT /api/user/lastSeen` - Cập nhật lastSeen (gọi khi user online)

**Logic từ code:**
- Follow/Unfollow là toggle (nếu đã follow thì unfollow, chưa follow thì follow)
- Khi follow, tạo notification cho user được follow
- Followers/Following được lưu trong mảng `followers[]` và `following[]` trong collection `users`

---

### **2. QUẢN LÝ CÔNG THỨC (Từ recipeManagementRoutes.js)**

**2.1. CRUD Operations:**
- `POST /api/recipe-management` - Tạo công thức mới
  - Upload nhiều ảnh (max 10 ảnh) qua `uploadRecipeMedia.fields([{ name: 'images', maxCount: 10 }])`
  - Upload video (max 5 videos, 100MB mỗi video) qua `{ name: 'videos', maxCount: 5 }`
  - Body: name, description, ingredients (array), instructions (array), category, difficulty, prepTime, cookTime, servings, dietMode, tags
  - **Logic:** Sau khi tạo recipe, tự động gọi `Achievement.incrementRecipeCreated()` để cộng điểm (20-50 XP tùy độ khó) và `Achievement.updateStreak()` để tăng streak
  - Tạo notifications cho followers khi đăng recipe mới

- `GET /api/recipe-management` - Lấy danh sách công thức (có pagination, filter)
- `GET /api/recipe-management/:recipeId` - Xem chi tiết công thức (optionalAuth - không cần đăng nhập nhưng nếu có auth thì check liked/saved)
- `PUT /api/recipe-management/:recipeId` - Cập nhật công thức (chỉ author mới được)
- `DELETE /api/recipe-management/:recipeId` - Xóa công thức (chỉ author mới được)

**2.2. User's Recipes:**
- `GET /api/recipe-management/my/recipes` - Lấy công thức của mình (authenticate required)
- `GET /api/recipe-management/saved` - Lấy công thức đã lưu (authenticate required)

**2.3. Discovery & Search:**
- `GET /api/recipe-management/trending` - Lấy công thức trending (sắp xếp theo lượt like)
- `GET /api/recipe-management/newest` - Lấy công thức mới nhất
- `GET /api/recipe-management/search?q=keyword` - Tìm kiếm (theo tên, nguyên liệu)
- `GET /api/recipe-management/category/:category` - Lấy công thức theo danh mục
- `GET /api/recipe-management/categories` - Lấy danh sách tất cả categories
- `GET /api/recipe-management/featured-chefs` - Lấy đầu bếp nổi bật (có nhiều công thức nhất)
- `GET /api/recipe-management/stats` - Thống kê tổng quan

**2.4. Interactions (authenticate required):**
- `POST /api/recipe-management/:recipeId/like` - Like/Unlike công thức (toggle)
- `POST /api/recipe-management/:recipeId/save` - Lưu/Bỏ lưu công thức (toggle)
- `POST /api/recipe-management/:recipeId/rate` - Đánh giá công thức (1-5 sao)

**2.5. Comments System:**
- `GET /api/recipe-management/:recipeId/comments` - Lấy comments (optionalAuth)
- `POST /api/recipe-management/:recipeId/comments` - Thêm comment (có thể kèm ảnh qua `uploadCommentImage.single('image')`)
- `PUT /api/recipe-management/:recipeId/comments/:commentId` - Cập nhật comment (chỉ author)
- `DELETE /api/recipe-management/:recipeId/comments/:commentId` - Xóa comment (chỉ author)

**2.6. Reply to Comments:**
- `POST /api/recipe-management/:recipeId/comments/:commentId/replies` - Thêm reply (có thể kèm ảnh)
- `PUT /api/recipe-management/:recipeId/comments/:commentId/replies/:replyId` - Cập nhật reply
- `DELETE /api/recipe-management/:recipeId/comments/:commentId/replies/:replyId` - Xóa reply

**Logic từ code:**
- Comments có thể có ảnh (upload qua Multer)
- Reply chỉ author của recipe mới được reply
- Comments và replies được lưu trong collection `recipe_comments` với cấu trúc nested

---

### **3. AI CHATBOT (Từ chatbotRoutes.js, chatbotSelfHostedController.js)**

**3.1. Routes (chatbotRoutes.js):**
- `POST /api/chatbot/message` - Gửi tin nhắn (authenticate required)
  - Nếu có file (req.file) → gọi `sendMessageWithImage()`
  - Nếu không có file → gọi `sendMessage()`
  - Upload qua Multer: `upload.single('image')` (max 10MB)

- `GET /api/chatbot/history` - Lấy lịch sử chat
- `DELETE /api/chatbot/history` - Xóa lịch sử chat
- `GET /api/chatbot/check-apikey` - Kiểm tra API status

**3.2. Logic xử lý (chatbotSelfHostedController.js):**

**Text Messages (sendMessage):**
- Sử dụng **Groq API** với model `llama-3.1-8b-instant`
- System prompt có **200+ dòng** với các phần:
  - Phong cách trả lời (thân thiện, dùng emoji)
  - Chức năng chính (gợi ý món, công thức, lên lịch ăn)
  - Chế độ ăn đặc biệt (giảm cân, tăng cân, chay, keto, low-carb)
  - Đặc sản vùng miền (Bắc, Trung, Nam)
  - Món theo bữa ăn (sáng, trưa, tối)
  - Món theo thời tiết (nóng, lạnh)
  - Món quốc tế (Hàn, Nhật, Thái, Ý)
  - Format công thức chuẩn (tên món in đậm, nguyên liệu bullet points, hướng dẫn numbered steps)
- Sau khi nhận response từ Groq, tự động enrich với YouTube links qua `enrichWithYouTubeLinks()`
- Lưu vào `ChatbotHistory` collection

**Image Messages (sendMessageWithImage):**
- Sử dụng **OpenAI Vision API** với model `gpt-4o`
- Gửi ảnh dưới dạng base64
- Prompt: "Nhận diện các nguyên liệu trong ảnh và đề xuất món ăn phù hợp"
- Sau khi nhận diện nguyên liệu, gọi Groq API để tư vấn món ăn từ nguyên liệu đó
- Enrich với YouTube links
- Lưu vào `ChatbotHistory`

**3.3. System Prompt chi tiết (từ code):**
- Model đã train: `uduptit/cookbot-vietnamese` (Hugging Face)
- Training data: `dataset_cookbot.jsonl` (50+ samples)
- System prompt fine-tuned với 200+ dòng hướng dẫn

**3.4. YouTube Integration:**
- Tự động tìm video YouTube liên quan đến món ăn được đề xuất
- Sử dụng YouTube Data API
- Thêm links vào response

---

### **4. LẬP KẾ HOẠCH BỮA ĂN (Từ mealPlanningRoutes.js)**

**4.1. Routes:**
- `POST /api/meal-planning/generate-week` - AI tạo thực đơn tuần (authenticate required)
  - Input: dietMode, preferences, budget (optional)
  - Sử dụng Groq API để generate 7 ngày x 3 bữa (21 meals)
  - Tự động lưu vào database

- `GET /api/meal-planning/week` - Lấy lịch ăn theo tuần
- `POST /api/meal-planning/add` - Thêm món vào lịch
  - Body: date, mealType (breakfast/lunch/dinner), recipeId (optional), mealName, mealDescription
- `PUT /api/meal-planning/update` - Cập nhật meal plan
- `DELETE /api/meal-planning/delete` - Xóa món khỏi lịch
  - Body: date, mealType

- `POST /api/meal-planning/start-timer` - Bắt đầu timer nấu ăn

**4.2. Logic từ code:**
- Meal plans được lưu trong collection `meal_plans` với cấu trúc:
  - userId, date, breakfast, lunch, dinner
  - Mỗi meal có: recipeId (optional), mealName, mealDescription, cooked (boolean), cookedAt (date)
- Khi đánh dấu cooked, gọi `Achievement.markMealAsCooked()` để cộng điểm

---

### **5. HỆ THỐNG THÀNH TÍCH (Từ achievementRoutes.js, Achievement.js)**

**5.1. Routes (achievementRoutes.js):**
- `GET /api/achievements` - Lấy thành tích của user
- `GET /api/achievements/badges` - Lấy danh sách badges
- `POST /api/achievements/streak` - Update streak (thường được gọi tự động)
- `GET /api/achievements/stats` - Thống kê tổng quan (cho profile screen)
- `POST /api/achievements/mark-meal-cooked` - Đánh dấu món đã nấu (cộng điểm)
- `GET /api/achievements/leaderboard` - Bảng xếp hạng

**5.2. Level System (từ Achievement.js - addPoints):**
- **Công thức tính level:** `Math.floor(points / 100) + 1`
- Mỗi 100 điểm = 1 level
- Level bắt đầu từ 1

**5.3. Level Up Rewards (từ code):**
```javascript
const levelRewards = {
  2: { points: 20, badge: null },
  3: { points: 30, badge: null },
  5: { points: 50, badge: 'rising_star' },
  10: { points: 100, badge: 'master_chef' },
  20: { points: 200, badge: 'legend' },
};
```
- Level 2: +20 điểm thưởng
- Level 3: +30 điểm thưởng
- Level 5: +50 điểm + Badge "Rising Star"
- Level 10: +100 điểm + Badge "Master Chef"
- Level 20: +200 điểm + Badge "Legend"

**5.4. XP Points (từ code):**

**Tạo công thức (incrementRecipeCreated):**
- Dễ: 20 XP
- Trung bình: 35 XP
- Khó: 50 XP

**Nấu món (incrementMealCooked, calculateMealCookedPoints):**
- Dễ: 12 XP
- Trung bình: 20 XP
- Khó: 30 XP
- Có penalty nếu nấu muộn (quá thời gian đã set)

**Hoàn thành challenge:**
- 50 XP (từ challengeRoutes.js)

**5.5. Streak System (từ Achievement.js - updateStreak):**
- `currentStreak`: Chuỗi ngày hiện tại
- `longestStreak`: Chuỗi dài nhất đã đạt
- `lastActiveDate`: Ngày hoạt động cuối cùng
- **Logic:**
  - Nếu `diffDays === 0` (cùng ngày) → không làm gì
  - Nếu `diffDays === 1` (ngày tiếp theo) → tăng streak
  - Nếu `diffDays > 1` (gián đoạn) → reset streak = 1
- Streak được update khi:
  - Đăng công thức mới (`createRecipe` gọi `updateStreak`)
  - Đánh dấu món đã nấu (`markMealAsCooked` gọi `updateStreakForDate`)

**5.6. Badges (từ code):**
- `first_recipe`: Tạo công thức đầu tiên
- `streak_7`: 7 ngày liên tiếp
- `streak_30`: 30 ngày liên tiếp
- `chef_10`: 10 công thức
- `rising_star`: Level 5
- `master_chef`: Level 10
- `legend`: Level 20

**5.7. Stats (từ getStats):**
- level, points
- currentStreak, longestStreak
- totalMealsCooked
- totalRecipesCreated
- totalLikesReceived
- totalRatingsReceived
- totalFollowers, totalFollowing
- badges (array)

---

### **6. THỬ THÁCH (Từ challengeRoutes.js)**

**6.1. Routes:**
- `GET /api/challenges/today` - Lấy challenge hôm nay (optionalAuth)
  - Nếu đã đăng nhập: trả về cả `userProgress` (joined, completed, completedAt)
  - Nếu chưa đăng nhập: chỉ trả về challenge info
  - Có `timeRemaining` (thời gian còn lại)

- `POST /api/challenges/join` - Tham gia challenge (authenticate required)
  - Nếu đã join rồi → trả về "Bạn đã tham gia thử thách này rồi"

- `POST /api/challenges/complete` - Hoàn thành challenge (authenticate required)
  - Upload proof image qua `uploadChallengeProof.single('proofImage')`
  - Body: recipeId (optional)
  - **Logic:**
    - Gọi `Challenge.completeChallenge()` → trả về `pointsEarned` (50 XP)
    - Cộng điểm qua `Achievement.addPoints(userId, 50)`
    - Check level up và unlock badge nếu có
    - Trả về: pointsEarned, challenge, leveledUp, newLevel, newPoints, reward, proofImageUrl

- `GET /api/challenges/history` - Lịch sử challenge của user
- `GET /api/challenges/stats` - Thống kê challenge của user
- `GET /api/challenges/completions/:date` - Lấy danh sách người đã hoàn thành challenge theo ngày (optionalAuth)

**6.2. Logic từ code:**
- Challenge có `expiresAt` (thời gian hết hạn)
- Proof image được upload lên Cloudinary (folder: 'challenge-proof')
- Khi hoàn thành, tự động cộng 50 XP và check level up

---

### **7. TƯƠNG TÁC CỘNG ĐỒNG**

**7.1. Cooking Tips/Stories (storyRoutes.js):**
- `GET /api/stories` - Lấy tất cả stories đang active (limit 20)
- `GET /api/stories/tips` - Lấy cooking tips (10 tips mới nhất)
  - Sử dụng aggregation với `$lookup` để lấy user info
  - Format avatar URLs
- `GET /api/stories/user/:userId` - Lấy stories của 1 user
- `POST /api/stories` - Tạo story mới (authenticate required)
  - Body: type ('tip'), tipTitle, tipContent, content, thumbnail, caption, duration
  - Nếu là tip mới, gửi notification cho tất cả users
- `POST /api/stories/:storyId/view` - Đánh dấu đã xem story
- `POST /api/stories/:storyId/like` - Like/Unlike story (toggle)
- `DELETE /api/stories/:storyId` - Xóa story (chỉ author)

**7.2. Direct Messaging (messageRoutes.js):**
- `POST /api/messages/send` - Gửi tin nhắn (authenticate required)
  - Upload ảnh hoặc voice qua `upload.fields([{ name: 'image' }, { name: 'voice' }])`
  - Body: recipientId, content, type ('text'/'image'/'voice')
- `GET /api/messages/conversation/:partnerId` - Lấy conversation giữa 2 users
- `GET /api/messages/conversations` - Lấy danh sách conversations
- `GET /api/messages/unread-count` - Đếm số unread messages
- `PUT /api/messages/:messageId/reaction` - Thêm/xóa cảm xúc (emoji reaction)
- `DELETE /api/messages/:messageId` - Xóa tin nhắn (thu hồi)
- `DELETE /api/messages/conversation/:partnerId` - Xóa toàn bộ cuộc trò chuyện

**7.3. Notifications (notificationRoutes.js):**
- `GET /api/notifications` - Lấy danh sách notifications (có pagination)
- `GET /api/notifications/unread-count` - Lấy số notifications chưa đọc
- `PUT /api/notifications/:notificationId/read` - Đánh dấu đã đọc
- `PUT /api/notifications/read-all` - Đánh dấu tất cả đã đọc
- `DELETE /api/notifications/:notificationId` - Xóa notification
- `DELETE /api/notifications/read` - Xóa tất cả notifications đã đọc
- `POST /api/notifications/push-token` - Lưu push token (Expo Notifications)

**Types of notifications (từ notificationHelper.js):**
- New recipe từ user đang follow
- New tip từ cộng đồng
- Like/comment công thức của mình
- Follow mình
- Challenge mới

---

## 📊 CẤU TRÚC DATABASE (12 COLLECTIONS)

Từ code, các collections chính:

1. **users** - Thông tin người dùng
   - _id, email, password (hashed), name, avatar, bio, storage ('local'/'cloud')
   - followers[], following[]
   - createdAt, updatedAt

2. **recipes** - Công thức nấu ăn
   - _id, authorId, name, description, ingredients[], instructions[]
   - images[], videos[]
   - category, difficulty, prepTime, cookTime, servings, dietMode, tags[]
   - likeCount, saveCount, rating (average), ratingCount
   - authorName, authorAvatar
   - createdAt, updatedAt

3. **recipe_likes** - Like công thức
   - userId, recipeId, createdAt

4. **recipe_saves** - Lưu công thức
   - userId, recipeId, createdAt

5. **recipe_comments** - Bình luận công thức
   - _id, recipeId, userId, content, image (optional)
   - parentId (null nếu là comment, commentId nếu là reply)
   - replies[] (nested)
   - createdAt, updatedAt

6. **user_achievements** - Thành tích người dùng
   - userId, level, points
   - currentStreak, longestStreak, lastActiveDate
   - totalMealsCooked, totalRecipesCreated
   - totalLikesReceived, totalRatingsReceived
   - totalFollowers, totalFollowing
   - badges[] (array of badge names)

7. **meal_plans** - Lịch ăn
   - userId, date
   - breakfast, lunch, dinner (mỗi meal có: recipeId, mealName, mealDescription, cooked, cookedAt)

8. **challenges** - Thử thách
   - _id, title, description, points, date, expiresAt
   - icon, color
   - participantCount, completedCount

9. **user_challenges** - User tham gia challenge
   - userId, challengeId
   - joined, completed, completedAt
   - proofImageUrl

10. **stories** - Mẹo nấu ăn
    - _id, userId, userName, userAvatar
    - type ('tip'), tipTitle, tipContent
    - viewCount, likeCount
    - createdAt

11. **messages** - Tin nhắn
    - _id, senderId, recipientId
    - content, type ('text'/'image'/'voice')
    - imageUrl, voiceUrl (nếu có)
    - reactions[] (emoji reactions)
    - read, readAt
    - createdAt

12. **notifications** - Thông báo
    - _id, userId, type
    - title, message, imageUrl
    - relatedId (recipeId, userId, challengeId...)
    - read, readAt
    - createdAt

13. **chatbot_history** - Lịch sử chat với AI
    - _id, userId, messages[] (array of { role: 'user'/'assistant', content, imageUrl })
    - createdAt, updatedAt

---

## 🏗️ KIẾN TRÚC HỆ THỐNG TỪ CODE

### **Backend Structure:**
```
backend/
├── src/
│   ├── controllers/     # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── recipeManagementController.js
│   │   ├── chatbotSelfHostedController.js
│   │   ├── mealPlanningController.js
│   │   ├── achievementController.js
│   │   ├── challengeController.js
│   │   ├── messageController.js
│   │   ├── notificationController.js
│   │   └── storyController.js
│   ├── models/          # Database models
│   │   ├── User.js
│   │   ├── Recipe.js
│   │   ├── Achievement.js
│   │   ├── MealPlan.js
│   │   ├── Challenge.js
│   │   ├── Story.js
│   │   ├── Message.js
│   │   └── ChatbotHistory.js
│   ├── routes/          # API routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── recipeManagementRoutes.js
│   │   ├── chatbotRoutes.js
│   │   ├── mealPlanningRoutes.js
│   │   ├── achievementRoutes.js
│   │   ├── challengeRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── storyRoutes.js
│   ├── middleware/       # Middleware
│   │   ├── auth.js (JWT authentication)
│   │   └── upload.js (Multer config)
│   ├── utils/           # Utilities
│   │   ├── storage.js (Cloudinary/local storage)
│   │   ├── youtubeHelper.js
│   │   └── notificationHelper.js
│   └── config/          # Configuration
│       └── database.js (MongoDB connection)
```

### **Frontend Structure:**
```
app/
├── (tabs)/              # Tab screens
│   ├── index.tsx        # Home
│   ├── recipes.tsx     # Recipes list
│   ├── meal-planning.tsx
│   ├── chatbot.tsx
│   └── profile.tsx
├── recipe/              # Recipe screens
│   ├── [id].tsx        # Recipe detail
│   ├── create.tsx
│   └── edit/[id].tsx
├── challenges.tsx
├── messages/            # Messaging
│   ├── index.tsx
│   └── [partnerId].tsx
├── notifications.tsx
└── user/[userId].tsx
```

---

## 📐 CẤU TRÚC BÁO CÁO (25 TRANG)

### **CHƯƠNG 1: GIỚI THIỆU (3 trang)**
- 1.1. Đặt vấn đề
- 1.2. Mục tiêu đề tài
- 1.3. Phạm vi nghiên cứu
- 1.4. Cấu trúc báo cáo

### **CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (7 trang)**
- 2.1. Phân tích yêu cầu
  - Yêu cầu chức năng (liệt kê TẤT CẢ tính năng từ code ở trên)
  - Yêu cầu phi chức năng
- 2.2. Thiết kế kiến trúc hệ thống
  - Kiến trúc tổng quan (3 tầng: Client, API Gateway, Data)
  - **[CHÈN SƠ ĐỒ KIẾN TRÚC Ở ĐÂY]**
  - Kiến trúc database (ERD với 12 collections)
  - **[CHÈN SƠ ĐỒ ERD Ở ĐÂY]**
  - Luồng xử lý dữ liệu
  - **[CHÈN SƠ ĐỒ LUỒNG AI CHATBOT Ở ĐÂY]**
  - **[CHÈN SƠ ĐỒ LUỒNG MEAL PLANNING Ở ĐÂY]**
  - **[CHÈN SƠ ĐỒ LUỒNG ACHIEVEMENT SYSTEM Ở ĐÂY]**
- 2.3. Thiết kế giao diện người dùng (UI/UX)
  - Thiết kế trên Figma
  - Design System
  - **[HÌNH ẢNH 1: DESIGN SYSTEM TỪ FIGMA]**
  - Các màn hình chính
  - **[HÌNH ẢNH 2-N: CÁC MÀN HÌNH TỪ FIGMA]**
  - Dark Mode Design
  - **[HÌNH ẢNH: DARK MODE COMPARISON]**
  - Responsive Design
  - **[HÌNH ẢNH: RESPONSIVE MOCKUPS]**
  - Prototype & Interactions
  - **[HÌNH ẢNH: PROTOTYPE FLOW]**
- 2.4. Thiết kế API
  - RESTful API endpoints (liệt kê các routes chính từ code)
  - API response format
  - **[CHÈN SƠ ĐỒ API ARCHITECTURE Ở ĐÂY]**
- 2.5. Tích hợp AI
  - AI Chatbot architecture (Groq + OpenAI Vision)
  - Meal Planning AI (Groq)
  - **[CHÈN SƠ ĐỒ AI FLOW Ở ĐÂY]**

### **CHƯƠNG 3: CÀI ĐẶT VÀ TRIỂN KHAI (5 trang)**
- 3.1. Môi trường phát triển
- 3.2. Cài đặt và cấu hình
  - Frontend setup (Expo, React Native)
  - Backend setup (Node.js, Express, MongoDB)
  - Database configuration
- 3.3. Triển khai Production
  - Backend deployment (Railway)
  - Mobile app build (Expo EAS)
  - Environment variables
- 3.4. Testing

### **CHƯƠNG 4: KẾT QUẢ VÀ ĐÁNH GIÁ (6 trang)**
- 4.1. Kết quả đạt được
  - Chức năng đã hoàn thành (liệt kê TẤT CẢ từ code)
  - Số liệu thống kê:
    - ~15,000+ dòng code
    - 50+ API endpoints (từ routes)
    - 12 database collections
    - 20+ screens
    - 30+ reusable components
- 4.2. Demo và Screenshots
  - **[HÌNH ẢNH: SCREENSHOTS TỪ APP THỰC TẾ]**
- 4.3. Đánh giá hiệu năng
- 4.4. So sánh với ứng dụng tương tự

### **CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (2 trang)**
- 5.1. Kết luận
- 5.2. Hướng phát triển

### **PHỤ LỤC (2 trang)**
- Phụ lục A: Sơ đồ Use Case
  - **[CHÈN SƠ ĐỒ USE CASE Ở ĐÂY]**
- Phụ lục B: UI/UX Design từ Figma
  - **[HÌNH ẢNH TỔNG HỢP: TẤT CẢ MÀN HÌNH TỪ FIGMA]**

---

## ✅ HƯỚNG DẪN CHO GPT/GEMINI

**Khi viết báo cáo:**

1. **Mô tả chính xác từ code:**
   - Không tự bịa ra tính năng
   - Dựa vào routes, controllers, models đã cung cấp
   - Mô tả logic xử lý từ code thực tế

2. **CHỪA CHỖ cho sơ đồ và hình ảnh:**
   - Đánh dấu rõ: `[CHÈN SƠ ĐỒ ... Ở ĐÂY]` hoặc `[HÌNH ẢNH ... TỪ FIGMA]`
   - Mô tả nội dung cần có
   - Đặt ở vị trí phù hợp

3. **KHÔNG chèn code:**
   - Chỉ mô tả logic, flow, kiến trúc
   - Có thể dùng pseudocode nếu cần minh họa

4. **Số liệu cụ thể:**
   - 50+ API endpoints (đếm từ routes)
   - 12 collections (từ database)
   - Level system: `Math.floor(points / 100) + 1`
   - XP: 20-50 (recipe), 12-30 (cook), 50 (challenge)

5. **Mô tả flow xử lý:**
   - Authentication: JWT token
   - File upload: Multer → Cloudinary
   - AI: Groq (text) → OpenAI Vision (image) → YouTube enrichment
   - Achievement: addPoints → check level up → unlock badge

6. **Văn phong học thuật:**
   - Ngôi thứ 3
   - Tránh ngôn ngữ đời thường
   - Có câu mở đầu và kết luận cho mỗi phần

---

## 🎯 PROMPT CUỐI CÙNG

Bạn hãy viết báo cáo đồ án 25 trang về ứng dụng **CookShare** dựa trên **CODE THỰC TẾ** đã được cung cấp ở trên. 

**YÊU CẦU:**
1. ✅ Mô tả chính xác các tính năng từ code (không tự bịa)
2. ✅ Chừa chỗ rõ ràng cho sơ đồ và hình ảnh UI/UX từ Figma
3. ✅ KHÔNG chèn code, chỉ mô tả logic và kiến trúc
4. ✅ Số liệu cụ thể từ code (50+ endpoints, 12 collections, level formula...)
5. ✅ Văn phong học thuật, chuyên nghiệp
6. ✅ Đủ 25 trang

Bắt đầu viết từ Chương 1 và tiếp tục đến hết Phụ lục.

