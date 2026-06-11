import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { cloudinary } from '../config/cloudinary.js';
import { AppError } from '../utils/AppError.js';

export const uploadToCloudinary = (buffer, folder = 'hospital') =>
  new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      reject(new AppError('Cloudinary is not configured', 500));
      return;
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

export const deleteFromCloudinary = async (publicId) => {
  if (publicId && process.env.CLOUDINARY_CLOUD_NAME) {
    await cloudinary.uploader.destroy(publicId);
  }
};

/**
 * Uploads a buffer to Cloudinary or falls back to local file storage.
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename (used for extension and prefix)
 * @param {string} folder - Folder name (e.g. 'prescriptions', 'medical-records')
 * @returns {Promise<string>} - The secure URL or local file path
 */
export const uploadFile = async (buffer, originalName, folder = 'hospital') => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const result = await uploadToCloudinary(buffer, folder);
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed, trying local fallback:', err);
    }
  }

  // Local Storage Fallback
  try {
    const ext = path.extname(originalName) || '';
    const name = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueName = `${name}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    
    const dirPath = path.join(process.cwd(), 'uploads', folder);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const port = process.env.PORT || 5001;
    // We assume backend is on localhost for local dev. In production, Cloudinary is expected.
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
    return `${baseUrl}/uploads/${folder}/${uniqueName}`;
  } catch (err) {
    throw new AppError(`Local file save failed: ${err.message}`, 500);
  }
};
