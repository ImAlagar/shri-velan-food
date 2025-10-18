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

  const result = await authService.forgotPassword(email);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token and password are required'
    });
  }

  const result = await authService.resetPassword(token, password);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: profile
  });
});