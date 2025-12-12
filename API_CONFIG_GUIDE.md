# 🔧 Hướng Dẫn Cấu Hình API URL - Google Play Store

## ⚠️ QUAN TRỌNG: File `config/api.ts` ẢNH HƯỞNG TRỰC TIẾP ĐẾN APP

File này được sử dụng ở **41 vị trí** trong toàn bộ app:
- Authentication (login, register)
- Recipe management
- Chatbot
- Meal planning
- Messages
- User profile
- Challenges
- Notifications
- Và nhiều tính năng khác

**Nếu cấu hình SAI, app sẽ KHÔNG HOẠT ĐỘNG trong production!**

---

## 📋 Tình Trạng Hiện Tại

### ✅ Đã Đúng:
- Logic phân biệt development/production (`__DEV__`)
- Hỗ trợ environment variable (`EXPO_PUBLIC_API_URL`)
- Auto-detect IP trong development

### ⚠️ CẦN THAY ĐỔI:
- `PRODUCTION_API_URL` hiện là placeholder: `'https://your-production-api.com/api'`
- Cần thay bằng URL thật của backend server

---

## 🚀 Các Bước Chuẩn Bị

### Bước 1: Đảm Bảo Backend Đã Deploy

Backend phải:
- ✅ Đã deploy lên server (VPS, Heroku, AWS, etc.)
- ✅ Có domain/URL public (ví dụ: `https://api.cookshare.com`)
- ✅ Có SSL certificate (HTTPS) - **BẮT BUỘC** cho production
- ✅ CORS đã được cấu hình đúng
- ✅ Port 3000 (hoặc port khác) đã được expose

### Bước 2: Chọn Cách Cấu Hình

#### **Cách 1: Sử dụng Environment Variable (KHUYẾN NGHỊ)**

1. Tạo file `.env` trong thư mục `CookShare/`:
```env
EXPO_PUBLIC_API_URL=https://your-api-domain.com/api
```

2. Đảm bảo `.env` đã có trong `.gitignore` (đã có)

3. Khi build production:
```bash
# Expo sẽ tự động đọc EXPO_PUBLIC_API_URL từ .env
eas build --platform android --profile production
```

**Ưu điểm:**
- Không cần hardcode URL trong code
- Dễ thay đổi giữa các môi trường
- An toàn hơn (không commit URL vào Git)

#### **Cách 2: Hardcode Trực Tiếp (Đơn giản hơn)**

Sửa trực tiếp trong `config/api.ts`:
```typescript
const PRODUCTION_API_URL = 'https://your-api-domain.com/api';
```

**Lưu ý:** 
- URL sẽ được commit vào Git
- Cần sửa lại mỗi khi thay đổi môi trường

---

## 📝 Ví Dụ Cấu Hình

### Nếu Backend Deploy Trên:
- **Heroku**: `https://cookshare-api.herokuapp.com/api`
- **VPS với domain**: `https://api.cookshare.com/api`
- **AWS/Cloud**: `https://api.cookshare.app/api`
- **Railway/Render**: `https://cookshare-api.railway.app/api`

### Format URL:
```
https://[domain]/api
```

**Lưu ý:**
- ✅ Phải có `https://` (không dùng `http://`)
- ✅ Phải có `/api` ở cuối (hoặc path tương ứng)
- ✅ Không có dấu `/` ở cuối (trừ khi backend yêu cầu)

---

## 🔍 Kiểm Tra Cấu Hình

### 1. Test API URL Trong Browser:
```bash
# Mở browser và test:
https://your-api-domain.com/api/health
# hoặc
https://your-api-domain.com/api/recipes
```

### 2. Test Từ App (Development):
```typescript
// Trong app, log ra để kiểm tra:
console.log('API URL:', API_URL);
```

### 3. Test Production Build:
- Build APK/AAB
- Cài đặt trên thiết bị thật
- Test các tính năng cần API

---

## ⚠️ Các Lỗi Thường Gặp

### 1. "Network Error" hoặc "Connection Failed"
**Nguyên nhân:**
- Backend chưa deploy
- URL sai
- Backend không accessible từ internet
- Firewall chặn

**Giải pháp:**
- Kiểm tra backend có chạy không
- Test URL trong browser
- Kiểm tra firewall/security groups

### 2. "CORS Error"
**Nguyên nhân:**
- Backend chưa cấu hình CORS cho domain của app

**Giải pháp:**
- Cấu hình CORS trong backend để accept requests từ app
- Thêm `*` (development only) hoặc domain cụ thể

### 3. "SSL Certificate Error"
**Nguyên nhân:**
- Backend dùng HTTP thay vì HTTPS
- SSL certificate không hợp lệ

**Giải pháp:**
- **BẮT BUỘC** dùng HTTPS trong production
- Cài đặt SSL certificate hợp lệ (Let's Encrypt, Cloudflare, etc.)

---

## 📦 Checklist Trước Khi Build Production

- [ ] Backend đã deploy và accessible từ internet
- [ ] Backend có HTTPS (SSL certificate)
- [ ] Đã set `EXPO_PUBLIC_API_URL` trong `.env` HOẶC hardcode trong `config/api.ts`
- [ ] Đã test API URL trong browser
- [ ] Đã test app với production API URL (development mode)
- [ ] Đã build và test APK/AAB trên thiết bị thật
- [ ] Tất cả tính năng hoạt động bình thường

---

## 🔐 Bảo Mật

### ✅ Đã An Toàn:
- IP local (`192.168.1.126`) chỉ dùng trong development
- Environment variable không được commit vào Git

### ⚠️ Lưu Ý:
- Không hardcode API keys, secrets trong code
- Sử dụng HTTPS cho tất cả API calls
- Backend phải có authentication/authorization

---

## 📞 Ví Dụ Cấu Hình Hoàn Chỉnh

### File `.env`:
```env
EXPO_PUBLIC_API_URL=https://api.cookshare.com/api
```

### File `config/api.ts` (sau khi cấu hình):
```typescript
// Production API URL
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.cookshare.com/api';
```

### Kết Quả:
- **Development**: Tự động dùng IP local hoặc emulator
- **Production**: Dùng `https://api.cookshare.com/api`

---

## 🎯 Tóm Tắt

1. ✅ File `config/api.ts` **QUAN TRỌNG** - ảnh hưởng toàn bộ app
2. ⚠️ **PHẢI** thay đổi `PRODUCTION_API_URL` trước khi build
3. ✅ Backend **PHẢI** có HTTPS
4. ✅ Test kỹ trước khi publish lên Google Play Store
