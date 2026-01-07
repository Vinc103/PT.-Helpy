// src/middlewares/upload.js - UPDATED VERSION
console.log('Loading upload middleware...');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const UPLOAD_DIR = process.env.UPLOAD_PATH || './uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`Created upload directory: ${UPLOAD_DIR}`);
  } catch (error) {
    console.log(`Failed to create upload directory: ${error.message}`);
  }
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log(`File type rejected: ${file.mimetype}`);
    cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype}`), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  }
});

// Helper functions
const uploadMiddleware = {
  // Single file upload
  single: (fieldName) => {
    return (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          console.log('Upload error:', err.message);
          return res.status(400).json({
            success: false,
            message: err.message || 'Gagal mengupload file.'
          });
        }
        
        if (req.file) {
          console.log(`File uploaded: ${req.file.originalname} -> ${req.file.filename}`);
          req.file.url = `/uploads/${req.file.filename}`;
        }
        
        next();
      });
    };
  },
  
  // Multiple files upload
  array: (fieldName, maxCount = 10) => {
    return (req, res, next) => {
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) {
          console.log('Upload error:', err.message);
          return res.status(400).json({
            success: false,
            message: err.message || 'Gagal mengupload file.'
          });
        }
        
        if (req.files && req.files.length > 0) {
          console.log(`${req.files.length} files uploaded`);
          req.files.forEach(file => {
            file.url = `/uploads/${file.filename}`;
          });
        }
        
        next();
      });
    };
  },
  
  // Multiple fields upload
  fields: (fields) => {
    return (req, res, next) => {
      upload.fields(fields)(req, res, (err) => {
        if (err) {
          console.log('Upload error:', err.message);
          return res.status(400).json({
            success: false,
            message: err.message || 'Gagal mengupload file.'
          });
        }
        
        console.log('Multiple fields uploaded');
        next();
      });
    };
  },
  
  // Delete file helper
  deleteFile: (filename) => {
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filename}`);
        return true;
      } catch (error) {
        console.log(`Failed to delete file ${filename}:`, error.message);
        return false;
      }
    }
    
    console.log(`File not found: ${filename}`);
    return false;
  },
  
  // List files in upload directory
  listFiles: () => {
    try {
      return fs.readdirSync(UPLOAD_DIR).filter(file => {
        return !fs.statSync(path.join(UPLOAD_DIR, file)).isDirectory();
      });
    } catch (error) {
      console.log('Failed to list files:', error.message);
      return [];
    }
  }
};

console.log('Upload middleware loaded');
console.log(`Upload directory: ${path.resolve(UPLOAD_DIR)}`);

module.exports = uploadMiddleware;