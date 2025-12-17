# 🔧 Fix lỗi Deploy trên Render

## ❌ Lỗi gặp phải

```
ERROR: Could not find a version that satisfies the requirement torch==2.1.0
```

**Nguyên nhân:** 
- Render đang dùng Python 3.13.4 mặc định
- `torch==2.1.0` không support Python 3.13
- Chỉ support đến Python 3.11

## ✅ Giải pháp

### Option 1: Force Python 3.10 (Khuyến nghị)

**Trong Render Dashboard:**
1. Vào Service Settings
2. Environment Variables
3. Thêm: `PYTHON_VERSION` = `3.10`
4. Save changes
5. Manual Deploy lại

**Hoặc dùng `runtime.txt`:**
- File `runtime.txt` đã được tạo với `python-3.10.13`
- Render sẽ tự động detect và dùng Python 3.10

### Option 2: Update torch lên version mới (Đã làm)

**Đã update `requirements.txt`:**
- `torch==2.5.1` (support Python 3.13)
- `transformers==4.45.0`
- `accelerate==0.34.0`
- `peft==0.11.0`
- Các packages khác đã update

## 🚀 Các bước fix

### 1. Push code mới lên GitHub

```bash
cd CookShare
git add backend/model_server/
git commit -m "Fix: Update torch version for Python 3.13 compatibility"
git push origin main
```

### 2. Trên Render Dashboard

**Cách 1: Dùng runtime.txt (Tự động)**
- Render sẽ tự động detect `runtime.txt` và dùng Python 3.10
- Không cần set environment variable

**Cách 2: Set Environment Variable (Manual)**
1. Vào Service Settings
2. Environment Variables
3. Add: `PYTHON_VERSION` = `3.10`
4. Save
5. Manual Deploy

### 3. Re-deploy

- Render sẽ tự động re-deploy khi có commit mới
- Hoặc click "Manual Deploy" trong Dashboard

## 📝 Files đã cập nhật

1. ✅ `requirements.txt` - Updated torch và các packages
2. ✅ `runtime.txt` - Force Python 3.10
3. ✅ `render.yaml` - Có PYTHON_VERSION=3.10

## ⚠️ Lưu ý

- **Option 1 (Python 3.10):** Giữ nguyên torch 2.1.0, an toàn hơn
- **Option 2 (Update torch):** Dùng torch 2.5.1, có thể có breaking changes nhỏ

**Khuyến nghị:** Dùng Option 1 (Python 3.10) vì đã test với torch 2.1.0

## ✅ Sau khi fix

Deploy sẽ thành công và model server sẽ chạy với:
- Python 3.10
- torch 2.5.1 (hoặc 2.1.0 nếu dùng Python 3.10)
- Model `uduptit/cookbot-vietnamese`

