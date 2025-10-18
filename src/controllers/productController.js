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
  
  if (req.files && req.files.length > 0) {
    // Upload new images to product-specific folder
    const newImageData = await uploadService.uploadMultipleProductImages(req.files, productId);
    const newImageUrls = newImageData.map(img => img.url);
    const newImagePublicIds = newImageData.map(img => img.public_id);
    
    // Get existing product to combine images
    const existingProduct = await productService.getProductById(productId);
    
    updateData.images = [...(existingProduct.images || []), ...newImageUrls];
    updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
  }

  // Parse JSON fields if they exist
  if (req.body.benefits) updateData.benefits = JSON.parse(req.body.benefits);
  if (req.body.ingredients) updateData.ingredients = JSON.parse(req.body.ingredients);
  if (req.body.tags) updateData.tags = JSON.parse(req.body.tags);
  
  // Convert boolean fields
  if (req.body.status) updateData.status = req.body.status === 'true';
  if (req.body.isCombo) updateData.isCombo = req.body.isCombo === 'true';
  
  // Convert number fields
  if (req.body.normalPrice) updateData.normalPrice = parseFloat(req.body.normalPrice);
  if (req.body.offerPrice) updateData.offerPrice = parseFloat(req.body.offerPrice);
  if (req.body.stock) updateData.stock = parseInt(req.body.stock);

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