import { categoryService, uploadService } from '../services/index.js';
import s3UploadService from '../services/s3UploadService.js';
import { asyncHandler } from '../utils/helpers.js';

export const createCategory = asyncHandler(async (req, res) => {
  let imageData = null;
  
  if (req.file) {
    try {
      // Use S3 for upload
      imageData = await s3UploadService.uploadCategoryImage(req.file.buffer);
    } catch (uploadError) {
      console.error('Image upload error:', uploadError);
      return res.status(400).json({
        success: false,
        message: `Image upload failed: ${uploadError.message}`
      });
    }
  }

  const categoryData = {
    ...req.body,
    isActive: req.body.isActive === 'true',
    image: imageData?.url || null,
    imagePublicId: imageData?.key || null // Store S3 key instead of public_id
  };

  const category = await categoryService.createCategory(categoryData);
  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});


export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.status(200).json({
    success: true,
    data: categories
  });
});

// For customers - only active categories  
export const getActiveCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getActiveCategories();
  res.status(200).json({
    success: true,
    data: categories
  });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  res.status(200).json({
    success: true,
    data: category
  });
});

export const getCategoryStats = asyncHandler(async (req, res) => {
  try {
    const stats = await categoryService.getCategoryStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getCategoryStats controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics',
      error: error.message
    });
  }
});

export const updateCategory = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };
  const categoryId = req.params.id;
  
  if (req.file) {
    try {
      // First, get existing category to delete old image
      const existingCategory = await categoryService.getCategoryById(categoryId);
      
      // Upload new image to S3
      const imageData = await s3UploadService.uploadCategoryImage(req.file.buffer);
      updateData.image = imageData.url;
      updateData.imagePublicId = imageData.key;
      
      // Delete old image from S3 if exists
      if (existingCategory.imagePublicId) {
        await s3UploadService.deleteImage(existingCategory.imagePublicId);
      }
    } catch (uploadError) {
      console.error('Image upload error:', uploadError);
      return res.status(400).json({
        success: false,
        message: `Image upload failed: ${uploadError.message}`
      });
    }
  }

  if (req.body.isActive) {
    updateData.isActive = req.body.isActive === 'true';
  }

  const category = await categoryService.updateCategory(categoryId, updateData);
  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category
  });
});

export const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const { isActive } = req.body;

  // Validate the request body
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isActive must be a boolean value'
    });
  }

  const category = await categoryService.updateCategory(categoryId, { isActive });
  
  res.status(200).json({
    success: true,
    message: `Category ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: category
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  
  // First get category to retrieve image data for cleanup
  const category = await categoryService.getCategoryById(categoryId);
  
  // Delete image from S3 if exists
  if (category.imagePublicId) {
    await s3UploadService.deleteImage(category.imagePublicId);
  }
  
  await categoryService.deleteCategory(categoryId);
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});