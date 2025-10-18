import { userService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const users = await userService.getUsers({ 
    page: parseInt(page), 
    limit: parseInt(limit) 
  });
  res.status(200).json({
    success: true,
    data: users
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.status(200).json({
    success: true,
    data: user
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});