import authService from './authService.js';
import userService from './userService.js';
import productService from './productService.js';
import orderService from './orderService.js';
import categoryService from './categoryService.js';
import contactService from './contactService.js';
import ratingService from './ratingService.js';
import emailService from './emailService.js';
import s3UploadService from './s3UploadService.js';

export {
  authService,
  userService,
  productService,
  orderService,
  categoryService,
  contactService,
  ratingService,
  emailService,
  s3UploadService as uploadService
};