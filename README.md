# 🍳 CookShare - Ứng dụng Chia sẻ Công thức Nấu ăn

CookShare là ứng dụng mobile giúp người dùng khám phá, chia sẻ công thức nấu ăn và lên kế hoạch bữa ăn với sự hỗ trợ của AI.

## ✨ Tính năng chính

### 🔍 Khám phá
- Feed công thức trending
- Tìm kiếm theo tên, nguyên liệu
- Lọc theo danh mục, độ khó, thời gian
- Xem đầu bếp nổi bật

### 📖 Công thức
- Xem chi tiết công thức với nguyên liệu và hướng dẫn
- Đánh giá và bình luận
- Lưu công thức yêu thích
- Tạo và chia sẻ công thức riêng

### 📅 Lịch Ăn (Meal Planning)
- Lên kế hoạch bữa ăn theo ngày/tuần
- AI tự động gợi ý thực đơn
- Nhắc nhở thời gian nấu ăn
- Tích hợp công thức vào lịch

### 🤖 AI Chatbot
- Tư vấn món ăn theo sở thích
- Nhận diện nguyên liệu từ ảnh
- Gợi ý theo chế độ ăn (Keto, Low Carb, Chay...)
- Video hướng dẫn từ YouTube

### 👤 Hồ sơ cá nhân
- Quản lý thông tin cá nhân
- Theo dõi streak nấu ăn
- Hệ thống level và thành tích
- Quản lý công thức đã tạo

## 🛠️ Tech Stack

### Frontend (React Native + Expo)
- **Framework:** Expo SDK 52
- **Navigation:** Expo Router
- **UI:** Custom components với Theming
- **Icons:** @expo/vector-icons
- **State:** React Context + Hooks

### Backend (Node.js + Express)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB
- **Auth:** JWT
- **AI:** OpenAI API (GPT-4)
- **Storage:** Cloudinary

## 📁 Cấu trúc Project

```
CookShare/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab screens
│   │   ├── index.tsx      # Khám phá
│   │   ├── recipes.tsx    # Công thức
│   │   ├── meal-planning.tsx
│   │   ├── chatbot.tsx
│   │   └── profile.tsx
│   ├── recipe/[id].tsx    # Chi tiết công thức
│   ├── login.tsx
│   └── register.tsx
│
├── components/            # Reusable components
│   ├── ui/               # UI cơ bản
│   ├── chatbot/          # Chatbot components
│   └── meal-planning/    # Meal planning components
│
├── services/              # API services
│   ├── api.ts            # Axios instance
│   ├── recipeService.ts
│   ├── userService.ts
│   └── ...
│
├── contexts/              # React contexts
│   └── AuthContext.tsx
│
├── constants/             # Constants & theme
│   └── theme.ts
│
├── hooks/                 # Custom hooks
│   └── use-color-scheme.ts
│
└── backend/               # Backend API
    └── src/
        ├── controllers/
        ├── models/
        ├── routes/
        ├── middleware/
        └── utils/
```

## 🚀 Cài đặt

### Prerequisites
- Node.js 18+
- npm hoặc yarn
- MongoDB
- Expo CLI

### Frontend

```bash
cd CookShare
npm install
npx expo start
```

### Backend

```bash
cd CookShare/backend
npm install

# Tạo file .env
cp .env.example .env
# Cập nhật các biến môi trường

# Seed database (optional)
npm run seed

# Chạy server
npm run dev
```

### Environment Variables

```env
# Backend (.env)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=3000

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# YouTube
YOUTUBE_API_KEY=...
```

## 📱 Screenshots

| Khám phá | Công thức | Lịch Ăn | AI Chat | Profile |
|----------|-----------|---------|---------|---------|
| 🔍 | 📖 | 📅 | 🤖 | 👤 |

## 🔗 API Documentation

Xem chi tiết tại: `backend/API_ENDPOINTS.md`

## 👥 Team Development

Xem hướng dẫn phân công tại: `backend/README.md`

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

---

Made with ❤️ by CookShare Team
