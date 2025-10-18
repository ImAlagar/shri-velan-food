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
  await authService.forgotPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: 'Password reset email sent'
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: profile
  });
});