const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');

async function processUploadedImage(file, folder = "dnpulse_pois") {
    if (!file) return null;
    try {
        const cloudUrl = await uploadToCloudinary(file, folder);
        if (cloudUrl) return cloudUrl;
    } catch (err) {
        console.warn("⚠️ Cloudinary upload không thành công, lưu vào đĩa cục bộ:", err.message);
    }

    const ext = path.extname(file.originalname || "") || ".jpg";
    const filename = `poi-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/${filename}`;
}

// GET /api/pois - Lấy danh sách tất cả POIs (có thể lọc theo category)
router.get("/", async (req, res) => {
    try {
        const { category_id } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT 
                p.poi_id,
                p.name,
                p.latitude,
                p.longitude,
                p.address,
                p.description,
                p.image_url,
                p.website_url,
                p.phone_number,
                p.rating,
                p.is_featured,
                p.is_active,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color_code AS category_color
            FROM POIs p
            LEFT JOIN POIsCategories c ON p.category_id = c.id
            WHERE p.is_active = 1 AND p.status = 'approved'
        `;

        const request = pool.request();

        if (category_id) {
            query += ` AND p.category_id = @category_id`;
            request.input("category_id", sql.Int, parseInt(category_id));
        }

        query += ` ORDER BY p.is_featured DESC, p.rating DESC`;

        const result = await request.query(query);

        res.json({
            message: "Lấy danh sách POI thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu POIs:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// GET /api/pois/my-pois - Lấy danh sách POI do người dùng hiện tại đóng góp
router.get("/my-pois", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const query = `
            SELECT 
                p.poi_id,
                p.name,
                p.latitude,
                p.longitude,
                p.address,
                p.description,
                p.image_url,
                p.status,
                p.is_active,
                c.name AS category_name
            FROM POIs p
            LEFT JOIN POIsCategories c ON p.category_id = c.id
            WHERE p.created_by = @user_id AND p.is_active = 1
            ORDER BY p.poi_id DESC
        `;

        const request = pool.request();
        request.input("user_id", sql.Int, req.user.id);
        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách POI cá nhân:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/pois - Người dùng đóng góp địa điểm mới
router.post("/", authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { category_id, name, latitude, longitude, address, description, website_url, phone_number } = req.body;
        
        let image_url = null;
        if (req.file) {
            image_url = await processUploadedImage(req.file, "dnpulse_pois");
        }
        
        if (!category_id || !name || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc (category_id, name, latitude, longitude)." });
        }

        const isUserAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'system_admin');
        const initialStatus = isUserAdmin ? 'approved' : 'pending';
        const initialActive = isUserAdmin ? 1 : 0;

        const pool = await poolPromise;
        const request = pool.request();
        
        const query = `
            INSERT INTO POIs (
                created_by, category_id, name, latitude, longitude, 
                address, description, image_url, website_url, phone_number,
                status, is_active
            ) VALUES (
                @created_by, @category_id, @name, @latitude, @longitude,
                @address, @description, @image_url, @website_url, @phone_number,
                @status, @is_active
            )
        `;

        request.input("created_by", sql.Int, req.user.id);
        request.input("category_id", sql.Int, category_id);
        request.input("name", sql.NVarChar(150), name);
        request.input("latitude", sql.Decimal(9,6), latitude);
        request.input("longitude", sql.Decimal(9,6), longitude);
        request.input("address", sql.NVarChar(255), address || null);
        request.input("description", sql.NVarChar(sql.MAX), description || null);
        request.input("image_url", sql.NVarChar(255), image_url || null);
        request.input("website_url", sql.NVarChar(255), website_url || null);
        request.input("phone_number", sql.NVarChar(20), phone_number || null);
        request.input("status", sql.NVarChar(20), initialStatus);
        request.input("is_active", sql.Bit, initialActive);

        await request.query(query);

        res.status(201).json({
            success: true,
            message: "Đóng góp địa điểm thành công! Chờ quản trị viên duyệt."
        });
    } catch (error) {
        console.error("Lỗi thêm POI:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi thêm POI", error: error.message });
    }
});

// PUT /api/pois/:id - Sửa địa điểm do người dùng đóng góp
router.put("/:id", authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const poi_id = parseInt(req.params.id);
        const { category_id, name, latitude, longitude, address, description, website_url, phone_number } = req.body;

        if (isNaN(poi_id)) return res.status(400).json({ success: false, message: "ID địa điểm không hợp lệ!" });

        const pool = await poolPromise;
        const request = pool.request();
        request.input("poi_id", sql.Int, poi_id);

        // Kiểm tra xem POI có tồn tại và thuộc về user này không
        const checkQuery = `SELECT created_by, image_url FROM POIs WHERE poi_id = @poi_id AND is_active = 1`;
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Địa điểm không tồn tại hoặc đã bị xóa." });
        }
        
        // Bỏ qua kiểm tra created_by nếu user là admin, nhưng ở đây chỉ cho phép chủ sở hữu sửa
        if (checkResult.recordset[0].created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Bạn không có quyền sửa địa điểm này." });
        }

        let image_url = checkResult.recordset[0].image_url;
        if (req.file) {
            image_url = await processUploadedImage(req.file, "dnpulse_pois");
        }

        const updateQuery = `
            UPDATE POIs SET
                category_id = @category_id,
                name = @name,
                latitude = @latitude,
                longitude = @longitude,
                address = @address,
                description = @description,
                image_url = @image_url,
                website_url = @website_url,
                phone_number = @phone_number,
                status = 'pending'
            WHERE poi_id = @poi_id
        `;

        request.input("category_id", sql.Int, category_id);
        request.input("name", sql.NVarChar(150), name);
        request.input("latitude", sql.Decimal(9,6), latitude);
        request.input("longitude", sql.Decimal(9,6), longitude);
        request.input("address", sql.NVarChar(255), address || null);
        request.input("description", sql.NVarChar(sql.MAX), description || null);
        request.input("image_url", sql.NVarChar(255), image_url);
        request.input("website_url", sql.NVarChar(255), website_url || null);
        request.input("phone_number", sql.NVarChar(20), phone_number || null);

        await request.query(updateQuery);

        res.json({ success: true, message: "Cập nhật địa điểm thành công! Chờ duyệt lại." });
    } catch (error) {
        console.error("Lỗi sửa POI:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi sửa POI", error: error.message });
    }
});

// DELETE /api/pois/:id - Xóa địa điểm do người dùng đóng góp
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const poi_id = parseInt(req.params.id);
        if (isNaN(poi_id)) return res.status(400).json({ success: false, message: "ID địa điểm không hợp lệ!" });

        const pool = await poolPromise;
        const request = pool.request();
        request.input("poi_id", sql.Int, poi_id);

        const checkQuery = `SELECT created_by FROM POIs WHERE poi_id = @poi_id AND is_active = 1`;
        const checkResult = await request.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Địa điểm không tồn tại hoặc đã bị xóa." });
        }
        
        if (checkResult.recordset[0].created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa địa điểm này." });
        }

        const deleteQuery = `UPDATE POIs SET is_active = 0 WHERE poi_id = @poi_id`;
        await request.query(deleteQuery);

        res.json({ success: true, message: "Xóa địa điểm thành công." });
    } catch (error) {
        console.error("Lỗi xóa POI:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi xóa POI", error: error.message });
    }
});

// POST /api/pois/:id/favorite - Toggle favorite status
router.post("/:id/favorite", authenticateToken, async (req, res) => {
    try {
        const poi_id = parseInt(req.params.id);
        if (isNaN(poi_id)) {
            return res.status(400).json({ success: false, message: "ID địa điểm không hợp lệ!" });
        }

        const pool = await poolPromise;
        
        // Check if POI exists
        const poiCheck = await pool.request()
            .input("poi_id", sql.Int, poi_id)
            .query("SELECT poi_id FROM POIs WHERE poi_id = @poi_id AND is_active = 1");
            
        if (poiCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Địa điểm không tồn tại hoặc không hoạt động!" });
        }

        // Check if already favorited
        const favCheck = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("poi_id", sql.Int, poi_id)
            .query("SELECT 1 FROM UserFavoritePOIs WHERE user_id = @user_id AND poi_id = @poi_id");

        let isFavorite = false;
        if (favCheck.recordset.length > 0) {
            // Unfavorite
            await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .input("poi_id", sql.Int, poi_id)
                .query("DELETE FROM UserFavoritePOIs WHERE user_id = @user_id AND poi_id = @poi_id");
            isFavorite = false;
        } else {
            // Favorite
            await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .input("poi_id", sql.Int, poi_id)
                .query("INSERT INTO UserFavoritePOIs (user_id, poi_id, saved_at) VALUES (@user_id, @poi_id, GETDATE())");
            isFavorite = true;
        }

        res.json({
            success: true,
            message: isFavorite ? "Lưu địa điểm thành công!" : "Bỏ lưu địa điểm thành công!",
            isFavorite
        });
    } catch (error) {
        console.error("❌ Lỗi toggle yêu thích địa điểm:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật yêu thích", error: error.message });
    }
});

module.exports = router;
