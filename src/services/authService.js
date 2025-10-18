import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { JWT_SECRET } from '../config/index.js';
import { emailService } from './index.js';

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

    // Generate tokens
    const tokens = this.generateTokens(user);

    return { user, ...tokens };
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
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists for security
      console.log(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken);
      return { message: 'If the email exists, a reset link has been sent' };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async resetPassword(token, newPassword) {
    if (!token) {
      throw new Error('Reset token is required');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword }
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid reset token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Reset token has expired');
      } else {
        throw new Error('Failed to reset password');
      }
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