# MODULE 1: CHATBOT, MESSAGES, NOTIFICATIONS, VIDEO
## NGƯỜI PHỤ TRÁCH: ĐẠT (LEADER)

## Các file Backend:
- backend/src/controllers/chatbotController.js
- backend/src/routes/chatbotRoutes.js
- backend/src/controllers/messageController.js
- backend/src/routes/messageRoutes.js
- backend/src/controllers/notificationController.js
- backend/src/routes/notificationRoutes.js
- backend/src/controllers/videoController.js (cần tạo mới)
- backend/src/routes/videoRoutes.js (cần tạo mới)
- backend/src/models/Video.js (cần tạo mới)

## Các file Frontend:
- app/(tabs)/chatbot.tsx
- app/messages/index.tsx
- app/messages/[partnerId].tsx
- app/notifications.tsx
- app/video/upload.tsx (cần tạo mới)
- app/video/[videoId].tsx (cần tạo mới)
- app/video/my-videos.tsx (cần tạo mới)

## Tính năng:
1. Chatbot AI - Tư vấn món ăn, nhận diện nguyên liệu từ ảnh
2. Messages - Nhắn tin trực tiếp giữa các user, gửi ảnh, gửi voice
3. Notifications - Thông báo cho user về like, comment, follow, message, challenge
4. Video - Upload và xem video hướng dẫn nấu ăn

