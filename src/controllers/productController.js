import { productService, uploadService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const createProduct = asyncHandler(async (req, res) => {
  let imageUrls = [];
  let imagePublicIds = [];
  let uploadedImageData = [];
  
  if (req.files && req.files.length > 0) {
    // Upload images to general products folder first
    uploadedImageData = await uploadService.uploadMultipleProductImages(req.files);
    imageUrls = uploadedImageData.map(img => img.url);
    imagePublicIds = uploadedImageData.map(img => img.public_id);
  }

  const productData = {
    ...req.body,
    benefits: JSON.parse(req.body.benefits || '[]'),
    ingredients: JSON.parse(req.body.ingredients || '[]'),
    tags: JSON.parse(req.body.tags || '[]'),
    status: req.body.status === 'true',
    isCombo: req.body.isCombo === 'true',
    normalPrice: parseFloat(req.body.normalPrice),
    offerPrice: req.body.offerPrice ? parseFloat(req.body.offerPrice) : null,
    stock: parseInt(req.body.stock),
    categoryId: req.body.categoryId,
    images: imageUrls,
    imagePublicIds: imagePublicIds
  };

  const product = await productService.createProduct(productData);
  
  // If product has images and we now have product ID, move images to product-specific folder
  if (uploadedImageData.length > 0 && product.id) {
    await uploadService.organizeProductImages(product.id, uploadedImageData);
    
    // Update product with new image URLs if they were moved
    const updatedImageData = await uploadService.getProductImages(product.id);
    if (updatedImageData.length > 0) {
      const updatedImageUrls = updatedImageData.map(img => img.secure_url);
      const updatedImagePublicIds = updatedImageData.map(img => img.public_id);
      
      await productService.updateProduct(product.id, {
        images: updatedImageUrls,
        imagePublicIds: updatedImagePublicIds
      });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product
  });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search, status } = req.query;
  const products = await productService.getProducts({ 
    page: parseInt(page), 
    limit: parseInt(limit), 
    category, 
    search, 
    status 
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

export const updateProduct = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };
  const productId = req.params.id;
  
  // Handle file uploads - IMPORTANT: Don't override existing images
  if (req.files && req.files.length > 0) {
    // Upload new images to product-specific folder
    const newImageData = await uploadService.uploadMultipleProductImages(req.files, productId);
    const newImageUrls = newImageData.map(img => img.url);
    const newImagePublicIds = newImageData.map(img => img.public_id);
    
    // Get existing product to combine images
    const existingProduct = await productService.getProductById(productId);
    
    // FIX: Check if existingImages field is provided for reordering/deletion
    if (req.body.existingImages) {
      try {
        // If existingImages is provided, use that as the base (for reordering)
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
        // Fallback: combine with existing images from database
        updateData.images = [...(existingProduct.images || []), ...newImageUrls];
        updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
      }
    } else {
      // If no existingImages provided, just add new images to existing ones
      updateData.images = [...(existingProduct.images || []), ...newImageUrls];
      updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
    }
  } else {
    // If no new files, but existingImages is provided for reordering
    if (req.body.existingImages) {
      try {
        const existingImagesFromRequest = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages;
        
        updateData.images = existingImagesFromRequest;
        
        // Reorder public IDs accordingly
        const existingProduct = await productService.getProductById(productId);
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

  // Parse JSON fields if they exist and are strings
  if (req.body.benefits) {
    updateData.benefits = typeof req.body.benefits === 'string' 
      ? JSON.parse(req.body.benefits) 
      : req.body.benefits;
  }
  if (req.body.ingredients) {
    updateData.ingredients = typeof req.body.ingredients === 'string'
      ? JSON.parse(req.body.ingredients)
      : req.body.ingredients;
  }
  if (req.body.tags) {
    updateData.tags = typeof req.body.tags === 'string'
      ? JSON.parse(req.body.tags)
      : req.body.tags;
  }
  
  // Convert boolean fields
  if (req.body.status !== undefined) {
    updateData.status = req.body.status === 'true' || req.body.status === true;
  }
  if (req.body.isCombo !== undefined) {
    updateData.isCombo = req.body.isCombo === 'true' || req.body.isCombo === true;
  }
  
  // Convert number fields
  if (req.body.normalPrice) {
    updateData.normalPrice = parseFloat(req.body.normalPrice);
  }
  if (req.body.offerPrice !== undefined) {
    updateData.offerPrice = req.body.offerPrice ? parseFloat(req.body.offerPrice) : null;
  }
  if (req.body.stock !== undefined) {
    updateData.stock = parseInt(req.body.stock);
  }

  // Clean up the updateData - remove any fields that shouldn't be passed to Prisma
  const fieldsToRemove = ['existingImages', 'createdAt', 'updatedAt', 'orderItems', 'ratings'];
  fieldsToRemove.forEach(field => {
    delete updateData[field];
  });

  const product = await productService.updateProduct(productId, updateData);
  
  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: product
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  
  // First get product to retrieve image data for cleanup
  const product = await productService.getProductById(productId);
  
  // Delete all product images from Cloudinary
  if (product.imagePublicIds && product.imagePublicIds.length > 0) {
    await uploadService.deleteProductImages(productId);
  }
  
  await productService.deleteProduct(productId);
  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});

export const getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await productService.getProductsByCategory(req.params.categoryId);
  res.status(200).json({
    success: true,
    data: products
  });
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
  
  // Upload new images to product-specific folder
  const newImageData = await uploadService.uploadMultipleProductImages(req.files, productId);
  const newImageUrls = newImageData.map(img => img.url);
  const newImagePublicIds = newImageData.map(img => img.public_id);
  
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

export const deleteProductImage = asyncHandler(async (req, res) => {
  const { id, imageIndex } = req.params;
  
  const product = await productService.getProductById(id);
  
  if (!product.images || !product.images[imageIndex]) {
    return res.status(404).json({
      success: false,
      message: 'Image not found'
    });
  }
  
  // Delete from Cloudinary
  if (product.imagePublicIds && product.imagePublicIds[imageIndex]) {
    await uploadService.deleteImage(product.imagePublicIds[imageIndex]);
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