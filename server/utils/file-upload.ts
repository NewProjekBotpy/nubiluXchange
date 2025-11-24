import multer from "multer";
import path from "path";
import fs from "fs";

// File upload configuration
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat-files');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Exported functions for testing
export const generateFilename = (req: any, file: any, cb: any) => {
  // Generate unique filename: timestamp_randomstring_extension
  const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
  
  // Extract and validate file extension
  const originalName = file.originalname.toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx', '.zip'];
  const fileExtension = path.extname(originalName);
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid file extension'), '');
  }
  
  // Create safe filename with only the extension from original
  const safeFileName = `${uniqueSuffix}${fileExtension}`;
  cb(null, safeFileName);
};

export const fileDestination = (req: any, file: any, cb: any) => {
  cb(null, uploadDir);
};

// Multer configuration for file uploads
const fileUploadStorage = multer.diskStorage({
  destination: fileDestination,
  filename: generateFilename
});

// File filter for security
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', 'application/x-zip-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'), false);
  }
};

// Image file filter for product uploads
const imageFileFilter = (req: any, file: any, cb: any) => {
  const allowedImageTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
  ];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

export const upload = multer({
  storage: fileUploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

// Memory storage for image uploads (for Cloudinary)
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
    files: 5 // Max 5 files
  },
  fileFilter: imageFileFilter
});

export { uploadDir, fileUploadStorage };