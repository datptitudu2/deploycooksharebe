# 📋 BẢN THẢO BÁO CÁO ĐỒ ÁN - COOKSHARE APP
## Ứng dụng Chia sẻ Công thức Nấu ăn Thông minh với AI

---

## 📐 CẤU TRÚC BÁO CÁO (25 TRANG)

### **CHƯƠNG 1: GIỚI THIỆU (3 trang)**
### **CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (7 trang)**
### **CHƯƠNG 3: CÀI ĐẶT VÀ TRIỂN KHAI (5 trang)**
### **CHƯƠNG 4: KẾT QUẢ VÀ ĐÁNH GIÁ (6 trang)**
### **CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (2 trang)**
### **PHỤ LỤC (2 trang)**

---

## 📝 NỘI DUNG CHI TIẾT TỪNG CHƯƠNG

---

## CHƯƠNG 1: GIỚI THIỆU (3 trang)

### 1.1. Đặt vấn đề (0.5 trang)
**Nội dung:**
- Bối cảnh: Nhu cầu chia sẻ và học nấu ăn ngày càng tăng
- Vấn đề hiện tại:
  - Khó khăn trong việc tìm công thức phù hợp với sở thích và chế độ ăn
  - Thiếu công cụ hỗ trợ lập kế hoạch bữa ăn thông minh
  - Chưa có nền tảng tích hợp AI để tư vấn món ăn cá nhân hóa
  - Thiếu động lực để duy trì thói quen nấu ăn hàng ngày

### 1.2. Mục tiêu đề tài (0.5 trang)
**Nội dung:**
- **Mục tiêu chính:**
  - Xây dựng ứng dụng mobile chia sẻ công thức nấu ăn với cộng đồng
  - Tích hợp AI để tư vấn món ăn thông minh theo sở thích, thời tiết, chế độ ăn
  - Hỗ trợ lập kế hoạch bữa ăn tự động với AI
  - Xây dựng hệ thống gamification (level, streak, achievements) để tạo động lực
  - Tạo môi trường tương tác giữa người dùng và đầu bếp

- **Mục tiêu cụ thể:**
  - Phát triển ứng dụng React Native đa nền tảng (iOS, Android)
  - Xây dựng RESTful API backend với Node.js/Express
  - Tích hợp AI (Groq API, OpenAI Vision) cho chatbot và meal planning
  - Triển khai hệ thống lên production (Railway, Expo EAS)

### 1.3. Phạm vi nghiên cứu (0.5 trang)
**Nội dung:**
- **Phạm vi chức năng:**
  - Quản lý người dùng và xác thực (JWT)
  - CRUD công thức nấu ăn với hình ảnh/video
  - AI Chatbot tư vấn món ăn (text + vision)
  - Lập kế hoạch bữa ăn với AI
  - Hệ thống thành tích và thử thách
  - Tương tác cộng đồng (like, comment, follow)
  - Nhắn tin trực tiếp giữa người dùng
  - Thông báo push notifications

- **Phạm vi kỹ thuật:**
  - Frontend: React Native + Expo SDK 54
  - Backend: Node.js + Express.js
  - Database: MongoDB
  - AI Services: Groq API, OpenAI Vision API
  - Storage: Cloudinary
  - Deployment: Railway (backend), Expo EAS (mobile app)

### 1.4. Cấu trúc báo cáo (0.5 trang)
**Nội dung:**
- Giới thiệu cấu trúc 5 chương
- Mục đích từng chương

---

## CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (7 trang)

### 2.1. Phân tích yêu cầu (1.5 trang)

#### 2.1.1. Yêu cầu chức năng
**Nội dung chi tiết:**

**A. Quản lý người dùng:**
- Đăng ký/Đăng nhập (Email + Password)
- Quên mật khẩu (OTP qua email)
- Cập nhật thông tin cá nhân (tên, avatar, bio)
- Xem profile người dùng khác
- Theo dõi/Bỏ theo dõi người dùng
- Quản lý danh sách followers/following

**B. Quản lý công thức:**
- Tạo công thức mới (tên, mô tả, nguyên liệu, hướng dẫn, hình ảnh, video)
- Xem danh sách công thức (trending, mới nhất, theo danh mục)
- Tìm kiếm công thức (theo tên, nguyên liệu)
- Lọc công thức (danh mục, độ khó, thời gian, chế độ ăn)
- Xem chi tiết công thức
- Chỉnh sửa/Xóa công thức của mình
- Lưu/Bỏ lưu công thức yêu thích
- Đánh giá công thức (1-5 sao)
- Bình luận công thức (comment, reply)

**C. AI Chatbot:**
- Chat text với AI để tư vấn món ăn
- Gửi ảnh nguyên liệu, AI nhận diện và đề xuất món ăn (OpenAI Vision)
- Tư vấn theo chế độ ăn (giảm cân, tăng cân, chay, keto, low-carb)
- Tư vấn theo thời tiết, cảm xúc
- Tự động tìm và gắn video YouTube hướng dẫn
- Lưu lịch sử chat

**D. Lập kế hoạch bữa ăn:**
- Xem lịch ăn theo tuần/tháng
- Thêm món ăn vào lịch (từ công thức hoặc AI gợi ý)
- AI tự động tạo thực đơn tuần (Groq API)
- Đánh dấu món đã nấu
- Xem lịch sử các món đã ăn
- Nhắc nhở bữa ăn (push notifications)

**E. Hệ thống thành tích:**
- Hệ thống level và điểm kinh nghiệm (XP)
- Chuỗi ngày nấu ăn liên tiếp (streak)
- Huy hiệu (badges) khi đạt thành tích
- Bảng xếp hạng (leaderboard)
- Thống kê cá nhân (số món đã nấu, công thức đã tạo, lượt xem/like)

**F. Thử thách (Challenges):**
- Thử thách nấu ăn hàng ngày
- Tham gia thử thách
- Upload ảnh chứng minh đã hoàn thành
- Nhận điểm thưởng khi hoàn thành

**G. Tương tác cộng đồng:**
- Chia sẻ mẹo nấu ăn (Cooking Tips/Stories)
- Like/Unlike mẹo nấu ăn
- Nhắn tin trực tiếp giữa người dùng
- Thông báo (notifications) khi có tương tác

#### 2.1.2. Yêu cầu phi chức năng
- **Hiệu năng:** Response time < 2s cho API, load màn hình < 3s
- **Bảo mật:** Mã hóa mật khẩu (bcrypt), JWT authentication, HTTPS
- **Khả năng mở rộng:** Hỗ trợ 1000+ người dùng đồng thời
- **Tương thích:** iOS 13+, Android 8.0+
- **Giao diện:** Dark mode/Light mode, responsive design

### 2.2. Thiết kế kiến trúc hệ thống (1.5 trang)

#### 2.2.1. Kiến trúc tổng quan
**Sơ đồ kiến trúc 3 tầng:**

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   iOS App    │  │ Android App   │  │  Web App     │ │
│  │ (React Native│  │ (React Native│  │  (Optional)  │ │
│  │   + Expo)    │  │   + Expo)     │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼─────────────────┼───────────────────┼─────────┘
          │                 │                   │
          └─────────────────┼───────────────────┘
                            │
          ┌─────────────────▼───────────────────┐
          │         API GATEWAY LAYER            │
          │  ┌──────────────────────────────┐   │
          │  │   RESTful API (Express.js)    │   │
          │  │   - Authentication (JWT)       │   │
          │  │   - Rate Limiting             │   │
          │  │   - CORS                      │   │
          │  └──────────────┬───────────────┘   │
          └─────────────────┼────────────────────┘
                            │
          ┌─────────────────▼───────────────────┐
          │        BUSINESS LOGIC LAYER          │
          │  ┌──────────┐  ┌──────────┐        │
          │  │ Controllers│  │  Models  │        │
          │  │  Services │  │  Helpers  │        │
          │  └─────┬─────┘  └─────┬─────┘        │
          └────────┼──────────────┼─────────────┘
                   │              │
          ┌────────▼──────────────▼─────────────┐
          │         DATA LAYER                   │
          │  ┌──────────┐  ┌──────────┐         │
          │  │ MongoDB  │  │Cloudinary│         │
          │  │ (Database)│  │ (Storage)│         │
          │  └──────────┘  └──────────┘         │
          └──────────────────────────────────────┘
                            │
          ┌─────────────────▼───────────────────┐
          │      EXTERNAL SERVICES LAYER          │
          │  ┌──────────┐  ┌──────────┐         │
          │  │ Groq API │  │OpenAI API│         │
          │  │ (Text AI)│  │ (Vision) │         │
          │  └──────────┘  └──────────┘         │
          └──────────────────────────────────────┘
```

**Mô tả:**
- **Client Layer:** React Native app chạy trên iOS/Android, sử dụng Expo framework
- **API Gateway Layer:** Express.js server xử lý HTTP requests, authentication, validation
- **Business Logic Layer:** Controllers xử lý logic nghiệp vụ, Models định nghĩa cấu trúc dữ liệu
- **Data Layer:** MongoDB lưu trữ dữ liệu, Cloudinary lưu trữ media files
- **External Services:** Groq API cho text AI, OpenAI Vision API cho image recognition

#### 2.2.2. Kiến trúc database
**Sơ đồ ERD (Entity Relationship Diagram):**

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    Users    │         │   Recipes   │         │ Achievements│
├─────────────┤         ├─────────────┤         ├─────────────┤
│ _id (PK)    │◄──┐     │ _id (PK)    │         │ _id (PK)    │
│ email       │   │     │ authorId(FK)├────────►│ userId (FK) │
│ password    │   │     │ name        │         │ level       │
│ name        │   │     │ ingredients │         │ points      │
│ avatar      │   │     │ instructions│         │ streak      │
│ bio         │   │     │ images      │         │ badges      │
│ followers[] │   │     │ videos      │         └─────────────┘
│ following[] │   │     │ category    │
└─────────────┘   │     │ difficulty  │         ┌─────────────┐
                  │     │ likeCount   │         │ Meal Plans  │
┌─────────────┐   │     │ saveCount  │         ├─────────────┤
│  Comments   │   │     │ rating     │         │ _id (PK)    │
├─────────────┤   │     └─────────────┘         │ userId (FK) │
│ _id (PK)    │   │              │              │ date        │
│ recipeId(FK)├───┘              │              │ mealType    │
│ userId (FK) │                  │              │ recipeId    │
│ content     │                  │              │ cooked       │
│ parentId    │                  │              └─────────────┘
└─────────────┘                  │
                                  │
                    ┌─────────────▼─────────────┐
                    │   Recipe Saves/Likes      │
                    ├───────────────────────────┤
                    │ userId (FK)               │
                    │ recipeId (FK)             │
                    │ createdAt                 │
                    └───────────────────────────┘
```

**Các collection chính:**
1. **users:** Thông tin người dùng
2. **recipes:** Công thức nấu ăn
3. **recipe_likes:** Like công thức
4. **recipe_saves:** Lưu công thức
5. **recipe_comments:** Bình luận công thức
6. **achievements:** Thành tích người dùng
7. **meal_plans:** Lịch ăn
8. **challenges:** Thử thách
9. **stories:** Mẹo nấu ăn
10. **messages:** Tin nhắn
11. **notifications:** Thông báo
12. **chatbot_history:** Lịch sử chat với AI

### 2.3. Thiết kế giao diện người dùng (UI/UX) (2 trang)

#### 2.3.1. Thiết kế trên Figma
**Mô tả quy trình thiết kế:**
- **Research & Wireframing:**
  - Nghiên cứu các ứng dụng tương tự (Tasty, AllRecipes)
  - Tạo wireframe cho các màn hình chính
  - Xác định user flow và navigation structure

- **Design System trong Figma:**
  - **Color Palette:**
    - Primary: #FF6B6B (Coral Red) - Dùng cho buttons, highlights
    - Secondary: #4ECDC4 (Turquoise) - Dùng cho accents, links
    - Accent: #FFD93D (Yellow) - Dùng cho badges, notifications
    - Background Light: #FFFFFF, #F5F5F5
    - Background Dark: #1A1A1A, #2D2D2D
    - Text Light: #000000, #333333
    - Text Dark: #FFFFFF, #E0E0E0
  - **Typography:**
    - Headings: SF Pro Display (iOS), Roboto Bold (Android)
    - Body: SF Pro Text (iOS), Roboto Regular (Android)
    - Sizes: 24px (H1), 20px (H2), 18px (H3), 16px (Body), 14px (Caption)
  - **Spacing:**
    - Base unit: 8px
    - Padding: 16px, 24px, 32px
    - Margin: 8px, 16px, 24px
  - **Components Library:**
    - Buttons (Primary, Secondary, Outline, Icon)
    - Cards (Recipe Card, Chef Card, Tip Card)
    - Inputs (Text, Search, TextArea)
    - Modals (Alert, Bottom Sheet, Full Screen)
    - Navigation (Tab Bar, Header, Drawer)

#### 2.3.2. Các màn hình chính trong Figma
**Mô tả từng màn hình với hình ảnh từ Figma:**

**A. Onboarding & Authentication:**
- Màn hình giới thiệu app (3 slides)
- Màn hình đăng nhập
- Màn hình đăng ký
- Màn hình quên mật khẩu
- *Hình ảnh: Screenshot từ Figma design*

**B. Home Screen:**
- Header với search bar
- Carousel trending recipes (swipeable)
- Featured chefs section (horizontal scroll)
- Cooking tips section
- Today's challenge card
- Pull-to-refresh indicator
- *Hình ảnh: Figma design với annotations*

**C. Recipes Screen:**
- Filter bar (category, difficulty, time)
- Search input với suggestions
- Recipe grid/list view toggle
- Recipe cards với:
  - Image, title, chef name, rating
  - Like count, save count
  - Difficulty badge, time badge
- Empty state khi không có kết quả
- *Hình ảnh: Figma mockup*

**D. Recipe Detail Screen:**
- Hero image với gradient overlay
- Title, chef info, rating
- Action buttons (Like, Save, Share)
- Ingredients list với checkboxes
- Instructions với numbered steps
- Video section (nếu có)
- Comments section với reply
- Related recipes carousel
- *Hình ảnh: Figma design*

**E. AI Chatbot Screen:**
- Chat header với AI avatar
- Message bubbles (user/AI)
- Image preview trong chat
- Input bar với:
  - Text input
  - Image picker button
  - Send button
- Loading indicator khi AI đang xử lý
- YouTube video cards (nếu có)
- *Hình ảnh: Figma UI design*

**F. Meal Planning Screen:**
- Calendar view với navigation
- Meal cards cho mỗi ngày:
  - Breakfast, Lunch, Dinner
  - Recipe preview
  - Cooked badge
- "Generate Week Plan" button
- Empty state khi chưa có meal plan
- *Hình ảnh: Figma calendar design*

**G. Profile Screen:**
- Profile header với:
  - Avatar, name, email
  - Chef badge (nếu có)
  - Level và XP progress bar
- Stats cards (Streak, Meals Cooked, Recipes, Badges)
- Tab navigation:
  - My Recipes
  - Saved Recipes
  - Achievements
  - Settings
- *Hình ảnh: Figma profile design*

**H. Challenges Screen:**
- Today's challenge card với:
  - Title, description
  - Reward points
  - Join/Complete button
- Proof image upload
- Leaderboard section
- Challenge history
- *Hình ảnh: Figma challenge UI*

#### 2.3.3. Dark Mode Design
- Tất cả màn hình đều có dark mode variant trong Figma
- Color adjustments cho dark theme
- Contrast ratios đảm bảo accessibility
- *Hình ảnh: Side-by-side comparison (Light/Dark)*

#### 2.3.4. Responsive Design
- Thiết kế cho các kích thước màn hình:
  - iPhone SE (375x667)
  - iPhone 14 Pro (390x844)
  - iPhone 14 Pro Max (430x932)
  - Android phones (360x640, 412x915)
- Tablet layout (nếu có)
- *Hình ảnh: Responsive mockups trong Figma*

#### 2.3.5. Prototype & Interactions
- Tạo interactive prototype trong Figma
- Các interactions chính:
  - Navigation giữa các màn hình
  - Button press animations
  - Swipe gestures (carousel, recipes)
  - Pull-to-refresh
  - Bottom sheet animations
- *Hình ảnh: Figma prototype flow*

### 2.4. Thiết kế API (1 trang)

#### 2.4.1. RESTful API Endpoints
**Authentication:**
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `GET /api/auth/verify-otp` - Xác thực OTP

**Users:**
- `GET /api/user/profile` - Lấy profile
- `PUT /api/user/profile` - Cập nhật profile
- `GET /api/user/:userId` - Xem profile người khác
- `POST /api/user/follow/:userId` - Theo dõi
- `GET /api/user/followers` - Danh sách followers
- `GET /api/user/following` - Danh sách following

**Recipes:**
- `GET /api/recipe-management` - Danh sách công thức (với filter)
- `GET /api/recipe-management/:id` - Chi tiết công thức
- `POST /api/recipe-management` - Tạo công thức
- `PUT /api/recipe-management/:id` - Cập nhật công thức
- `DELETE /api/recipe-management/:id` - Xóa công thức
- `POST /api/recipe-management/:id/like` - Like/Unlike
- `POST /api/recipe-management/:id/save` - Lưu/Bỏ lưu
- `POST /api/recipe-management/:id/rating` - Đánh giá
- `POST /api/recipe-management/:id/comments` - Bình luận

**Chatbot:**
- `POST /api/chatbot/message` - Gửi tin nhắn text
- `POST /api/chatbot/message` (multipart) - Gửi tin nhắn với ảnh
- `GET /api/chatbot/history` - Lịch sử chat
- `DELETE /api/chatbot/history` - Xóa lịch sử

**Meal Planning:**
- `GET /api/meal-planning` - Lấy lịch ăn
- `POST /api/meal-planning` - Thêm món vào lịch
- `POST /api/meal-planning/generate-week` - AI tạo thực đơn tuần
- `PUT /api/meal-planning/:id` - Cập nhật meal plan
- `POST /api/achievements/cook` - Đánh dấu món đã nấu

**Achievements:**
- `GET /api/achievements/stats` - Thống kê thành tích
- `GET /api/achievements/badges` - Danh sách badges
- `GET /api/achievements/leaderboard` - Bảng xếp hạng

#### 2.4.2. API Response Format
```json
{
  "success": true,
  "message": "Thông báo",
  "data": { ... },
  "pagination": { ... }
}
```

### 2.5. Tích hợp AI (1 trang)

#### 2.5.1. AI Chatbot Architecture
**Flow xử lý:**
```
User Input (Text/Image)
    ↓
Backend API
    ↓
┌─────────────────┐
│  Text Message?  │
└────────┬─────────┘
         │
    ┌────▼────┐         ┌──────────┐
    │  Groq   │────────►│ Response │
    │   API   │         │  (Text)  │
    └─────────┘         └──────────┘
         │
    ┌────▼────┐         ┌──────────┐
    │ OpenAI  │────────►│ Response │
    │ Vision  │         │  (Text)  │
    └─────────┘         └──────────┘
```

**System Prompt:** Fine-tuned với 200+ dòng hướng dẫn về:
- Tư vấn món ăn theo thời tiết, cảm xúc
- Gợi ý theo chế độ ăn (keto, chay, giảm cân...)
- Đề xuất món ăn từ nguyên liệu
- Format response chuẩn (ingredients, instructions, tips)

#### 2.5.2. Meal Planning AI
- Sử dụng Groq API để tạo thực đơn tuần
- Input: Chế độ ăn, sở thích, ngân sách
- Output: 7 ngày với 3 bữa/ngày (sáng, trưa, tối)

---

## CHƯƠNG 3: CÀI ĐẶT VÀ TRIỂN KHAI (5 trang)

### 3.1. Môi trường phát triển (1 trang)
- **Frontend:**
  - Node.js 18+
  - Expo CLI
  - React Native 0.81.5
  - TypeScript 5.9.2
- **Backend:**
  - Node.js 18+
  - Express.js
  - MongoDB 6.0+
- **Tools:**
  - VS Code
  - Postman (API testing)
  - MongoDB Compass
  - Git

### 3.2. Cài đặt và cấu hình (1.5 trang)

#### 3.2.1. Cài đặt Frontend
```bash
# Clone repository
git clone https://github.com/datptitudu2/deploycooksharebe.git
cd CookShare

# Install dependencies
npm install

# Configure environment
# Tạo file .env với:
# EXPO_PUBLIC_API_URL=https://your-api-url.com/api

# Start development server
npm start
```

#### 3.2.2. Cài đặt Backend
```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Tạo file .env với:
# MONGODB_URI=mongodb://...
# JWT_SECRET=...
# GROQ_API_KEY=...
# OPENAI_API_KEY=...
# CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...

# Start server
npm start
```

#### 3.2.3. Cấu hình Database
- Tạo MongoDB cluster (MongoDB Atlas hoặc local)
- Import seed data (nếu có)
- Tạo indexes cho performance

### 3.3. Triển khai Production (1.5 trang)

#### 3.3.1. Backend Deployment (Railway)
- Tạo project trên Railway
- Connect GitHub repository
- Set environment variables
- Deploy tự động từ main branch
- URL: `https://deploycooksharebe-production.up.railway.app`

#### 3.3.2. Mobile App Build (Expo EAS)
- Cài đặt EAS CLI: `npm install -g eas-cli`
- Login: `eas login`
- Configure `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```
- Build: `eas build --platform android --profile production`
- Download .aab file từ Expo dashboard

#### 3.3.3. Environment Variables
**Backend (.env):**
- `MONGODB_URI`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `CLOUDINARY_*`
- `RAILWAY_ENVIRONMENT`

**Frontend:**
- `EXPO_PUBLIC_API_URL` (hardcode trong `config/api.ts` cho production)

### 3.4. Testing (1 trang)
- **Unit Testing:** Jest (backend)
- **Integration Testing:** API endpoints với Postman
- **Manual Testing:** Test trên thiết bị thật (iOS/Android)
- **Test Cases:**
  - Authentication flow
  - CRUD recipes
  - AI chatbot responses
  - Meal planning
  - Achievements system

---

## CHƯƠNG 4: KẾT QUẢ VÀ ĐÁNH GIÁ (6 trang)

### 4.1. Kết quả đạt được (2 trang)

#### 4.1.1. Chức năng đã hoàn thành
**✅ Quản lý người dùng:**
- Đăng ký/Đăng nhập với JWT
- Quên mật khẩu với OTP email
- Cập nhật profile với avatar (Cloudinary)
- Follow/Unfollow users
- Xem profile người khác

**✅ Quản lý công thức:**
- CRUD công thức với hình ảnh/video
- Tìm kiếm và lọc công thức
- Like, Save, Rating, Comment
- Featured chefs
- Trending recipes

**✅ AI Chatbot:**
- Text chat với Groq API (Llama 3.1)
- Image recognition với OpenAI Vision API
- Tư vấn theo chế độ ăn
- YouTube video integration
- Chat history

**✅ Meal Planning:**
- Calendar view
- Thêm món vào lịch
- AI generate thực đơn tuần
- Đánh dấu món đã nấu
- Push notifications

**✅ Hệ thống thành tích:**
- Level system (1-20+)
- XP points
- Streak (chuỗi ngày nấu ăn)
- Badges (first_recipe, streak_7, streak_30, chef_10, master_chef...)
- Leaderboard

**✅ Thử thách:**
- Daily challenges
- Upload proof image
- Complete challenge và nhận điểm

**✅ Tương tác cộng đồng:**
- Cooking tips (Stories)
- Direct messaging
- Notifications
- Follow system

#### 4.1.2. Số liệu thống kê
- **Code:** ~15,000+ dòng code
- **API Endpoints:** 50+ endpoints
- **Database Collections:** 12 collections
- **Screens:** 20+ màn hình
- **Components:** 30+ reusable components
- **Build Size:** ~50MB (Android .aab)

### 4.2. Demo và Screenshots (2 trang)
**Mô tả các màn hình với screenshots từ ứng dụng thực tế:**
1. **Onboarding:** Màn hình giới thiệu app (3 slides)
2. **Login/Register:** Đăng nhập/Đăng ký
3. **Home:** Màn hình chính với trending recipes, featured chefs, cooking tips
4. **Recipes:** Danh sách công thức với filter và search
5. **Recipe Detail:** Chi tiết công thức với ingredients, instructions, comments, video
6. **Chatbot:** Chat với AI (text và image), YouTube video integration
7. **Meal Planning:** Lịch ăn với calendar, AI generate week plan
8. **Profile:** Thông tin cá nhân, stats, achievements, leaderboard
9. **Challenges:** Thử thách hàng ngày với proof image upload
10. **Messages:** Nhắn tin trực tiếp (text, image, voice)
11. **Dark Mode:** Screenshots các màn hình ở dark mode

**Lưu ý:** Tất cả screenshots nên được chụp từ ứng dụng đã build và chạy trên thiết bị thật (Android/iOS)

### 4.3. Đánh giá hiệu năng (1 trang)
- **API Response Time:**
  - Average: 200-500ms
  - AI Chatbot: 1-3s (Groq), 2-5s (OpenAI Vision)
  - Image Upload: 2-5s (tùy kích thước)
- **App Performance:**
  - Cold start: < 3s
  - Screen navigation: < 500ms
  - Image loading: Lazy loading với expo-image
- **Database:**
  - Query optimization với indexes
  - Aggregation pipelines cho complex queries

### 4.4. So sánh với các ứng dụng tương tự (1 trang)
**So sánh với Tasty, AllRecipes, Yummly:**
- **Ưu điểm:**
  - AI chatbot tích hợp sẵn
  - Meal planning tự động với AI
  - Gamification system (streak, achievements)
  - Cộng đồng tương tác (tips, challenges)
- **Nhược điểm:**
  - Chưa có video upload trực tiếp (chỉ URL)
  - Chưa có shopping list
  - Chưa có nutrition calculator

---

## CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (2 trang)

### 5.1. Kết luận (1 trang)
- **Tóm tắt:** Đã xây dựng thành công ứng dụng CookShare với đầy đủ tính năng
- **Đóng góp:**
  - Tích hợp AI vào ứng dụng nấu ăn
  - Gamification để tạo động lực
  - Cộng đồng tương tác
- **Hạn chế:**
  - Chưa có offline mode
  - Chưa có multi-language
  - Chưa có nutrition tracking

### 5.2. Hướng phát triển (1 trang)
- **Ngắn hạn:**
  - Thêm shopping list
  - Nutrition calculator
  - Video upload trực tiếp
  - Multi-language (English)
- **Dài hạn:**
  - AR cooking assistant
  - Voice commands
  - Social features (groups, events)
  - Premium subscription

---

## PHỤ LỤC (2 trang)

### Phụ lục A: Sơ đồ Use Case
**Các use case chính:**
- Đăng ký/Đăng nhập
- Tạo/Xem công thức
- Chat với AI
- Lập kế hoạch bữa ăn
- Hoàn thành thử thách

### Phụ lục B: UI/UX Design từ Figma
**Hình ảnh các màn hình chính:**
- Onboarding screens
- Home screen
- Recipes screen
- Recipe detail screen
- Chatbot screen
- Meal planning screen
- Profile screen
- Challenges screen
- Dark mode variants
- Interactive prototype flow

---

## 🎯 PROMPT ĐỂ VIẾT BÁO CÁO

Bạn là sinh viên đang viết báo cáo đồ án về ứng dụng **CookShare - Ứng dụng Chia sẻ Công thức Nấu ăn Thông minh với AI**.

**Yêu cầu:**
- Viết báo cáo 25 trang (không tính bìa, mục lục)
- Format: Times New Roman, 13pt, 1.5 line spacing
- Có hình ảnh, sơ đồ minh họa
- Ngôn ngữ: Tiếng Việt
- Cấu trúc theo bản thảo đã cung cấp

**Thông tin kỹ thuật:**
- **Frontend:** React Native 0.81.5 + Expo SDK 54
- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **AI:** Groq API (Llama 3.1) cho text, OpenAI Vision API cho image
- **Storage:** Cloudinary
- **Deployment:** Railway (backend), Expo EAS (mobile app)
- **Package Name:** com.datptitudu.cookshareapp
- **Version:** 1.0.0 (versionCode: 3)

**Tính năng chính:**
1. Quản lý người dùng (JWT auth, profile, follow)
2. CRUD công thức (với images/videos, like, comment, rating)
3. AI Chatbot (text + vision, tư vấn món ăn)
4. Meal Planning (calendar, AI generate menu)
5. Achievements (level, XP, streak, badges)
6. Challenges (daily challenges với proof image)
7. Community (cooking tips, direct messaging, notifications)

**Hãy viết báo cáo chi tiết theo cấu trúc:**
- Chương 1: Giới thiệu (3 trang)
- Chương 2: Phân tích và Thiết kế (6 trang)
- Chương 3: Cài đặt và Triển khai (5 trang)
- Chương 4: Kết quả và Đánh giá (6 trang)
- Chương 5: Kết luận (2 trang)
- Phụ lục (3 trang)

**Lưu ý:**
- Mỗi chương cần có phần giới thiệu và kết luận ngắn
- Thêm sơ đồ, hình ảnh minh họa
- **KHÔNG cần show code** - chỉ mô tả logic và flow
- Số liệu thống kê cần cụ thể
- So sánh với ứng dụng tương tự
- **Thêm hình ảnh UI/UX từ Figma** trong Chương 2 (mục 2.3) và Phụ lục B

---

## 📊 SƠ ĐỒ KIẾN TRÚC CHI TIẾT

### Sơ đồ luồng dữ liệu AI Chatbot:

```
User Input (Text/Image)
    ↓
POST /api/chatbot/message
    ↓
chatbotRoutes.js → chatbotSelfHostedController.js
    ↓
┌─────────────────────────────────┐
│  Text Message?                   │
│  ┌──────────┐                   │
│  │ Groq API │ → Response         │
│  └──────────┘                   │
│                                  │
│  Image Message?                 │
│  ┌──────────────┐               │
│  │ OpenAI Vision │ → Response    │
│  └──────────────┘               │
└─────────────────────────────────┘
    ↓
Enrich với YouTube links
    ↓
Save to ChatbotHistory
    ↓
Return Response to Client
```

### Sơ đồ luồng Meal Planning:

```
User Request Meal Plan
    ↓
GET /api/meal-planning?startDate=...
    ↓
mealPlanningController.js
    ↓
Query MongoDB (meal_plans collection)
    ↓
Return Calendar Data
    ↓
┌─────────────────────────────┐
│  AI Generate Week Plan?     │
│  ┌──────────┐               │
│  │ Groq API │ → 7 days menu │
│  └──────────┘               │
└─────────────────────────────┘
    ↓
Save to Database
    ↓
Return to Client
```

### Sơ đồ Achievement System:

```
User Action (Create Recipe, Cook Meal)
    ↓
Controller → Achievement.incrementX()
    ↓
Calculate Points (dynamic based on difficulty)
    ↓
Add Points → Check Level Up
    ↓
Update Streak (if applicable)
    ↓
Check Badge Unlock
    ↓
Save to Database
    ↓
Return Updated Stats
```

---

## 📝 GHI CHÚ QUAN TRỌNG

1. **Số liệu cần làm rõ:**
   - Số dòng code: ~15,000+ (frontend + backend)
   - Số API endpoints: 50+
   - Số màn hình: 20+
   - Số collections: 12

2. **Công nghệ cần nhấn mạnh:**
   - React Native + Expo (cross-platform)
   - AI integration (Groq + OpenAI)
   - Real-time features (notifications, messaging)
   - Cloud storage (Cloudinary)

3. **Điểm nổi bật:**
   - AI chatbot với vision
   - Gamification system
   - Meal planning tự động
   - Cộng đồng tương tác

4. **Hạn chế cần thừa nhận:**
   - Chưa có offline mode
   - Chưa có multi-language
   - Chưa có nutrition tracking
   - Video chỉ hỗ trợ URL (chưa upload trực tiếp)

---

**Kết thúc bản thảo**

