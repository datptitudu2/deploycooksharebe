# 📝 PROMPT ĐỂ VIẾT BÁO CÁO ĐỒ ÁN COOKSHARE

## 🎯 PROMPT CHÍNH (Copy và paste vào ChatGPT/Claude)

---

Bạn là sinh viên đang viết báo cáo đồ án về ứng dụng **CookShare - Ứng dụng Chia sẻ Công thức Nấu ăn Thông minh với AI**.

**YÊU CẦU BÁO CÁO:**
- Độ dài: 25 trang (không tính bìa, mục lục, phụ lục)
- Format: Times New Roman, 13pt, dãn dòng 1.5
- Ngôn ngữ: Tiếng Việt
- Có hình ảnh, sơ đồ minh họa
- Cấu trúc theo bản thảo đã cung cấp

---

## 📋 THÔNG TIN DỰ ÁN

### **Tên ứng dụng:** CookShare
### **Mô tả:** Ứng dụng mobile chia sẻ công thức nấu ăn với tích hợp AI để tư vấn món ăn thông minh

### **Công nghệ sử dụng:**

**Frontend:**
- React Native 0.81.5
- Expo SDK 54
- TypeScript 5.9.2
- Expo Router (navigation)
- Expo Image (image handling)
- React Context (state management)

**Backend:**
- Node.js 18+
- Express.js
- MongoDB (database)
- JWT (authentication)
- bcrypt (password hashing)
- Multer (file upload)

**AI Services:**
- Groq API (Llama 3.1 8B Instant) - Text chatbot
- OpenAI Vision API (GPT-4o) - Image recognition

**Storage:**
- Cloudinary (image/video storage)

**Deployment:**
- Railway (backend): https://deploycooksharebe-production.up.railway.app
- Expo EAS (mobile app build)
- Package: com.datptitudu.cookshareapp
- Version: 1.0.0 (versionCode: 3)

---

## 🎨 TÍNH NĂNG CHÍNH

### **1. Quản lý Người dùng**
- Đăng ký/Đăng nhập với email và mật khẩu
- Quên mật khẩu với OTP qua email
- Cập nhật thông tin cá nhân (tên, avatar, bio)
- Xem profile người dùng khác
- Theo dõi/Bỏ theo dõi người dùng
- Quản lý danh sách followers/following
- Upload avatar lên Cloudinary

### **2. Quản lý Công thức**
- Tạo công thức mới với:
  - Tên, mô tả, nguyên liệu, hướng dẫn
  - Hình ảnh (multiple images)
  - Video (URL hoặc upload)
  - Danh mục, độ khó, thời gian
  - Tags, chế độ ăn
- Xem danh sách công thức:
  - Trending (theo lượt like)
  - Mới nhất
  - Theo danh mục
  - Theo đầu bếp
- Tìm kiếm công thức (theo tên, nguyên liệu)
- Lọc công thức (category, difficulty, time, diet mode)
- Xem chi tiết công thức
- Chỉnh sửa/Xóa công thức của mình
- Lưu/Bỏ lưu công thức yêu thích
- Like/Unlike công thức
- Đánh giá công thức (1-5 sao)
- Bình luận công thức (comment, reply)
- Featured chefs (đầu bếp có nhiều công thức nhất)

### **3. AI Chatbot**
- Chat text với AI để tư vấn món ăn
- Gửi ảnh nguyên liệu, AI nhận diện và đề xuất món ăn (OpenAI Vision)
- Tư vấn theo chế độ ăn:
  - Giảm cân
  - Tăng cân
  - Tăng cơ
  - Chay
  - Keto
  - Low-carb
  - Healthy
- Tư vấn theo thời tiết, cảm xúc, tâm trạng
- Tự động tìm và gắn video YouTube hướng dẫn
- Lưu lịch sử chat
- System prompt fine-tuned với 200+ dòng hướng dẫn

### **4. Lập kế hoạch Bữa ăn (Meal Planning)**
- Xem lịch ăn theo tuần/tháng (calendar view)
- Thêm món ăn vào lịch (từ công thức hoặc AI gợi ý)
- AI tự động tạo thực đơn tuần (Groq API):
  - Input: Chế độ ăn, sở thích, ngân sách
  - Output: 7 ngày với 3 bữa/ngày (sáng, trưa, tối)
- Đánh dấu món đã nấu
- Xem lịch sử các món đã ăn
- Nhắc nhở bữa ăn (push notifications)

### **5. Hệ thống Thành tích (Achievements)**
- Hệ thống level (1-20+):
  - Level 2: +20 điểm thưởng
  - Level 3: +30 điểm thưởng
  - Level 5: Badge "Rising Star" + 50 điểm
  - Level 10: Badge "Master Chef" + 100 điểm
  - Level 20: Badge "Legend" + 200 điểm
- Điểm kinh nghiệm (XP):
  - Tạo công thức: 20-50 XP (tùy độ khó)
  - Nấu món: 12-30 XP (tùy độ khó)
  - Hoàn thành challenge: 50 XP
- Chuỗi ngày nấu ăn liên tiếp (streak):
  - Tăng streak khi đăng công thức hoặc đánh dấu món đã nấu
  - Reset streak nếu gián đoạn
  - Badge "Streak 7" (7 ngày liên tiếp)
  - Badge "Streak 30" (30 ngày liên tiếp)
- Huy hiệu (badges):
  - first_recipe: Tạo công thức đầu tiên
  - streak_7: 7 ngày liên tiếp
  - streak_30: 30 ngày liên tiếp
  - chef_10: 10 công thức
  - rising_star: Level 5
  - master_chef: Level 10
  - legend: Level 20
- Bảng xếp hạng (leaderboard):
  - Top users theo điểm
  - Top users theo streak
  - Top users theo số công thức

### **6. Thử thách (Challenges)**
- Thử thách nấu ăn hàng ngày
- Tham gia thử thách
- Upload ảnh chứng minh đã hoàn thành
- Nhận điểm thưởng khi hoàn thành (50 XP)
- Xem danh sách người đã hoàn thành
- Xem lịch sử thử thách

### **7. Tương tác Cộng đồng**
- Chia sẻ mẹo nấu ăn (Cooking Tips/Stories):
  - Tạo mẹo mới (tiêu đề, nội dung)
  - Xem danh sách mẹo từ cộng đồng
  - Like/Unlike mẹo
  - Xóa mẹo của mình
- Nhắn tin trực tiếp giữa người dùng:
  - Gửi tin nhắn text
  - Gửi ảnh
  - Gửi voice message
  - Xem danh sách cuộc trò chuyện
- Thông báo (notifications):
  - Thông báo khi có người like/comment công thức
  - Thông báo khi có người follow
  - Thông báo thử thách mới
  - Thông báo nhắc nhở bữa ăn
  - Push notifications

---

## 📊 SỐ LIỆU THỐNG KÊ

- **Tổng số dòng code:** ~15,000+ (frontend + backend)
- **API Endpoints:** 50+ endpoints
- **Database Collections:** 12 collections:
  - users
  - recipes
  - recipe_likes
  - recipe_saves
  - recipe_comments
  - achievements
  - meal_plans
  - challenges
  - stories
  - messages
  - notifications
  - chatbot_history
- **Screens:** 20+ màn hình
- **Reusable Components:** 30+ components
- **Build Size:** ~50MB (Android .aab file)

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### **Kiến trúc 3 tầng:**

```
┌─────────────────────────────────────┐
│         CLIENT LAYER                │
│  React Native App (iOS/Android)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      API GATEWAY LAYER               │
│  Express.js RESTful API              │
│  - Authentication (JWT)              │
│  - Rate Limiting                     │
│  - CORS                              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      BUSINESS LOGIC LAYER            │
│  Controllers → Models → Services      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         DATA LAYER                   │
│  MongoDB (Database)                 │
│  Cloudinary (Storage)                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    EXTERNAL SERVICES LAYER           │
│  Groq API (Text AI)                  │
│  OpenAI Vision API (Image AI)        │
└──────────────────────────────────────┘
```

---

## 📐 CẤU TRÚC BÁO CÁO

### **CHƯƠNG 1: GIỚI THIỆU (3 trang)**
1.1. Đặt vấn đề
1.2. Mục tiêu đề tài
1.3. Phạm vi nghiên cứu
1.4. Cấu trúc báo cáo

### **CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (7 trang)**
2.1. Phân tích yêu cầu
   - Yêu cầu chức năng
   - Yêu cầu phi chức năng
2.2. Thiết kế kiến trúc hệ thống
   - Kiến trúc tổng quan
   - Kiến trúc database (ERD)
2.3. Thiết kế giao diện người dùng (UI/UX)
   - Thiết kế trên Figma
   - Design System (Color, Typography, Components)
   - Các màn hình chính với hình ảnh từ Figma
   - Dark Mode Design
   - Responsive Design
   - Interactive Prototype
2.4. Thiết kế API
   - RESTful API endpoints
   - API response format
2.5. Tích hợp AI
   - AI Chatbot architecture
   - Meal Planning AI

### **CHƯƠNG 3: CÀI ĐẶT VÀ TRIỂN KHAI (5 trang)**
3.1. Môi trường phát triển
3.2. Cài đặt và cấu hình
   - Frontend setup
   - Backend setup
   - Database configuration
3.3. Triển khai Production
   - Backend deployment (Railway)
   - Mobile app build (Expo EAS)
   - Environment variables
3.4. Testing

### **CHƯƠNG 4: KẾT QUẢ VÀ ĐÁNH GIÁ (6 trang)**
4.1. Kết quả đạt được
   - Chức năng đã hoàn thành
   - Số liệu thống kê
4.2. Demo và Screenshots
4.3. Đánh giá hiệu năng
4.4. So sánh với ứng dụng tương tự

### **CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (2 trang)**
5.1. Kết luận
5.2. Hướng phát triển

### **PHỤ LỤC (2 trang)**
- Phụ lục A: Sơ đồ Use Case
- Phụ lục B: UI/UX Design từ Figma (hình ảnh các màn hình)

---

## 🎯 HƯỚNG DẪN VIẾT

### **Lưu ý khi viết:**

1. **Mỗi chương cần có:**
   - Phần giới thiệu ngắn (2-3 câu)
   - Nội dung chi tiết
   - Kết luận ngắn (2-3 câu)

2. **Thêm sơ đồ, hình ảnh:**
   - Sơ đồ kiến trúc hệ thống
   - ERD (Entity Relationship Diagram)
   - Wireframe màn hình
   - Screenshots ứng dụng
   - Flowchart các luồng xử lý

3. **KHÔNG cần show code:**
   - Chỉ mô tả logic và flow xử lý
   - Không cần đưa code vào báo cáo

4. **UI/UX Design từ Figma:**
   - Thêm hình ảnh các màn hình từ Figma trong Chương 2 (mục 2.3)
   - Bao gồm: Design System, các màn hình chính, Dark Mode, Prototype
   - Đặt thêm hình ảnh trong Phụ lục B

5. **Số liệu cần cụ thể:**
   - Response time của API
   - Số lượng endpoints
   - Số dòng code
   - Build size

5. **So sánh với ứng dụng tương tự:**
   - Tasty
   - AllRecipes
   - Yummly
   - Nêu ưu/nhược điểm

---

## 📝 PROMPT MẪU CHO TỪNG CHƯƠNG

### **Chương 1: Giới thiệu**

Viết Chương 1: Giới thiệu (3 trang) cho báo cáo đồ án về ứng dụng CookShare. Bao gồm:
- Đặt vấn đề: Nhu cầu chia sẻ và học nấu ăn, vấn đề hiện tại
- Mục tiêu: Xây dựng app với AI, gamification, cộng đồng
- Phạm vi: Chức năng và công nghệ sử dụng
- Cấu trúc báo cáo

### **Chương 2: Phân tích và Thiết kế**

Viết Chương 2: Phân tích và Thiết kế Hệ thống (7 trang). Bao gồm:
- Phân tích yêu cầu chức năng và phi chức năng
- Thiết kế kiến trúc 3 tầng (Client, API Gateway, Data)
- ERD với 12 collections
- **Thiết kế UI/UX trên Figma (2 trang):**
  - Design System (Color Palette, Typography, Components)
  - Các màn hình chính với hình ảnh từ Figma
  - Dark Mode Design
  - Responsive Design
  - Interactive Prototype
- Thiết kế API RESTful (50+ endpoints)
- Tích hợp AI (Groq + OpenAI Vision)

### **Chương 3: Cài đặt và Triển khai**

Viết Chương 3: Cài đặt và Triển khai (5 trang). Bao gồm:
- Môi trường phát triển (Node.js, Expo, MongoDB)
- Hướng dẫn cài đặt frontend và backend
- Triển khai backend lên Railway
- Build mobile app với Expo EAS
- Cấu hình environment variables
- Testing strategy

### **Chương 4: Kết quả và Đánh giá**

Viết Chương 4: Kết quả và Đánh giá (6 trang). Bao gồm:
- Liệt kê tất cả tính năng đã hoàn thành
- Số liệu thống kê (15,000+ dòng code, 50+ endpoints)
- Screenshots các màn hình chính
- Đánh giá hiệu năng (response time, app performance)
- So sánh với Tasty, AllRecipes, Yummly

### **Chương 5: Kết luận**

Viết Chương 5: Kết luận và Hướng phát triển (2 trang). Bao gồm:
- Tóm tắt kết quả đạt được
- Đóng góp của đề tài
- Hạn chế (chưa có offline mode, multi-language)
- Hướng phát triển (shopping list, nutrition calculator, AR)

---

## ✅ CHECKLIST TRƯỚC KHI NỘP

- [ ] Đủ 25 trang (không tính bìa, mục lục)
- [ ] Format đúng (Times New Roman, 13pt, 1.5 spacing)
- [ ] Có sơ đồ kiến trúc
- [ ] Có ERD
- [ ] Có wireframe/screenshots
- [ ] Có hình ảnh UI/UX từ Figma trong Chương 2 và Phụ lục
- [ ] KHÔNG có code samples (chỉ mô tả logic)
- [ ] Số liệu cụ thể
- [ ] So sánh với ứng dụng tương tự
- [ ] Không có lỗi chính tả
- [ ] Tham khảo đầy đủ (nếu có)

---

**Chúc bạn viết báo cáo thành công! 🎉**

