const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Log Cloudinary configuration status
console.log('Cloudinary Config Status:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '***' : 'MISSING',
  api_key: process.env.CLOUDINARY_API_KEY ? '***' : 'MISSING',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'MISSING',
  node_env: process.env.NODE_ENV || 'development'
});

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Missing required Cloudinary environment variables. File uploads will fail.');
} else {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: process.env.NODE_ENV === 'production'
    });
    console.log('✅ Cloudinary configured successfully');
  } catch (error) {
    console.error('❌ Failed to configure Cloudinary:', error.message);
  }
}

// Storage configuration for chat uploads
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Create a folder structure: vme-app-uploads/chat/{conversationId}/{fileType}
    const conversationId = req.params.conversationId || 'general';
    const fileType = file.mimetype.startsWith('image') ? 'images' : 'files';
    
    const params = {
      folder: `vme-app-uploads/chat/${conversationId}/${fileType}`,
      resource_type: 'auto', // Automatically detect the resource type
      allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
      max_file_size: 10 * 1024 * 1024, // 10MB max file size
      use_filename: true,
      unique_filename: true,
      overwrite: false
    };

    // Add format conversion for documents to ensure web compatibility
    if (file.mimetype.includes('document') || file.mimetype.includes('spreadsheet') || file.mimetype.includes('presentation')) {
      params.format = 'pdf';
      params.resource_type = 'raw';
    }

    return params;
  }
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'), false);
  }
};

// Configure multer with the storage and file filter
const chatUpload = multer({
  storage: chatStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

module.exports = chatUpload;
