# 🍳 CookBot Training Guide

## Hướng dẫn train chatbot AI riêng - KHÔNG CẦN API KEY!

### Bước 1: Chuẩn bị

1. Tạo tài khoản [Hugging Face](https://huggingface.co) (FREE)
2. Tạo [Access Token](https://huggingface.co/settings/tokens) với quyền `write`

### Bước 2: Train model

1. Mở [Google Colab](https://colab.research.google.com)
2. Upload file `CookBot_Training.ipynb`
3. Chọn Runtime > Change runtime type > **GPU (T4)**
4. Upload dataset:
   - `dataset_cookbot.jsonl`
   - `dataset_cookbot_part2.jsonl`
5. Chạy từng cell theo thứ tự
6. Khi hỏi Hugging Face token, paste token đã tạo
7. **QUAN TRỌNG**: Thay `YOUR_USERNAME` bằng username Hugging Face của bạn

### Bước 3: Deploy

Sau khi train xong, model sẽ được upload lên:
```
https://huggingface.co/YOUR_USERNAME/cookbot-vietnamese
```

### Bước 4: Cấu hình Backend

**Xem file `SETUP_GUIDE.md` để hướng dẫn chi tiết!**

Tóm tắt:
1. Tạo file `.env` trong `CookShare/backend/`
2. Thêm:
   ```env
   USE_SELF_HOSTED_AI=true
   HF_MODEL=YOUR_USERNAME/cookbot-vietnamese
   ```
3. **QUAN TRỌNG**: Thay `YOUR_USERNAME` bằng username Hugging Face của bạn!

### Cấu trúc file

```
training/
├── README.md                    # File này
├── CookBot_Training.ipynb       # Notebook train
├── dataset_cookbot.jsonl        # Dataset phần 1
└── dataset_cookbot_part2.jsonl  # Dataset phần 2
```

### Thời gian train

- Google Colab Free (T4 GPU): ~15-30 phút
- Dataset hiện tại: 50+ samples

### Mở rộng dataset

Để cải thiện chất lượng, thêm samples vào file `.jsonl` theo format:
```json
{"messages":[
  {"role":"system","content":"Bạn là CookBot - AI tư vấn món ăn."},
  {"role":"user","content":"Câu hỏi của user"},
  {"role":"assistant","content":"Câu trả lời của CookBot"}
]}
```

### Lưu ý

1. **Render Free Tier**: Không chạy được model trực tiếp (512MB RAM không đủ)
2. **Giải pháp**: Model chạy trên Hugging Face, Render chỉ gọi API
3. **Hoàn toàn FREE**: Không cần OpenAI API key
4. **Tự train**: Có model riêng, chứng minh được với thầy

### Troubleshooting

**Model chậm/không respond:**
- Hugging Face Inference API có thể cần "warm up" lần đầu
- Đợi 20-30 giây và thử lại

**Out of memory khi train:**
- Giảm `per_device_train_batch_size` xuống 2
- Giảm `max_length` xuống 256

**Upload lên Hugging Face lỗi:**
- Kiểm tra token có quyền `write`
- Kiểm tra đã login đúng cách

---

## Kết quả

Sau khi hoàn thành, bạn có:
- ✅ Model AI riêng (đã train)
- ✅ Không cần API key
- ✅ FREE 100%
- ✅ Có thể chứng minh với thầy

