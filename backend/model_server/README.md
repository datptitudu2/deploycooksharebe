# CookBot Model Server - Deploy trên Render

Server để serve model GPT-2 đã fine-tune `uduptit/cookbot-vietnamese` trên Render free tier.

## 🚀 Deploy trên Render (Từ cùng GitHub repo)

### Bước 1: Đảm bảo code đã push lên GitHub

```bash
cd CookShare
git add backend/model_server/
git commit -m "Add model server for Render"
git push origin main
```

### Bước 2: Deploy trên Render Dashboard

1. **Vào Render Dashboard:**
   - https://dashboard.render.com
   - Click "New" → "Web Service"

2. **Connect GitHub:**
   - Connect GitHub repo (cùng repo với backend)
   - Chọn repo và branch (main)

3. **Cấu hình Service:**
   ```
   Name: cookbot-model-server
   Environment: Python 3
   Root Directory: backend/model_server  ← QUAN TRỌNG!
   Build Command: pip install -r requirements.txt
   Start Command: python app.py
   Plan: Free
   ```

4. **Environment Variables (nếu cần):**
   - `HF_TOKEN`: Token Hugging Face (nếu model private)
   - `PORT`: Tự động set bởi Render

5. **Click "Create Web Service"**

### Bước 3: Chờ deploy

- **Build time:** 5-10 phút (cài dependencies)
- **First request:** 10-30 giây (load model lần đầu)
- **URL:** `https://cookbot-model-server.onrender.com`

## 📝 API Endpoints

### 1. Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "model_loaded": true,
  "memory_usage": "250.50MB"
}
```

### 2. Generate Response
```bash
POST /predict
Content-Type: application/json

{
  "prompt": "Hôm nay ăn gì?",
  "max_length": 200,
  "temperature": 0.7
}
```

Response:
```json
{
  "response": "Để gợi ý món ngon cho bạn, cho mình biết: Bạn thích ăn mặn hay nhẹ nhàng?",
  "generation_time": "3.45s",
  "model": "uduptit/cookbot-vietnamese"
}
```

## ⚙️ Tối ưu cho Render Free Tier

### Memory Optimization:
- ✅ Dùng `torch.float16` thay vì `float32` (giảm 50% RAM)
- ✅ `low_cpu_mem_usage=True` khi load model
- ✅ `gc.collect()` sau mỗi request
- ✅ Lazy loading (chỉ load khi cần)

### CPU Optimization:
- ✅ `torch.no_grad()` khi inference
- ✅ Batch size = 1
- ✅ Max length = 200 tokens

## 🔧 Local Testing

```bash
# Cài đặt dependencies
cd backend/model_server
pip install -r requirements.txt

# Chạy server
python app.py

# Test (terminal khác)
curl http://localhost:5000/health
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Xin chào"}'
```

## 🔗 Integrate với Backend

Sau khi deploy xong, cập nhật `.env` của backend:

```env
USE_MODEL_SERVER=true
MODEL_SERVER_URL=https://cookbot-model-server.onrender.com
```

## 📊 Performance

- **Model load time:** 10-30 giây (lần đầu)
- **Inference time:** 3-10 giây/request (tùy độ dài)
- **RAM usage:** ~250-400MB (với float16)
- **Cold start:** 10-30 giây

## ⚠️ Lưu ý

1. **Render free tier có thể sleep sau 15 phút idle**
   - Request đầu tiên sau khi sleep sẽ chậm (cold start)

2. **0.1 CPU rất chậm**
   - Inference có thể mất 5-10 giây
   - Nên set timeout cao hơn ở client

3. **512MB RAM rất ít**
   - Chỉ đủ cho GPT-2 Small với quantization
   - Có thể OOM nếu có nhiều requests cùng lúc

## 🔗 Integrate với Backend

Cập nhật `chatbotSelfHostedController.js`:

```javascript
// Thêm option để dùng model server
const USE_MODEL_SERVER = process.env.USE_MODEL_SERVER === 'true';
const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:5000';

async function callModelServer(userMessage) {
  const response = await fetch(`${MODEL_SERVER_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: userMessage })
  });
  const data = await response.json();
  return data.response;
}
```

## 🎓 Giải thích cho Giáo viên

"Em đã deploy model đã fine-tune lên Render free tier. Model server chạy độc lập, có thể gọi API để generate response. Tuy nhiên, do Render free tier chỉ có 512MB RAM và 0.1 CPU nên inference hơi chậm (5-10 giây). Vì vậy, em vẫn dùng Groq API cho production vì nhanh hơn và free."

