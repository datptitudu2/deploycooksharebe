# 📋 Tóm tắt: Chuẩn bị Deploy Model Server

## ✅ Đã hoàn thành

### 1. Tối ưu code
- ✅ `app.py` đã được tối ưu cho Render free tier:
  - Force CPU mode (không dùng GPU)
  - Dùng `torch.float16` để tiết kiệm RAM
  - Lazy loading model
  - Clear cache sau mỗi request

### 2. Files đã chuẩn bị
- ✅ `app.py` - Flask server (đã tối ưu)
- ✅ `requirements.txt` - Dependencies đầy đủ
- ✅ `README.md` - Hướng dẫn deploy chi tiết
- ✅ `render.yaml` - Config cho Render (có rootDir)
- ✅ `.gitignore` - Ignore files không cần thiết
- ✅ `DEPLOY_CHECKLIST.md` - Checklist từng bước

### 3. Files đã xóa
- ✅ `test_server.py` - Không cần trên production

## 📦 Cấu trúc thư mục

```
backend/model_server/
├── app.py                 # Flask server (đã tối ưu)
├── requirements.txt       # Dependencies
├── README.md             # Hướng dẫn deploy
├── render.yaml           # Render config
├── .gitignore            # Git ignore
└── DEPLOY_CHECKLIST.md   # Checklist deploy
```

## 🚀 Các bước tiếp theo

### 1. Git push

```bash
cd CookShare
git add backend/model_server/
git commit -m "Add model server for Render deployment"
git push origin main
```

### 2. Deploy trên Render

1. Vào https://dashboard.render.com
2. New → Web Service
3. Connect GitHub repo
4. **Root Directory:** `backend/model_server` ← QUAN TRỌNG!
5. Build: `pip install -r requirements.txt`
6. Start: `python app.py`
7. Plan: Free

### 3. Test API

```bash
curl https://cookbot-model-server.onrender.com/health
```

### 4. Cấu hình Backend

Thêm vào `.env`:
```env
USE_MODEL_SERVER=true
MODEL_SERVER_URL=https://cookbot-model-server.onrender.com
```

## 📊 Model Info

- **Model:** `uduptit/cookbot-vietnamese`
- **Type:** GPT-2 Small (124M) với LoRA fine-tuning
- **Training data:** 50+ samples từ `dataset_cookbot.jsonl`
- **Hugging Face:** https://huggingface.co/uduptit/cookbot-vietnamese

## ⚙️ Tối ưu cho Render Free Tier

- **RAM:** 512MB → Dùng float16 (~250MB)
- **CPU:** 0.1 vCPU → Force CPU mode
- **Inference:** 5-10 giây/request
- **Cold start:** 10-30 giây (lần đầu)

## 🎯 Kết quả mong đợi

Sau khi deploy:
- ✅ Model server chạy trên Render free tier
- ✅ Backend có thể gọi API để dùng model đã train
- ✅ App hoạt động với model fine-tuned
- ✅ Có thể switch giữa Model Server và Groq API

## 📝 Notes

- Model sẽ tự động download từ Hugging Face khi deploy
- Lần đầu load model mất 10-30 giây
- Render free tier có thể sleep sau 15 phút idle
- Có thể upgrade lên Starter ($7) để nhanh hơn

