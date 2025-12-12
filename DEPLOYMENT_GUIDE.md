# 🚀 Hướng Dẫn Deploy - CookShare App

## ❓ Câu Hỏi: "React Native có cần deploy backend không?"

### ✅ **TRẢ LỜI: CÓ, BACKEND PHẢI DEPLOY!**

**Lý do:**
- App của bạn **PHỤ THUỘC HOÀN TOÀN** vào backend API
- App gọi API cho: Login, Register, Recipes, Chatbot AI, Messages, Meal Planning, v.v.
- **KHÔNG có backend = App KHÔNG hoạt động**

### 🤔 Tại Sao Có Người Nói "Không Cần"?

Họ có thể nhầm lẫn giữa:

#### **Development (Phát Triển):**
- ✅ Backend chạy **LOCAL** trên máy bạn (`localhost:3000`)
- ✅ App kết nối qua IP local (`192.168.1.126:3000`)
- ✅ Chỉ bạn và thiết bị cùng mạng Wi-Fi mới truy cập được
- ✅ **KHÔNG cần deploy** - chỉ để test

#### **Production (Sản Phẩm):**
- ⚠️ App được cài trên **HÀNG NGÀN** thiết bị khác nhau
- ⚠️ Mỗi thiết bị ở **MẠNG KHÁC NHAU** (4G, Wi-Fi khác, v.v.)
- ⚠️ **KHÔNG THỂ** kết nối đến `localhost` hoặc IP local của bạn
- ✅ **PHẢI deploy backend** lên server public để mọi người truy cập được

---

## 📋 BẠN CẦN LÀM GÌ?

### **Bước 1: Deploy Backend** ⚠️ QUAN TRỌNG NHẤT

Bạn có **3 lựa chọn**:

#### **Option 1: Dùng Platform Miễn Phí (Dễ nhất - KHUYẾN NGHỊ cho bắt đầu)**

**A. Railway.app** (Miễn phí $5 credit/tháng)
```bash
1. Đăng ký: https://railway.app
2. Connect GitHub repo
3. Deploy backend folder
4. Railway tự động tạo URL: https://your-app.railway.app
```

**B. Render.com** (Miễn phí với giới hạn)
```bash
1. Đăng ký: https://render.com
2. Tạo Web Service
3. Connect GitHub repo
4. URL: https://your-app.onrender.com
```

**C. Fly.io** (Miễn phí)
```bash
1. Đăng ký: https://fly.io
2. Install flyctl
3. Deploy: fly deploy
```

**D. Heroku** (Có phí, nhưng dễ dùng)
```bash
1. Đăng ký: https://heroku.com
2. Install Heroku CLI
3. Deploy: git push heroku main
```

#### **Option 2: VPS (Tự quản lý - Phức tạp hơn)**

**Các nhà cung cấp:**
- DigitalOcean ($5/tháng)
- AWS EC2
- Google Cloud Platform
- Vultr, Linode, v.v.

**Cần làm:**
- Cài đặt Node.js, MongoDB
- Cấu hình Nginx, SSL
- Setup PM2 để chạy backend
- Cấu hình firewall

#### **Option 3: Serverless (Advanced)**

- AWS Lambda
- Vercel (cho Node.js)
- Netlify Functions

---

### **Bước 2: Cấu Hình MongoDB**

Backend cần MongoDB. Bạn có **2 options**:

#### **A. MongoDB Atlas (Miễn phí - KHUYẾN NGHỊ)**
```bash
1. Đăng ký: https://www.mongodb.com/cloud/atlas
2. Tạo cluster miễn phí
3. Lấy connection string
4. Update trong backend/.env:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cookshare
```

#### **B. MongoDB trên VPS**
- Cài MongoDB trên VPS của bạn
- Cấu hình connection string

---

### **Bước 3: Cấu Hình Environment Variables**

Sau khi deploy backend, cần set các biến môi trường:

**File `backend/.env`:**
```env
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key-here

# Server
PORT=3000
NODE_ENV=production

# OpenAI (cho chatbot)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Cloudinary (cho upload images)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# YouTube API (optional)
YOUTUBE_API_KEY=...
```

---

### **Bước 4: Cấu Hình Frontend API URL**

Sau khi backend deploy xong, bạn sẽ có URL như:
- `https://cookshare-api.railway.app`
- `https://cookshare-api.onrender.com`
- `https://api.cookshare.com` (nếu có domain)

**Cập nhật trong `CookShare/config/api.ts`:**
```typescript
const PRODUCTION_API_URL = 'https://cookshare-api.railway.app/api';
```

**HOẶC tạo file `.env`:**
```env
EXPO_PUBLIC_API_URL=https://cookshare-api.railway.app/api
```

---

### **Bước 5: Test Backend**

Mở browser và test:
```
https://your-backend-url.com/api/health
```

Kết quả mong đợi:
```json
{
  "status": "OK",
  "message": "CookShare API is running"
}
```

---

### **Bước 6: Build và Publish App**

Sau khi backend hoạt động:
1. Build APK/AAB: `eas build --platform android`
2. Upload lên Google Play Console
3. Test trên thiết bị thật

---

## 📊 Checklist Hoàn Chỉnh

### Backend:
- [ ] Đã chọn platform deploy (Railway/Render/Heroku/VPS)
- [ ] Đã deploy backend thành công
- [ ] Backend có HTTPS (SSL)
- [ ] Đã setup MongoDB Atlas hoặc MongoDB trên server
- [ ] Đã cấu hình tất cả environment variables
- [ ] Đã test API endpoint `/api/health`
- [ ] Đã test login/register
- [ ] CORS đã được cấu hình đúng

### Frontend:
- [ ] Đã cập nhật `PRODUCTION_API_URL` trong `config/api.ts`
- [ ] Đã test app với production API URL
- [ ] Đã build APK/AAB
- [ ] Đã test APK trên thiết bị thật
- [ ] Tất cả tính năng hoạt động bình thường

### Google Play Store:
- [ ] Đã có Google Play Console account (✅ bạn đã có)
- [ ] Đã tạo app trong console
- [ ] Đã upload APK/AAB
- [ ] Đã điền đầy đủ thông tin (mô tả, screenshots, v.v.)
- [ ] Đã submit để review

---

## 💰 Chi Phí Ước Tính

### **Option Miễn Phí (Bắt đầu):**
- Railway: $5 credit/tháng (đủ cho app nhỏ)
- Render: Miễn phí (có giới hạn)
- MongoDB Atlas: Miễn phí 512MB
- **Tổng: $0/tháng** (với giới hạn)

### **Option Trả Phí (Production):**
- VPS: $5-10/tháng
- MongoDB Atlas: $0-9/tháng (tùy usage)
- Domain: $10-15/năm
- **Tổng: ~$15-25/tháng**

---

## 🆘 Nếu Bạn Chưa Có Backend URL

**Tạm thời bạn có thể:**
1. Deploy backend lên Railway/Render (mất ~30 phút)
2. Lấy URL backend
3. Cập nhật `config/api.ts`
4. Build app

**HOẶC nếu muốn test trước:**
- Có thể dùng ngrok để expose local backend tạm thời
- Nhưng **KHÔNG nên dùng cho production**

---

## 📞 Tóm Tắt

1. ✅ **Backend PHẢI deploy** - không có cách nào khác
2. ✅ **Dễ nhất:** Dùng Railway/Render (miễn phí)
3. ✅ **MongoDB:** Dùng Atlas (miễn phí)
4. ✅ **Cập nhật:** `config/api.ts` với URL backend
5. ✅ **Test:** Đảm bảo mọi thứ hoạt động
6. ✅ **Build:** Tạo APK và upload lên Play Store

**Bạn cần tôi hướng dẫn chi tiết deploy lên platform nào không?**
