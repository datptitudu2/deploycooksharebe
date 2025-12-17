# ✅ Checklist Deploy Model Server lên Render

## 📋 Trước khi deploy

- [x] Code đã được tối ưu cho Render free tier
- [x] `app.py` force CPU mode
- [x] `requirements.txt` đầy đủ dependencies
- [x] `.gitignore` đã tạo
- [x] `README.md` có hướng dẫn deploy

## 🚀 Các bước deploy

### 1. Push code lên GitHub

```bash
cd CookShare
git status
git add backend/model_server/
git commit -m "Add model server for Render deployment"
git push origin main
```

### 2. Deploy trên Render Dashboard

1. [ ] Vào https://dashboard.render.com
2. [ ] Click "New" → "Web Service"
3. [ ] Connect GitHub repo (cùng repo với backend)
4. [ ] Chọn repo và branch `main`
5. [ ] Settings:
   - [ ] Name: `cookbot-model-server`
   - [ ] Environment: `Python 3`
   - [ ] **Root Directory:** `backend/model_server` ← QUAN TRỌNG!
   - [ ] Build Command: `pip install -r requirements.txt`
   - [ ] Start Command: `python app.py`
   - [ ] Plan: `Free`
6. [ ] Environment Variables (nếu cần):
   - [ ] `HF_TOKEN`: Token Hugging Face (nếu model private)
7. [ ] Click "Create Web Service"

### 3. Chờ deploy hoàn tất

- [ ] Build thành công (5-10 phút)
- [ ] Service running
- [ ] Lấy URL: `https://cookbot-model-server.onrender.com`

### 4. Test API

```bash
# Health check
curl https://cookbot-model-server.onrender.com/health

# Test predict (có thể mất 10-30s lần đầu do cold start)
curl -X POST https://cookbot-model-server.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Xin chào"}'
```

### 5. Cấu hình Backend

Cập nhật `.env` của backend:

```env
USE_MODEL_SERVER=true
MODEL_SERVER_URL=https://cookbot-model-server.onrender.com
```

### 6. Test từ App

- [ ] Mở app CookShare
- [ ] Vào màn hình Chatbot
- [ ] Test với prompt: "Xin chào"
- [ ] Kiểm tra response từ model server

## ⚠️ Lưu ý

1. **Cold start:** Lần đầu sau khi sleep mất 10-30 giây
2. **Inference time:** 5-10 giây/request (do 0.1 CPU)
3. **Timeout:** Set timeout 30s ở client
4. **Sleep:** Service có thể sleep sau 15 phút idle

## 🐛 Troubleshooting

### Build failed
- Kiểm tra `requirements.txt` có đúng không
- Kiểm tra Python version (3.10)

### Model load failed
- Kiểm tra `HF_TOKEN` nếu model private
- Kiểm tra internet connection trên Render

### Service không start
- Xem logs trong Render Dashboard
- Kiểm tra `app.py` có lỗi syntax không

### Response quá chậm
- Bình thường với Render free tier (0.1 CPU)
- Có thể upgrade lên Starter ($7) để nhanh hơn

## ✅ Hoàn thành

Sau khi deploy thành công:
- [ ] Model server chạy ổn định
- [ ] Backend có thể gọi API
- [ ] App hoạt động bình thường
- [ ] Test với nhiều prompts khác nhau

