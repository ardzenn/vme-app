const chatUpload = require('../config/chatUpload');
const { v4: uuidv4 } = require('uuid');

/**
 * Handle file upload for chat messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadChatFile = (req, res) => {
  // The actual upload is handled by multer middleware
  // This function just processes the result
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded or file type not allowed' 
      });
    }

    // Get the file details from the uploaded file
    const { originalname, mimetype, size, path, filename } = req.file;
    
    // The Cloudinary URL is available in req.file.path
    const fileUrl = req.file.path;
    
    // Determine file type
    let fileType = 'file';
    if (mimetype.startsWith('image/')) {
      fileType = mimetype.endsWith('gif') ? 'gif' : 'image';
    } else if (mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      fileType = 'audio';
    } else if (mimetype.includes('pdf')) {
      fileType = 'pdf';
    } else if (mimetype.includes('document') || mimetype.includes('word')) {
      fileType = 'doc';
    } else if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
      fileType = 'sheet';
    } else if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) {
      fileType = 'slide';
    }

    // Return the file URL and metadata
    res.status(200).json({
      success: true,
      file: {
        originalName: originalname,
        fileName: filename,
        mimeType: mimetype,
        size: size,
        url: fileUrl,
        type: fileType,
        // Generate a unique ID for the client to reference
        id: uuidv4()
      }
    });
  } catch (error) {
    console.error('Error uploading chat file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware for handling multiple file uploads
const uploadMultipleChatFiles = (req, res, next) => {
  const upload = chatUpload.array('files', 5); // Max 5 files at once
  
  upload(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Error uploading files',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    next();
  });
};

// Handler for multiple file uploads
const handleMultipleFileUpload = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded or file types not allowed' 
      });
    }

    // Process each uploaded file
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: file.path,
      type: file.mimetype.startsWith('image/') ? 
        (file.mimetype.endsWith('gif') ? 'gif' : 'image') : 'file',
      id: uuidv4()
    }));

    res.status(200).json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error processing multiple file uploads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing file uploads',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadChatFile,
  uploadMultipleChatFiles,
  handleMultipleFileUpload,
  chatUploadMiddleware: chatUpload.single('file')
};
