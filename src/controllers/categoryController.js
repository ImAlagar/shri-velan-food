import { categoryService, uploadService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const createCategory = asyncHandler(async (req, res) => {
  let imageData = null;
  
  if (req.file) {
    try {
      // Use category-specific folder
      imageData = await uploadService.uploadCategoryImage(req.file.buffer);
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
    imagePublicId: imageData?.public_id || null
  };

  const category = await categoryService.createCategory(categoryData);
  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});


export const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getCategories();
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

export const updateCategory = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };
  
  if (req.file) {
    try {
      const imageData = await uploadService.uploadCategoryImage(req.file.buffer);
      updateData.image = imageData.url;
      updateData.imagePublicId = imageData.public_id;
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

  const category = await categoryService.updateCategory(req.params.id, updateData);
  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});