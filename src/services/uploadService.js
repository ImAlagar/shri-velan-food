import cloudinary from '../config/cloudinary.js';

class UploadService {
  async uploadImage(buffer, folderName = 'velanstore') {
    try {
      // Convert buffer to base64 string
      const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;
      
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: folderName,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true
      });
      return {
        url: result.secure_url,
        public_id: result.public_id,
        folder: result.folder
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Specific methods for different entity types
  async uploadCategoryImage(buffer) {
    return await this.uploadImage(buffer, 'velanstore/categories');
  }

  async uploadProductImage(buffer) {
    return await this.uploadImage(buffer, 'velanstore/products');
  }

  async uploadUserImage(buffer) {
    return await this.uploadImage(buffer, 'velanstore/users');
  }

  async uploadBannerImage(buffer) {
    return await this.uploadImage(buffer, 'velanstore/banners');
  }

  async uploadMultipleImages(files, folderName = 'velanstore') {
    try {
      const uploadPromises = files.map(file => 
        this.uploadImage(file.buffer, folderName)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple upload failed:', error);
      throw new Error('Image upload failed');
    }
  }

  async deleteImage(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error('Image deletion failed');
    }
  }

  // Get images by folder
  async getFolderImages(folderPath = 'velanstore') {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 100
      });
      return result.resources;
    } catch (error) {
      console.error('Folder fetch failed:', error);
      throw new Error('Failed to fetch folder images');
    }
  }

  // Create subfolder
  async createFolder(folderPath) {
    try {
      // Cloudinary automatically creates folders when you upload to them
      // This is just a utility method to verify folder exists
      const result = await cloudinary.api.root_folders();
      return result;
    } catch (error) {
      console.error('Folder creation failed:', error);
      throw new Error('Folder operation failed');
    }
  }

  async uploadProductImage(buffer, productId = null) {
    try {
      const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;
      const folderPath = productId ? 
        `velanstore/products/${productId}` : 
        'velanstore/products/general';
      
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: folderPath,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });
      
      return {
        url: result.secure_url,
        public_id: result.public_id,
        folder: result.folder
      };
    } catch (error) {
      console.error('Product image upload failed:', error);
      throw new Error(`Product image upload failed: ${error.message}`);
    }
  }

  async uploadMultipleProductImages(files, productId = null) {
    try {
      const uploadPromises = files.map(file => 
        this.uploadProductImage(file.buffer, productId)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple product images upload failed:', error);
      throw new Error('Product images upload failed');
    }
  }

  async organizeProductImages(productId, imageData) {
    try {
      for (const image of imageData) {
        if (image.folder === 'velanstore/products/general') {
          // Extract filename from public_id
          const filename = image.public_id.split('/').pop();
          const newPublicId = `velanstore/products/${productId}/${filename}`;
          
          // Move image to product folder
          await cloudinary.uploader.rename(image.public_id, newPublicId);
        }
      }
    } catch (error) {
      console.error('Image organization failed:', error);
      // Don't throw error as this is non-critical
    }
  }

  async getProductImages(productId) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `velanstore/products/${productId}`,
        max_results: 50
      });
      return result.resources;
    } catch (error) {
      console.error('Product images fetch failed:', error);
      return [];
    }
  }

  async deleteProductImages(productId) {
    try {
      const result = await cloudinary.api.delete_resources_by_prefix(
        `velanstore/products/${productId}`
      );
      return result;
    } catch (error) {
      console.error('Product images deletion failed:', error);
      throw new Error('Failed to delete product images');
    }
  }

  async deleteImage(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error('Image deletion failed');
    }
  }
}

export default new UploadService();