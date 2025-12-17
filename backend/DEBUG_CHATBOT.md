# 🐛 Debug Chatbot Error

## Vấn đề
Chatbot trả về: "Xin lỗi, tôi gặp sự cố. Vui lòng thử lại sau!"

## Các bước debug:

### 1. Kiểm tra Groq API
```powershell
cd CookShare\backend
.\test_groq.ps1
```

### 2. Kiểm tra Backend logs
Khi gửi message, xem terminal backend có log:
- `🤖 Calling Groq API with model: ...`
- `📤 Sending message to Groq API...`
- `✅ Got response from Groq API` hoặc `❌ Groq API error: ...`

### 3. Kiểm tra .env
Đảm bảo file `.env` có:
```env
USE_SELF_HOSTED_AI=true
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
```

### 4. Kiểm tra Backend đang chạy
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/chatbot/check-apikey" -Method GET
```

### 5. Kiểm tra Authentication
Đảm bảo frontend gửi token trong header:
```
Authorization: Bearer <token>
```

### 6. Test trực tiếp từ Postman/curl
```bash
curl -X POST http://localhost:3000/api/chatbot/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Xin chào", "dietMode": "none"}'
```

## Common Issues:

1. **GROQ_API_KEY không được đọc**
   - Restart backend sau khi thay đổi .env
   - Kiểm tra .env có đúng format không

2. **Network timeout**
   - Groq API có thể bị chậm
   - Tăng timeout trong frontend

3. **Authentication fail**
   - Token hết hạn
   - Token không đúng format


