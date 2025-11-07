import { productService, uploadService } from '../services/index.js';
import s3UploadService from '../services/s3UploadService.js';
import { asyncHandler } from '../utils/helpers.js';
import prisma from '../config/database.js';

export const createProduct = asyncHandler(async (req, res) => {
  let imageUrls = [];
  let imagePublicIds = [];
  let uploadedImageData = [];
  
  if (req.files && req.files.length > 0) {
    // Upload images to S3
    uploadedImageData = await s3UploadService.uploadMultipleProductImages(req.files);
    imageUrls = uploadedImageData.map(img => img.url);
    imagePublicIds = uploadedImageData.map(img => img.key);
  }

  // FIX: Handle array fields properly for FormData
  const parseArrayField = (fieldName) => {
    if (Array.isArray(req.body[fieldName])) {
      // If it's already an array (from FormData multiple entries)
      return req.body[fieldName];
    } else if (typeof req.body[fieldName] === 'string') {
      // If it's a JSON string
      try {
        return JSON.parse(req.body[fieldName]);
      } catch (error) {
        console.warn(`Failed to parse ${fieldName} as JSON, treating as array:`, error);
        return req.body[fieldName] ? [req.body[fieldName]] : [];
      }
    }
    return [];
  };

  const productData = {
    ...req.body,
    benefits: parseArrayField('benefits'),
    ingredients: parseArrayField('ingredients'),
    tags: parseArrayField('tags'),
    status: req.body.status === 'true',
    isCombo: req.body.isCombo === 'true',
    isFeatured: req.body.isFeatured === 'true', // Add isFeatured field
    normalPrice: parseFloat(req.body.normalPrice),
    offerPrice: req.body.offerPrice ? parseFloat(req.body.offerPrice) : null,
    stock: parseInt(req.body.stock),
    categoryId: req.body.categoryId,
    images: imageUrls,
    imagePublicIds: imagePublicIds
  };

  const product = await productService.createProduct(productData);
  
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product
  });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    category, 
    search, 
    status,
    featured,
    isCombo 
  } = req.query;
  
  const products = await productService.getProducts({ 
    page: parseInt(page), 
    limit: parseInt(limit), 
    category, 
    search, 
    status,
    featured,
    isCombo
  });
  
  res.status(200).json({
    success: true,
    data: products
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.status(200).json({
    success: true,
    data: product
  });
});

export const getProductStats = asyncHandler(async (req, res) => {
  const stats = await productService.getProductStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 8 } = req.query;
  
  try {
    const result = await productService.getFeaturedProducts({
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products',
      error: error.message
    });
  }
});

export const getComboProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 6 } = req.query;
  
  try {
    const result = await productService.getComboProducts({
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get combo products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch combo products',
      error: error.message
    });
  }
});

export const getProductsByTags = asyncHandler(async (req, res) => {
  const { tags } = req.query;
  const { page = 1, limit = 10 } = req.query;
  
  try {
    if (!tags) {
      return res.status(400).json({
        success: false,
        message: 'Tags parameter is required'
      });
    }

    const tagArray = Array.isArray(tags) ? tags : tags.split(',');
    
    const result = await productService.getProductsByTags({
      tags: tagArray,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get products by tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products by tags',
      error: error.message
    });
  }
});

export const getBestSellingProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 8 } = req.query;
  
  try {
    const result = await productService.getBestSellingProducts({
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get best selling products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch best selling products',
      error: error.message
    });
  }
});

// Admin endpoint to toggle featured status
export const toggleFeatured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;
  
  const product = await productService.toggleFeatured(id, isFeatured === 'true' || isFeatured === true);
  
  res.status(200).json({
    success: true,
    message: `Product ${isFeatured ? 'marked as' : 'removed from'} featured`,
    data: product
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  
  // Check if product exists first
  const existingProduct = await productService.getProductById(productId);
  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const updateData = { ...req.body };
  
  // Handle file uploads
  if (req.files && req.files.length > 0) {
        // Upload new images to S3
    const newImageData = await s3UploadService.uploadMultipleProductImages(req.files, productId);
    const newImageUrls = newImageData.map(img => img.url);
    const newImagePublicIds = newImageData.map(img => img.key);
    
    // Handle existing images
    if (req.body.existingImages) {
      try {
        const existingImagesFromRequest = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages;
        
        updateData.images = [...existingImagesFromRequest, ...newImageUrls];
        updateData.imagePublicIds = [
          ...existingImagesFromRequest.map((img, index) => 
            existingProduct.imagePublicIds[existingProduct.images.indexOf(img)]
          ).filter(id => id), 
          ...newImagePublicIds
        ];
      } catch (error) {
        console.error('Error parsing existingImages:', error);
        // Fallback: combine all existing with new
        updateData.images = [...(existingProduct.images || []), ...newImageUrls];
        updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
      }
    } else {
      // If no existing images specified, keep all existing and add new
      updateData.images = [...(existingProduct.images || []), ...newImageUrls];
      updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
    }
  } else {
    // No new files, just handle image reordering
    if (req.body.existingImages) {
      try {
        const existingImagesFromRequest = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages;
        
        updateData.images = existingImagesFromRequest;
        
        // Map existing public IDs to the reordered images
        const imageToPublicIdMap = {};
        existingProduct.images.forEach((img, index) => {
          imageToPublicIdMap[img] = existingProduct.imagePublicIds[index];
        });
        
        updateData.imagePublicIds = existingImagesFromRequest.map(img => imageToPublicIdMap[img]).filter(id => id);
      } catch (error) {
        console.error('Error handling existingImages:', error);
      }
    }
  }

  // Parse array fields
  const parseArrayField = (fieldName) => {
    if (!req.body[fieldName]) return undefined;
    
    if (Array.isArray(req.body[fieldName])) {
      return req.body[fieldName];
    } else if (typeof req.body[fieldName] === 'string') {
      try {
        return JSON.parse(req.body[fieldName]);
      } catch (error) {
        console.warn(`Failed to parse ${fieldName} as JSON:`, error);
        return [req.body[fieldName]];
      }
    }
    return undefined;
  };

  // Update array fields
  const benefits = parseArrayField('benefits');
  const ingredients = parseArrayField('ingredients');
  const tags = parseArrayField('tags');

  if (benefits) updateData.benefits = benefits;
  if (ingredients) updateData.ingredients = ingredients;
  if (tags) updateData.tags = tags;
  
  // Convert boolean fields
  if (req.body.status !== undefined) {
    updateData.status = req.body.status === 'true' || req.body.status === true;
  }
  if (req.body.isCombo !== undefined) {
    updateData.isCombo = req.body.isCombo === 'true' || req.body.isCombo === true;
  }
  if (req.body.isFeatured !== undefined) {
    updateData.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;
  }
  
  // Convert number fields
  if (req.body.normalPrice) {
    updateData.normalPrice = parseFloat(req.body.normalPrice);
  }
  if (req.body.offerPrice !== undefined && req.body.offerPrice !== '') {
    updateData.offerPrice = req.body.offerPrice ? parseFloat(req.body.offerPrice) : null;
  }
  if (req.body.stock !== undefined) {
    updateData.stock = parseInt(req.body.stock);
  }

  // Clean up the updateData
  const fieldsToRemove = ['existingImages', 'createdAt', 'updatedAt', 'orderItems', 'ratings'];
  fieldsToRemove.forEach(field => {
    delete updateData[field];
  });

  try {
    const product = await productService.updateProduct(productId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('❌ Product update failed:', error);
    throw error;
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  
  // First get product to retrieve image data for cleanup
  const product = await productService.getProductById(productId);
  
  // Delete all product images from S3
  if (product.imagePublicIds && product.imagePublicIds.length > 0) {
    await s3UploadService.deleteProductImages(productId);
  }
  
  await productService.deleteProduct(productId);
  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  const { id, imageIndex } = req.params;
  
  const product = await productService.getProductById(id);
  
  if (!product.images || !product.images[imageIndex]) {
    return res.status(404).json({
      success: false,
      message: 'Image not found'
    });
  }
  
  // Delete from S3
  if (product.imagePublicIds && product.imagePublicIds[imageIndex]) {
    await s3UploadService.deleteImage(product.imagePublicIds[imageIndex]);
  }
  
  // Remove from arrays
  const updatedImages = product.images.filter((_, index) => index !== parseInt(imageIndex));
  const updatedImagePublicIds = product.imagePublicIds ? 
    product.imagePublicIds.filter((_, index) => index !== parseInt(imageIndex)) : [];
  
  // Update product
  const updatedProduct = await productService.updateProduct(id, {
    images: updatedImages,
    imagePublicIds: updatedImagePublicIds
  });
  
  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    data: updatedProduct
  });
});

export const getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await productService.getProductsByCategory(req.params.categoryId);
  res.status(200).json({
    success: true,
    data: products
  });
});

export const getFilteredProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const {
    minPrice,
    maxPrice,
    inStock,
    onSale,
    ratings,
    sortBy,
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Parse query parameters
    const filters = {
      categoryId: parseInt(categoryId),
      minPrice: minPrice ? parseFloat(minPrice) : 0,
      maxPrice: maxPrice ? parseFloat(maxPrice) : 10000,
      inStock: inStock === 'true',
      onSale: onSale === 'true',
      ratings: ratings ? ratings.split(',').map(r => parseInt(r)) : [],
      sortBy: sortBy || 'name',
      page: parseInt(page),
      limit: parseInt(limit)
    };


    const result = await productService.getFilteredProductsByCategory(filters);
    
    res.status(200).json({
      success: true,
      data: result.products,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (error) {
    console.error('Filter products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to filter products',
      error: error.message
    });
  }
});

// Additional image management methods
export const addProductImages = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No images provided'
    });
  }

  const product = await productService.getProductById(productId);
  
  // Upload new images to product-specific folder - use s3UploadService
  const newImageData = await s3UploadService.uploadMultipleProductImages(req.files, productId);
  const newImageUrls = newImageData.map(img => img.url);
  const newImagePublicIds = newImageData.map(img => img.key); // Use .key for S3
  
  // Combine existing images with new ones
  const updatedImages = [...(product.images || []), ...newImageUrls];
  const updatedImagePublicIds = [...(product.imagePublicIds || []), ...newImagePublicIds];
  
  // Update product
  const updatedProduct = await productService.updateProduct(productId, {
    images: updatedImages,
    imagePublicIds: updatedImagePublicIds
  });
  
  res.status(200).json({
    success: true,
    message: 'Images added successfully',
    data: updatedProduct
  });
});

export const updateProductImageOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imageOrder } = req.body;
  
  const product = await productService.getProductById(id);
  
  if (!product.images || product.images.length !== imageOrder.length) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image order'
    });
  }
  
  // Reorder images based on provided order
  const reorderedImages = imageOrder.map(index => product.images[index]);
  const reorderedImagePublicIds = imageOrder.map(index => product.imagePublicIds[index]);
  
  const updatedProduct = await productService.updateProduct(id, {
    images: reorderedImages,
    imagePublicIds: reorderedImagePublicIds
  });
  
  res.status(200).json({
    success: true,
    message: 'Image order updated successfully',
    data: updatedProduct
  });
});