// controllers/couponController.js
import couponService from '../services/couponService.js';
import { asyncHandler } from '../utils/helpers.js';

export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.getCoupons();
  
  res.status(200).json({
    success: true,
    data: coupons,
  });
});

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.getCouponById(req.params.id);
  
  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found',
    });
  }
  
  res.status(200).json({
    success: true,
    data: coupon,
  });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Coupon created successfully',
    data: coupon,
  });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Coupon updated successfully',
    data: coupon,
  });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  
  res.status(200).json({
    success: true,
    message: 'Coupon deleted successfully',
  });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  
  try {
    const coupon = await couponService.validateCoupon(code, subtotal);
    const discount = await couponService.calculateDiscount(coupon, subtotal);
    
    res.status(200).json({
      success: true,
      data: {
        coupon,
        discount,
        finalAmount: subtotal - discount,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});