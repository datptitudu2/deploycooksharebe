# 📚 CookShare API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://your-production-url.com
```

## Authentication
Hầu hết các endpoints yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication (`/api/auth`)

### POST `/api/auth/register`
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "name": "Tên người dùng",
  "email": "user@example.com",
  "password": "password123",
  "role": "user" // hoặc "chef"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "token": "jwt_token",
    "user": { ... }
  }
}
```

---

### POST `/api/auth/login`
Đăng nhập

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": { ... }
  }
}
```

---

### POST `/api/auth/forgot-password`
Quên mật khẩu - Gửi OTP qua email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP đã được gửi đến email của bạn"
}
```

---

### POST `/api/auth/reset-password`
Đặt lại mật khẩu với OTP

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

---

## 👤 User (`/api/user`)

### GET `/api/user/profile`
Lấy thông tin profile của user hiện tại

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Tên người dùng",
    "email": "user@example.com",
    "avatar": "url",
    "banner": "url",
    "bio": "...",
    "role": "user",
    "followers": 10,
    "following": 5
  }
}
```

---

### PUT `/api/user/profile`
Cập nhật thông tin profile

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Tên mới",
  "bio": "Mô tả mới",
  "location": "Địa điểm"
}
```

---

### POST `/api/user/avatar`
Upload avatar

**Headers:** `Authorization: Bearer <token>`

**Request:** `multipart/form-data` với field `avatar` (file)

---

### POST `/api/user/change-password`
Đổi mật khẩu

**Request Body:**
```json
{
  "currentPassword": "old123",
  "newPassword": "new123"
}
```

---

### GET `/api/user/chefs`
Lấy danh sách tất cả chefs

---

### GET `/api/user/users`
Lấy danh sách tất cả users (cho chef)

---

### GET `/api/user/followers`
Lấy danh sách followers của user hiện tại

---

### GET `/api/user/following`
Lấy danh sách following của user hiện tại

---

### POST `/api/user/:userId/follow`
Follow/Unfollow user

---

### GET `/api/user/:userId`
Lấy thông tin user theo ID

---

### PUT `/api/user/lastSeen`
Cập nhật lastSeen (gọi khi user online)

---

## 🍳 Recipe Management (`/api/recipe-management`)

### GET `/api/recipe-management`
Lấy danh sách công thức (với filter)

**Query Parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số lượng mỗi trang (default: 10)
- `category`: Lọc theo danh mục
- `search`: Tìm kiếm
- `sort`: Sắp xếp (trending, newest, rating)

**Response:**
```json
{
  "success": true,
  "data": {
    "recipes": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

---

### GET `/api/recipe-management/trending`
Lấy công thức trending

---

### GET `/api/recipe-management/newest`
Lấy công thức mới nhất

---

### GET `/api/recipe-management/search?q=keyword`
Tìm kiếm công thức

---

### GET `/api/recipe-management/categories`
Lấy danh sách danh mục

---

### GET `/api/recipe-management/featured-chefs`
Lấy danh sách chefs nổi bật

---

### GET `/api/recipe-management/stats`
Thống kê tổng quan

---

### GET `/api/recipe-management/category/:category`
Lấy công thức theo danh mục

---

### GET `/api/recipe-management/my/recipes`
Lấy công thức của user hiện tại

**Headers:** `Authorization: Bearer <token>`

---

### GET `/api/recipe-management/saved`
Lấy công thức đã lưu

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/recipe-management`
Tạo công thức mới

**Headers:** `Authorization: Bearer <token>`

**Request:** `multipart/form-data`
- `title`: Tên công thức
- `description`: Mô tả
- `ingredients`: JSON array
- `instructions`: JSON array
- `category`: Danh mục
- `prepTime`: Thời gian chuẩn bị
- `cookTime`: Thời gian nấu
- `servings`: Số phần ăn
- `difficulty`: Độ khó (easy, medium, hard)
- `images`: File(s) - tối đa 10 ảnh
- `videos`: File(s) - tối đa 5 video (100MB mỗi video)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "...",
    "images": ["url1", "url2"],
    "videos": ["url1"]
  }
}
```

---

### GET `/api/recipe-management/:recipeId`
Lấy chi tiết công thức

**Headers:** `Authorization: Bearer <token>` (optional - để check liked/saved)

---

### PUT `/api/recipe-management/:recipeId`
Cập nhật công thức

**Headers:** `Authorization: Bearer <token>`

**Request:** Tương tự POST (multipart/form-data)

---

### DELETE `/api/recipe-management/:recipeId`
Xóa công thức

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/recipe-management/:recipeId/like`
Like/Unlike công thức

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/recipe-management/:recipeId/save`
Lưu/Bỏ lưu công thức

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/recipe-management/:recipeId/rate`
Đánh giá công thức

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "rating": 5 // 1-5
}
```

---

### GET `/api/recipe-management/:recipeId/comments`
Lấy bình luận của công thức

**Query Parameters:**
- `page`: Số trang
- `limit`: Số lượng mỗi trang

---

### POST `/api/recipe-management/:recipeId/comments`
Thêm bình luận

**Headers:** `Authorization: Bearer <token>`

**Request:** `multipart/form-data`
- `content`: Nội dung bình luận
- `image`: File ảnh (optional)

---

### PUT `/api/recipe-management/:recipeId/comments/:commentId`
Cập nhật bình luận

**Headers:** `Authorization: Bearer <token>`

---

### DELETE `/api/recipe-management/:recipeId/comments/:commentId`
Xóa bình luận

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/recipe-management/:recipeId/comments/:commentId/replies`
Thêm reply cho bình luận

**Headers:** `Authorization: Bearer <token>`

**Request:** `multipart/form-data`
- `content`: Nội dung reply
- `image`: File ảnh (optional)

---

### PUT `/api/recipe-management/:recipeId/comments/:commentId/replies/:replyId`
Cập nhật reply

**Headers:** `Authorization: Bearer <token>`

---

### DELETE `/api/recipe-management/:recipeId/comments/:commentId/replies/:replyId`
Xóa reply

**Headers:** `Authorization: Bearer <token>`

---

## 🤖 AI Chatbot (`/api/chatbot`)

### POST `/api/chatbot/message`
Gửi tin nhắn text hoặc với ảnh

**Headers:** `Authorization: Bearer <token>`

**Text Message:**
```json
{
  "message": "Xin chào",
  "dietMode": "weight-loss" // optional: weight-loss, weight-gain, muscle-gain, healthy, vegetarian, low-carb, keto, none
}
```

**Image Message:** `multipart/form-data`
- `message`: Text message (optional)
- `dietMode`: Chế độ ăn (optional)
- `image`: File ảnh

**Response:**
```json
{
  "success": true,
  "response": "Phản hồi từ AI...",
  "videoInfo": {
    "videoId": "youtube_video_id",
    "title": "Video title",
    "thumbnail": "url",
    "url": "youtube_url"
  },
  "mealName": "Tên món ăn",
  "modelType": "cookbot-railway"
}
```

---

### GET `/api/chatbot/history`
Lấy lịch sử chat

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "role": "user",
      "content": "...",
      "timestamp": "..."
    },
    {
      "role": "assistant",
      "content": "...",
      "videoInfo": {...},
      "timestamp": "..."
    }
  ]
}
```

---

### DELETE `/api/chatbot/history`
Xóa lịch sử chat

**Headers:** `Authorization: Bearer <token>`

---

### GET `/api/chatbot/check-apikey`
Kiểm tra API status

**Headers:** `Authorization: Bearer <token>`

---

## 📅 Meal Planning (`/api/meal-planning`)

### GET `/api/meal-planning/week`
Lấy lịch ăn tuần

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate`: Ngày bắt đầu (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "weekPlan": {
      "2024-01-01": {
        "breakfast": {...},
        "lunch": {...},
        "dinner": {...},
        "snack": {...}
      }
    }
  }
}
```

---

### POST `/api/meal-planning/generate-week`
AI tạo thực đơn tuần

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "dietMode": "weight-loss",
  "preferences": ["món Việt", "ít cay"],
  "startDate": "2024-01-01"
}
```

---

### POST `/api/meal-planning/add`
Thêm món vào lịch

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "date": "2024-01-01",
  "mealType": "breakfast", // breakfast, lunch, dinner, snack
  "recipeId": "...",
  "mealName": "Tên món"
}
```

---

### PUT `/api/meal-planning/update`
Cập nhật meal plan

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "date": "2024-01-01",
  "mealType": "lunch",
  "recipeId": "...",
  "mealName": "..."
}
```

---

### DELETE `/api/meal-planning/delete`
Xóa món khỏi lịch

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "date": "2024-01-01",
  "mealType": "breakfast"
}
```

---

### POST `/api/meal-planning/start-timer`
Bắt đầu timer nấu ăn

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipeId": "...",
  "duration": 30 // phút
}
```

---

## 🏆 Achievements (`/api/achievements`)

### GET `/api/achievements`
Lấy thành tích của user

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "level": 5,
    "points": 1250,
    "streak": 7,
    "totalRecipes": 20,
    "totalCooked": 15
  }
}
```

---

### GET `/api/achievements/badges`
Lấy danh sách badges

**Headers:** `Authorization: Bearer <token>`

---

### GET `/api/achievements/stats`
Thống kê tổng quan

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/achievements/streak`
Update streak (thường được gọi tự động)

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/achievements/mark-meal-cooked`
Đánh dấu món đã nấu

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipeId": "...",
  "date": "2024-01-01"
}
```

---

### GET `/api/achievements/leaderboard`
Bảng xếp hạng

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Số lượng (default: 10)
- `type`: Loại xếp hạng (points, streak, recipes)

---

## 💬 Messages (`/api/messages`)

### POST `/api/messages/send`
Gửi message (có thể kèm ảnh hoặc voice)

**Headers:** `Authorization: Bearer <token>`

**Request:** `multipart/form-data`
- `partnerId`: ID người nhận
- `content`: Nội dung text
- `type`: Loại (text, image, voice)
- `image`: File ảnh (nếu type = image)
- `voice`: File audio (nếu type = voice)
- `replyingTo`: ID message đang reply (optional)

---

### GET `/api/messages/conversation/:partnerId`
Lấy conversation giữa 2 users

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Số trang
- `limit`: Số lượng mỗi trang

---

### GET `/api/messages/conversations`
Lấy danh sách conversations

**Headers:** `Authorization: Bearer <token>`

---

### GET `/api/messages/unread-count`
Đếm số unread messages

**Headers:** `Authorization: Bearer <token>`

---

### PUT `/api/messages/:messageId/reaction`
Thêm/xóa cảm xúc

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "emoji": "👍"
}
```

---

### DELETE `/api/messages/:messageId`
Xóa tin nhắn (thu hồi)

**Headers:** `Authorization: Bearer <token>`

---

### DELETE `/api/messages/conversation/:partnerId`
Xóa toàn bộ cuộc trò chuyện

**Headers:** `Authorization: Bearer <token>`

---

## 🎯 Challenges (`/api/challenges`)

### GET `/api/challenges/today`
Lấy challenge hôm nay

**Headers:** `Authorization: Bearer <token>` (optional - để lấy progress)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Nấu món Việt Nam",
    "description": "...",
    "points": 50,
    "date": "2024-01-01",
    "expiresAt": "...",
    "timeRemaining": 3600000,
    "userProgress": {
      "joined": true,
      "completed": false
    }
  }
}
```

---

### POST `/api/challenges/join`
Tham gia challenge

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/challenges/complete`
Hoàn thành challenge

**Headers:** `Authorization: Bearer <token>`

**Request:** `multipart/form-data`
- `recipeId`: ID công thức đã nấu
- `proofImage`: Ảnh chứng minh (optional)

**Response:**
```json
{
  "success": true,
  "message": "Chúc mừng! Bạn đã hoàn thành thử thách và nhận được 50 điểm!",
  "data": {
    "pointsEarned": 50,
    "leveledUp": true,
    "newLevel": 6,
    "newPoints": 1300,
    "reward": {...}
  }
}
```

---

### GET `/api/challenges/history`
Lịch sử challenge của user

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Số lượng (default: 10)

---

### GET `/api/challenges/stats`
Thống kê challenge của user

**Headers:** `Authorization: Bearer <token>`

---

### GET `/api/challenges/completions/:date`
Lấy danh sách người đã hoàn thành challenge theo ngày

**Query Parameters:**
- `date`: Ngày (YYYY-MM-DD)

---

## 🔔 Notifications (`/api/notifications`)

### GET `/api/notifications`
Lấy danh sách notifications

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Số trang
- `limit`: Số lượng mỗi trang
- `unreadOnly`: Chỉ lấy chưa đọc (true/false)

---

### GET `/api/notifications/unread-count`
Lấy số notifications chưa đọc

**Headers:** `Authorization: Bearer <token>`

---

### PUT `/api/notifications/:notificationId/read`
Đánh dấu đã đọc

**Headers:** `Authorization: Bearer <token>`

---

### PUT `/api/notifications/read-all`
Đánh dấu tất cả đã đọc

**Headers:** `Authorization: Bearer <token>`

---

### DELETE `/api/notifications/:notificationId`
Xóa notification

**Headers:** `Authorization: Bearer <token>`

---

### DELETE `/api/notifications/read`
Xóa tất cả notifications đã đọc

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/notifications/push-token`
Lưu push token

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "fcm_token",
  "platform": "android" // hoặc "ios"
}
```

---

## 📸 Stories (`/api/stories`)

### GET `/api/stories`
Lấy tất cả stories đang active

**Query Parameters:**
- `limit`: Số lượng (default: 20)

---

### GET `/api/stories/tips`
Lấy cooking tips

---

### GET `/api/stories/user/:userId`
Lấy stories của 1 user

---

### POST `/api/stories`
Tạo story mới

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "type": "tip", // hoặc "story"
  "content": "url hoặc base64",
  "thumbnail": "url",
  "caption": "...",
  "tipTitle": "Tiêu đề tip",
  "tipContent": "Nội dung tip",
  "duration": 24 // giờ
}
```

---

### POST `/api/stories/:storyId/view`
Đánh dấu đã xem story

**Headers:** `Authorization: Bearer <token>`

---

### POST `/api/stories/:storyId/like`
Like/Unlike story

**Headers:** `Authorization: Bearer <token>`

---

### DELETE `/api/stories/:storyId`
Xóa story

**Headers:** `Authorization: Bearer <token>`

---

## 🏥 Health Check

### GET `/api/health`
Kiểm tra trạng thái server

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "database": "connected",
  "version": "1.0.0",
  "message": "CookShare API is running"
}
```

---

## 📝 Response Format

Tất cả API responses đều theo format:

```json
{
  "success": true, // hoặc false
  "message": "Thông báo", // optional
  "data": { ... }, // optional
  "error": "Lỗi", // chỉ khi success = false
  "pagination": { // nếu có phân trang
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## ⚠️ Error Codes

- `400`: Bad Request - Dữ liệu không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `403`: Forbidden - Không có quyền truy cập
- `404`: Not Found - Không tìm thấy resource
- `500`: Internal Server Error - Lỗi server

---

## 📌 Notes

1. Tất cả timestamps đều theo format ISO 8601 (UTC)
2. File uploads:
   - Images: Tối đa 10MB
   - Videos: Tối đa 100MB mỗi file
   - Audio: Tối đa 10MB
3. Pagination: Mặc định `page=1`, `limit=10`
4. JWT token có thời hạn, cần refresh khi hết hạn
5. Rate limiting: 100 requests/phút cho mỗi user

---

**Last Updated:** 2024-01-01

