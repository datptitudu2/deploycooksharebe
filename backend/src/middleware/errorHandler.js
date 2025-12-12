/**
 * Error Handler Middleware
 * Xử lý lỗi tập trung cho toàn bộ ứng dụng
 */

import { HTTP_STATUS, MESSAGES } from '../constants/index.js';

/**
 * Custom Error Class
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Phân biệt lỗi nghiệp vụ vs lỗi hệ thống
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Handler
 * Xử lý các route không tồn tại
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route không tồn tại: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND
  );
  next(error);
};

/**
 * Global Error Handler
 * Xử lý tất cả lỗi trong ứng dụng
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Log lỗi ra console (development)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      statusCode: error.statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error.message = `${field} đã tồn tại`;
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // MongoDB Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    error.message = 'ID không hợp lệ';
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    error.message = MESSAGES.AUTH_INVALID_TOKEN;
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token đã hết hạn. Vui lòng đăng nhập lại';
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // Multer Error (File Upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File quá lớn. Vui lòng chọn file nhỏ hơn 5MB';
    } else {
      error.message = 'Lỗi upload file';
    }
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error.message = messages.join(', ');
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
  }

  // Response
  const response = {
    success: false,
    message: error.message || MESSAGES.SERVER_ERROR,
    statusCode: error.statusCode,
  };

  // Thêm chi tiết lỗi trong development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Async Handler Wrapper
 * Wrap async functions để tự động catch lỗi
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Helper Functions
 */

// Tạo lỗi Bad Request (400)
export const badRequest = (message, details = null) => {
  return new AppError(message, HTTP_STATUS.BAD_REQUEST, details);
};

// Tạo lỗi Unauthorized (401)
export const unauthorized = (message = MESSAGES.AUTH_UNAUTHORIZED) => {
  return new AppError(message, HTTP_STATUS.UNAUTHORIZED);
};

// Tạo lỗi Forbidden (403)
export const forbidden = (message = 'Bạn không có quyền truy cập') => {
  return new AppError(message, HTTP_STATUS.FORBIDDEN);
};

// Tạo lỗi Not Found (404)
export const notFound = (message = 'Không tìm thấy') => {
  return new AppError(message, HTTP_STATUS.NOT_FOUND);
};

// Tạo lỗi Internal Server (500)
export const internalServerError = (message = MESSAGES.SERVER_ERROR) => {
  return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};

export default {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalServerError,
};

