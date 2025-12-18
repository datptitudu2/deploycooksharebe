/**
 * Email Service
 * Utility for sending emails (OTP, notifications, etc.)
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER; // Your email
const EMAIL_PASS = process.env.EMAIL_PASS; // App password or SMTP password
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'CookShare <noreply@cookshare.com>';

// Create transporter
let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  console.log('[EMAIL] Initializing email service...');
  console.log('[EMAIL] Host:', EMAIL_HOST);
  console.log('[EMAIL] Port:', EMAIL_PORT);
  console.log('[EMAIL] User:', EMAIL_USER);
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    // Tối ưu connection để gửi email nhanh hơn
    connectionTimeout: 10000, // 10s timeout cho connection
    greetingTimeout: 10000, // 10s timeout cho greeting
    socketTimeout: 10000, // 10s timeout cho socket
    pool: true, // Sử dụng connection pooling
    maxConnections: 5, // Tối đa 5 connections
    maxMessages: 100, // Tối đa 100 messages per connection
  });
  console.log('[EMAIL] Email service initialized successfully');
} else {
  console.warn('[EMAIL] Email credentials not configured. Email sending will be disabled.');
  console.warn('[EMAIL] EMAIL_USER:', EMAIL_USER ? 'Set' : 'Missing');
  console.warn('[EMAIL] EMAIL_PASS:', EMAIL_PASS ? 'Set' : 'Missing');
}

/**
 * Send OTP email for password reset
 */
export const sendOTPEmail = async (email, otp) => {
  console.log('[EMAIL] Attempting to send OTP email to:', email);
  
  if (!transporter) {
    console.warn('[EMAIL] Email service not configured. OTP:', otp);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    console.log('[EMAIL] Sending email...');
    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Mã OTP đặt lại mật khẩu - CookShare',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin: 20px 0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF6B35;
              margin-bottom: 10px;
            }
            .otp-box {
              background-color: #FFFFFF;
              border: 2px dashed #FF6B35;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #FF6B35;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍳 CookShare</div>
              <h2>Đặt lại mật khẩu</h2>
            </div>
            
            <p>Xin chào,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản CookShare của bạn.</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #666;">Mã OTP của bạn:</p>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Lưu ý:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </div>
            
            <p>Vui lòng nhập mã OTP trên vào ứng dụng để hoàn tất việc đặt lại mật khẩu.</p>
            
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ CookShare</p>
              <p style="margin-top: 10px;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        CookShare - Đặt lại mật khẩu
        
        Xin chào,
        
        Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản CookShare của bạn.
        
        Mã OTP của bạn: ${otp}
        
        Lưu ý:
        - Mã OTP này chỉ có hiệu lực trong 10 phút
        - Không chia sẻ mã này với bất kỳ ai
        - Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này
        
        Vui lòng nhập mã OTP trên vào ứng dụng để hoàn tất việc đặt lại mật khẩu.
        
        Trân trọng,
        Đội ngũ CookShare
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test email connection
 */
export const testEmailConnection = async () => {
  if (!transporter) {
    return { success: false, message: 'Email service not configured' };
  }

  try {
    await transporter.verify();
    console.log('[EMAIL] Email service is ready');
    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Email service verification failed:', error);
    return { success: false, error: error.message };
  }
};

