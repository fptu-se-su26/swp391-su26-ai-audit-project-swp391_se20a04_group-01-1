const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure local uploads directory exists as fallback
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage for streaming directly to Cloudinary
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file định dạng ảnh (JPG, PNG, GIF, WEBP)'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for cloud uploads
    },
    fileFilter: fileFilter
});

module.exports = upload;
