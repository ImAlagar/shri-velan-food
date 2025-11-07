// services/authService.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // ADD THIS IMPORT
import prisma from '../config/database.js';
import { JWT_SECRET } from '../config/index.js';
import emailNotificationService from './emailNotificationService.js';
import logger from '../utils/logger.js';

class AuthService {
  async register(userData) {
    const { email, password, name } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // ✅ Send welcome email (don't await - make it non-blocking)
    this.sendWelcomeEmail(user).catch(error => {
      console.error('❌ Welcome email failed to send:', error.message);
      // Don't throw error - registration should succeed even if email fails
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return { user, ...tokens };
  }

  async sendWelcomeEmail(user) {
    try {
      
      await emailNotificationService.sendWelcomeEmail({
        name: user.name,
        email: user.email,
        joinDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
      
    } catch (error) {
      console.error('❌ Welcome email sending failed:', {
        email: user.email,
        error: error.message
      });
      // Don't throw - email failure shouldn't break registration
    }
  }

  async login(credentials) {
    const { email, password } = credentials;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, ...tokens };
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }

  async logout(userId) {
    // Implement token blacklisting if needed
    return true;
  }

  async forgotPassword(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Security: Don't reveal if user exists
        logger.log(`Password reset requested for: ${email} (user not found)`);
        return { 
          success: true, 
          message: 'If an account with that email exists, a reset link has been sent.' 
        };
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Set expiry to 1 hour
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetTokenHash,
          resetTokenExpiry
        }
      });

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user.id}`;

      // Send password reset email
      await emailNotificationService.sendPasswordReset({
        name: user.name,
        email: user.email
      }, resetUrl);

      
      return {
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
      };

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  async resetPassword(token, userId, newPassword) {
    try {
      // Validate inputs
      if (!token || !userId || !newPassword) {
        throw new Error('Token, user ID, and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash the provided token to compare with stored hash
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          resetToken: resetTokenHash,
          resetTokenExpiry: {
            gt: new Date() // Token not expired
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        }
      });

      // Send password changed confirmation
      await emailNotificationService.sendPasswordChangedConfirmation({
        name: user.name,
        email: user.email
      });

      
      return {
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      };

    } catch (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
  }

  async validateResetToken(token, userId) {
    try {
      if (!token || !userId) {
        return { valid: false, message: 'Token and user ID are required' };
      }

      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          resetToken: resetTokenHash,
          resetTokenExpiry: {
            gt: new Date()
          }
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      if (!user) {
        return { valid: false, message: 'Invalid or expired reset token' };
      }

      return { 
        valid: true, 
        message: 'Token is valid',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };

    } catch (error) {
      console.error('❌ Token validation error:', error);
      return { valid: false, message: 'Error validating token' };
    }
  }

  async getProfile(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        addresses: true
      }
    });
  }
}

export default new AuthService();