const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MODIFIED: This storage engine now handles both images and videos intelligently.
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Check the file's mimetype to determine if it's a video or image
    if (file.mimetype.startsWith('video')) {
      return {
        folder: 'vme-app-uploads/posts/videos',
        resource_type: 'video',
        // These are the transcoding rules. Cloudinary will create these versions automatically.
        eager: [
          { width: 1920, height: 1080, crop: 'limit', format: 'mp4' }, // 1080p
          { width: 1280, height: 720, crop: 'limit', format: 'mp4' }, // 720p
          { width: 854, height: 480, crop: 'limit', format: 'mp4' },  // 480p
          { width: 640, height: 360, crop: 'limit', format: 'mp4' }   // 360p
        ],
        // This generates a manifest for adaptive bitrate streaming
        eager_async: true,
      };
    } else {
      // It's an image
      return {
        folder: 'vme-app-uploads/posts/images',
        resource_type: 'image',
        allowed_formats: ['jpeg', 'jpg', 'png', 'gif'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }] // Resize large images
      };
    }
  }
});

const upload = multer({ storage: storage });

module.exports = upload;