import { ratingService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const createRating = asyncHandler(async (req, res) => {
  const ratingData = {
    ...req.body,
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email
  };
  
  const rating = await ratingService.createRating(ratingData);
  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: rating
  });
});

export const getRatings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, approved } = req.query;
  const ratings = await ratingService.getRatings({ 
    page: parseInt(page), 
    limit: parseInt(limit), 
    approved: approved === 'true' 
  });
  res.status(200).json({
    success: true,
    data: ratings
  });
});

export const getProductRatings = asyncHandler(async (req, res) => {
  const ratings = await ratingService.getProductRatings(req.params.productId);
  res.status(200).json({
    success: true,
    data: ratings
  });
});

export const updateRatingStatus = asyncHandler(async (req, res) => {
  const rating = await ratingService.updateRatingStatus(req.params.id, req.body.isApproved);
  res.status(200).json({
    success: true,
    message: 'Rating status updated successfully',
    data: rating
  });
});

export const deleteRating = asyncHandler(async (req, res) => {
  await ratingService.deleteRating(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Rating deleted successfully'
  });
});