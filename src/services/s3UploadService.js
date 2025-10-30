import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../config/s3.js';
import { v4 as uuidv4 } from 'uuid';

class S3UploadService {
  constructor() {
    this.s3Client = s3Client;
    this.bucketName = S3_BUCKET_NAME;
  }

  async uploadImage(buffer, folderName = 'velanstore', fileName = null) {
    try {
      // If fileName is provided, use it as the full key
      // If not, generate key with folderName and random filename
      const key = fileName ? fileName : `${folderName}/${uuidv4()}-${Date.now()}.jpg`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg'
      });

      await this.s3Client.send(command);

      // Generate public URL
      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return {
        url,
        key,
        folder: folderName
      };
    } catch (error) {
      console.error('S3 upload failed:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Specific methods for different entity types
  async uploadCategoryImage(buffer) {
    const fileName = `velanstore/categories/${uuidv4()}-${Date.now()}.jpg`;
    return await this.uploadImage(buffer, 'velanstore/categories', fileName);
  }

  async uploadProductImage(buffer, productId = null) {
    const folderPath = productId ? 
      `velanstore/products/${productId}` : 
      'velanstore/products/general';
    
    // Include the full folder path in the fileName
    const fileName = `${folderPath}/${uuidv4()}-${Date.now()}.jpg`;
    return await this.uploadImage(buffer, folderPath, fileName);
  }

  async uploadUserImage(buffer) {
    const fileName = `velanstore/users/${uuidv4()}-${Date.now()}.jpg`;
    return await this.uploadImage(buffer, 'velanstore/users', fileName);
  }

  async uploadBannerImage(buffer) {
    const fileName = `velanstore/banners/${uuidv4()}-${Date.now()}.jpg`;
    return await this.uploadImage(buffer, 'velanstore/banners', fileName);
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

  async deleteImage(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete failed:', error);
      throw new Error('Image deletion failed');
    }
  }

  async deleteMultipleImages(keys) {
    try {
      if (keys.length === 0) return;

      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key }))
        }
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 multiple delete failed:', error);
      throw new Error('Images deletion failed');
    }
  }

  async getFolderImages(folderPath = 'velanstore') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folderPath,
        MaxKeys: 100
      });

      const result = await this.s3Client.send(command);
      return result.Contents?.map(item => ({
        key: item.Key,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
        lastModified: item.LastModified,
        size: item.Size
      })) || [];
    } catch (error) {
      console.error('S3 folder list failed:', error);
      throw new Error('Failed to fetch folder images');
    }
  }

  async getProductImages(productId) {
    try {
      const prefix = `velanstore/products/${productId}`;
      return await this.getFolderImages(prefix);
    } catch (error) {
      console.error('Product images fetch failed:', error);
      return [];
    }
  }

  async deleteProductImages(productId) {
    try {
      const prefix = `velanstore/products/${productId}`;
      const images = await this.getFolderImages(prefix);
      
      if (images.length > 0) {
        await this.deleteMultipleImages(images.map(img => img.key));
      }
      
      return { deleted: images.length };
    } catch (error) {
      console.error('Product images deletion failed:', error);
      throw new Error('Failed to delete product images');
    }
  }

  async organizeProductImages(productId, imageData) {
    try {
      // For S3, we don't need to move files like Cloudinary
      // Images are already uploaded to correct location
      console.log(`Images organized for product ${productId}`);
    } catch (error) {
      console.error('Image organization failed:', error);
      // Don't throw error as this is non-critical
    }
  }
}

export default new S3UploadService();