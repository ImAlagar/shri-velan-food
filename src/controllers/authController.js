// controllers/authController.js
import { authService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: user
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }

  const result = await authService.forgotPassword(email);
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, userId, password } = req.body;

  if (!token || !userId || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token, user ID, and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  const result = await authService.resetPassword(token, userId, password);
  
  res.status(200).json({
    success: result.success,
    message: result.message
  });
});

export const validateResetToken = asyncHandler(async (req, res) => {
  const { token, userId } = req.query;

  if (!token || !userId) {
    return res.status(400).json({
      success: false,
      message: 'Token and user ID are required'
    });
  }

  const result = await authService.validateResetToken(token, userId);
  
  res.status(200).json({
    success: result.valid,
    message: result.message,
    data: result.user || null
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: profile
  });
});