import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { User } from '../models/User.js';
import { connectToDatabase } from '../config/database.js';
import { sendOTPEmail } from '../utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'cookshare-secret-key-2024';
const OTP_COLLECTION = 'password_reset_otps';

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã được sử dụng' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default role 'user' (will be updated in onboarding)
    const result = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'user', // Default role, will be updated in onboarding
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: {
        id: result.insertedId.toString(),
        email,
        name,
        role: 'user',
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại sau' 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập email và mật khẩu' 
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('🔐 Login - User not found for email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    console.log('🔐 Login - User found:', {
      userId: user._id?.toString(),
      email: user.email,
      hasPassword: !!user.password,
      passwordHashLength: user.password?.length,
      passwordHashPrefix: user.password?.substring(0, 20),
    });

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Login - Password check result:', {
      isValid: isPasswordValid,
      passwordLength: password.length,
      storedHashPrefix: user.password?.substring(0, 20),
    });
    
    if (!isPasswordValid) {
      console.log('❌ Login - Password validation failed for user:', user.email);
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại sau' 
    });
  }
};

/**
 * Forgot password - Generate OTP
 */
export const forgotPassword = async (req, res) => {
  try {
    console.log('[AUTH] Forgot password request received');
    const { email } = req.body;
    console.log('[AUTH] Email:', email);

    if (!email) {
      console.log('[AUTH] Email is missing');
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập email' 
      });
    }

    // Find user
    console.log('[AUTH] Looking for user with email:', email);
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('[AUTH] User not found for email:', email);
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'Nếu email tồn tại, chúng tôi đã gửi mã OTP. Vui lòng kiểm tra.',
      });
    }
    console.log('[AUTH] User found:', user.email);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('[AUTH] Generated OTP:', otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    console.log('[AUTH] Storing OTP in database...');
    const { db } = await connectToDatabase();
    await db.collection(OTP_COLLECTION).updateOne(
      { email },
      {
        $set: {
          email,
          otp,
          expiresAt,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log('[AUTH] OTP stored in database');

    // Send OTP via email
    console.log(`[AUTH] Sending OTP email to: ${email}`);
    const emailResult = await sendOTPEmail(email, otp);
    console.log('[AUTH] Email result:', JSON.stringify(emailResult, null, 2));
    
    if (!emailResult.success) {
      // If email fails, log OTP for development/testing
      console.log(`[DEV] Email sending failed. OTP for ${email}: ${otp}`);
      console.error('[EMAIL] Error:', emailResult.error);
      
      // Still return success but log the OTP for development
      // In production, you might want to return an error instead
      return res.json({
        success: true,
        message: 'Mã OTP đã được tạo. Vui lòng kiểm tra email (hoặc console log nếu email service chưa được cấu hình).',
        // Only return OTP in development mode if email failed
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    }

    res.json({
      success: true,
      message: 'Mã OTP đã được gửi. Vui lòng kiểm tra email.',
    });
  } catch (error) {
    console.error('[AUTH] Forgot password error:', error);
    console.error('[AUTH] Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại sau' 
    });
  }
};

/**
 * Reset password - Verify OTP and reset password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại' 
      });
    }

    // Verify OTP
    const { db } = await connectToDatabase();
    const otpRecord = await db.collection(OTP_COLLECTION).findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn' 
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không đúng' 
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      // Delete expired OTP
      await db.collection(OTP_COLLECTION).deleteOne({ email });
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.update(user._id, { password: hashedPassword });

    // Delete OTP after successful reset
    await db.collection(OTP_COLLECTION).deleteOne({ email });

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại sau' 
    });
  }
};

