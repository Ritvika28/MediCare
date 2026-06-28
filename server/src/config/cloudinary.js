import { v2 as cloudinary } from 'cloudinary';

export const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
};

/**
 * Extracts Cloudinary public ID from a full Cloudinary secure/insecure URL.
 * Supports standard formats:
 * https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/v<version>/<folder>/<filename>.<ext>
 * @param {string} url - Full Cloudinary URL
 * @returns {string|null} - Public ID (e.g. 'folder/filename') or null
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    let remaining = parts[1];
    // Match version segment v[0-9]+/ or similar
    const versionMatch = remaining.match(/^v\d+\/(.+)$/);
    if (versionMatch) {
      remaining = versionMatch[1];
    }
    
    // Strip file extension
    const dotIndex = remaining.lastIndexOf('.');
    if (dotIndex !== -1) {
      remaining = remaining.substring(0, dotIndex);
    }
    
    return remaining;
  } catch (error) {
    console.error('Failed to parse public ID from Cloudinary URL:', url, error);
    return null;
  }
};

export { cloudinary };

