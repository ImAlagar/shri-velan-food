import prisma from '../config/database.js';
import { productService, uploadService } from '../services/index.js';
import s3UploadService from '../services/s3UploadService.js';
import { asyncHandler } from '../utils/helpers.js';

export const createProduct = asyncHandler(async (req, res) => {
  let imageUrls = [];
  let imagePublicIds = [];
  let uploadedImageData = [];
  
  if (req.files && req.files.length > 0) {
    uploadedImageData = await s3UploadService.uploadMultipleProductImages(req.files);
    imageUrls = uploadedImageData.map(img => img.url);
    imagePublicIds = uploadedImageData.map(img => img.key);
  }

  const parseArrayField = (fieldName) => {
    if (Array.isArray(req.body[fieldName])) {
      return req.body[fieldName];
    } else if (typeof req.body[fieldName] === 'string') {
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
    preparingMethods: parseArrayField('preparingMethods'), // ✅ ADD THIS
    tags: parseArrayField('tags'),
    status: req.body.status === 'true',
    isCombo: req.body.isCombo === 'true',
    isFeatured: req.body.isFeatured === 'true',
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
  
  const existingProduct = await productService.getProductById(productId);
  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const updateData = { ...req.body };
  
  // Handle file uploads (existing code remains same)
  if (req.files && req.files.length > 0) {
    const newImageData = await s3UploadService.uploadMultipleProductImages(req.files, productId);
    const newImageUrls = newImageData.map(img => img.url);
    const newImagePublicIds = newImageData.map(img => img.key);
    
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
        updateData.images = [...(existingProduct.images || []), ...newImageUrls];
        updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
      }
    } else {
      updateData.images = [...(existingProduct.images || []), ...newImageUrls];
      updateData.imagePublicIds = [...(existingProduct.imagePublicIds || []), ...newImagePublicIds];
    }
  } else {
    if (req.body.existingImages) {
      try {
        const existingImagesFromRequest = typeof req.body.existingImages === 'string'
          ? JSON.parse(req.body.existingImages)
          : req.body.existingImages;
        
        updateData.images = existingImagesFromRequest;
        
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

  // ✅ ADD preparingMethods TO ARRAY FIELDS PARSING
  const benefits = parseArrayField('benefits');
  const ingredients = parseArrayField('ingredients');
  const preparingMethods = parseArrayField('preparingMethods');
  const tags = parseArrayField('tags');

  if (benefits) updateData.benefits = benefits;
  if (ingredients) updateData.ingredients = ingredients;
  if (preparingMethods) updateData.preparingMethods = preparingMethods;
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

export const globalSearch = asyncHandler(async (req, res) => {
  const { 
    q: searchQuery, 
    page = 1, 
    limit = 12,
    category,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    sortBy = 'relevance'
  } = req.query;

  if (!searchQuery || searchQuery.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  try {
    const skip = (page - 1) * limit;
    
    // Build search conditions
    const where = {
      status: true,
      OR: [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { tags: { has: searchQuery } },
        { preparingMethods: { has: searchQuery } },
        { 
          category: {
            name: { contains: searchQuery, mode: 'insensitive' }
          }
        }
      ]
    };

    // Apply additional filters
    if (category) {
      where.categoryId = category;
    }

    if (minPrice || maxPrice) {
      where.normalPrice = {};
      if (minPrice) where.normalPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.normalPrice.lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    if (onSale === 'true') {
      where.offerPrice = { not: null };
      where.OR = [
        ...where.OR,
        {
          AND: [
            { offerPrice: { not: null } },
            { offerPrice: { lt: prisma.product.fields.normalPrice } }
          ]
        }
      ];
    }

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    // Build orderBy based on sort option
    let orderBy = {};
    switch (sortBy) {
      case 'price-low':
        orderBy = { normalPrice: 'asc' };
        break;
      case 'price-high':
        orderBy = { normalPrice: 'desc' };
        break;
      case 'rating':
        orderBy = { 
          ratings: {
            _count: 'desc'
          }
        };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'relevance':
      default:
        // For relevance, we'll sort by multiple factors
        orderBy = [
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ];
        break;
    }

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        ratings: {
          where: { isApproved: true },
          select: {
            rating: true,
            id: true
          }
        },
        orderItems: {
          select: {
            quantity: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy
    });

    // Calculate relevance score and enrich products
    const enrichedProducts = products.map(product => {
      const totalRatings = product.ratings.length;
      const averageRating = totalRatings > 0 
        ? product.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
        : 0;
      
      const totalSales = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate relevance score based on search term matches
      let relevanceScore = 0;
      const searchTerm = searchQuery.toLowerCase();
      
      if (product.name.toLowerCase().includes(searchTerm)) relevanceScore += 3;
      if (product.description.toLowerCase().includes(searchTerm)) relevanceScore += 2;
      if (product.tags.some(tag => tag.toLowerCase().includes(searchTerm))) relevanceScore += 2;
      if (product.preparingMethods?.some(method => method.toLowerCase().includes(searchTerm))) relevanceScore += 1;
      if (product.category.name.toLowerCase().includes(searchTerm)) relevanceScore += 1;
      
      return {
        ...product,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalRatings,
        totalSales,
        relevanceScore,
        hasDiscount: product.offerPrice && product.offerPrice < product.normalPrice,
        discountPercentage: product.offerPrice && product.offerPrice < product.normalPrice 
          ? Math.round(((product.normalPrice - product.offerPrice) / product.normalPrice) * 100)
          : 0
      };
    });

    // Sort by relevance if that's the selected sort option
    if (sortBy === 'relevance') {
      enrichedProducts.sort((a, b) => {
        // Featured products first
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        
        // Then by relevance score
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        
        // Then by sales count
        return b.totalSales - a.totalSales;
      });
    }

    // Get search suggestions for related terms - FIXED LINE
    const searchSuggestions = await getSearchSuggestions(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        products: enrichedProducts,
        searchMeta: {
          query: searchQuery,
          totalResults: total,
          hasResults: enrichedProducts.length > 0,
          suggestions: searchSuggestions,
          filtersApplied: {
            category: !!category,
            priceRange: !!(minPrice || maxPrice),
            inStock: inStock === 'true',
            onSale: onSale === 'true'
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          showing: enrichedProducts.length
        }
      }
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: error.message
    });
  }
});

// Helper function for search suggestions
export async function getSearchSuggestions(searchQuery) {
  try {
    // Get popular search terms from products
    const suggestions = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { has: searchQuery } },
          { 
            category: {
              name: { contains: searchQuery, mode: 'insensitive' }
            }
          }
        ],
        status: true
      },
      select: {
        name: true,
        tags: true,
        category: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });

    // Extract unique suggestions
    const uniqueSuggestions = new Set();
    
    suggestions.forEach(product => {
      // Add product name
      if (product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        uniqueSuggestions.add(product.name);
      }
      
      // Add matching tags
      product.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchQuery.toLowerCase())) {
          uniqueSuggestions.add(tag);
        }
      });
      
      // Add category name
      if (product.category.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        uniqueSuggestions.add(product.category.name);
      }
    });

    return Array.from(uniqueSuggestions).slice(0, 5);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}