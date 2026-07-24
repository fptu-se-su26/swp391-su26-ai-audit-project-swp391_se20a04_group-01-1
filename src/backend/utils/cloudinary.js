const cloudinary = require('cloudinary').v2;

// Configure Cloudinary credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a File Buffer or File Path to Cloudinary
 * Returns the secure HTTPS URL
 */
async function uploadToCloudinary(file, folder = 'dnpulse_uploads') {
    // If no Cloudinary config is provided, return a fallback mock / local URL
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME') {
        console.warn("⚠️ [Cloudinary] CLOUDINARY_CLOUD_NAME chưa được cấu hình trong .env. Trả về link tạm.");
        return null;
    }

    return new Promise((resolve, reject) => {
        // If file is passed as path string
        if (typeof file === 'string') {
            cloudinary.uploader.upload(file, { folder: folder }, (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            });
            return;
        }

        // If file is passed as Buffer (from Multer memory storage)
        if (file && file.buffer) {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: folder, resource_type: 'auto' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(file.buffer);
            return;
        }

        reject(new Error("File không hợp lệ để upload lên Cloudinary!"));
    });
}

/**
 * Delete an image from Cloudinary by URL
 */
async function deleteFromCloudinary(imageUrl) {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
    try {
        const parts = imageUrl.split('/');
        const fileNameWithExt = parts[parts.length - 1];
        const publicId = fileNameWithExt.split('.')[0];
        const folder = parts[parts.length - 2];
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (err) {
        console.error("Lỗi xóa ảnh Cloudinary:", err.message);
    }
}

module.exports = {
    cloudinary,
    uploadToCloudinary,
    deleteFromCloudinary
};
