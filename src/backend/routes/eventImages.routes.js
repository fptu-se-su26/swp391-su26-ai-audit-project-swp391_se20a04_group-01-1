const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/events/:eventId/images - Lấy danh sách ảnh của một sự kiện
router.get('/:eventId/images', async (req, res) => {
    try {
        const { eventId } = req.params;
        const pool = await poolPromise;
        
        const query = `
            SELECT image_id, event_id, image_url, caption, display_order, uploaded_at 
            FROM EventImages 
            WHERE event_id = @event_id 
            ORDER BY display_order ASC, uploaded_at DESC
        `;
        
        const result = await pool.request()
            .input("event_id", sql.Int, eventId)
            .query(query);

        res.json({
            message: "Lấy danh sách ảnh thành công!",
            data: result.recordset,
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách ảnh sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/events/:eventId/images - Upload ảnh mới cho sự kiện
router.post('/:eventId/images', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { eventId } = req.params;
        const { caption } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: "Vui lòng chọn một file ảnh để tải lên!" });
        }

        // Tạo URL cho ảnh (cần domain của server, tạm dùng đường dẫn relative)
        const imageUrl = `/uploads/${req.file.filename}`;
        
        const pool = await poolPromise;
        
        // Kiểm tra xem sự kiện có tồn tại không
        const eventCheck = await pool.request()
            .input("event_id", sql.Int, eventId)
            .query("SELECT event_id FROM Events WHERE event_id = @event_id");
            
        if (eventCheck.recordset.length === 0) {
            // Xóa file vừa upload nếu sự kiện không tồn tại
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
        }
        
        const insertQuery = `
            INSERT INTO EventImages (event_id, image_url, caption, uploaded_at)
            OUTPUT INSERTED.*
            VALUES (@event_id, @image_url, @caption, GETDATE())
        `;
        
        const result = await pool.request()
            .input("event_id", sql.Int, eventId)
            .input("image_url", sql.NVarChar, imageUrl)
            .input("caption", sql.NVarChar, caption || '')
            .query(insertQuery);

        res.status(201).json({
            message: "Tải ảnh lên thành công!",
            data: result.recordset[0],
        });
    } catch (error) {
        console.error("Lỗi upload ảnh sự kiện:", error);
        // Nếu có lỗi, cố gắng xóa file đã upload
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/events/images/:imageId - Xóa ảnh (Chỉ xóa record trong DB)
router.delete('/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const { imageId } = req.params;
        const pool = await poolPromise;
        
        const checkQuery = `SELECT * FROM EventImages WHERE image_id = @image_id`;
        const checkResult = await pool.request()
            .input("image_id", sql.Int, imageId)
            .query(checkQuery);
            
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy ảnh!" });
        }
        
        const deleteQuery = `DELETE FROM EventImages WHERE image_id = @image_id`;
        
        await pool.request()
            .input("image_id", sql.Int, imageId)
            .query(deleteQuery);

        // Lưu ý: Theo yêu cầu, chỉ xóa record trong DB, KHÔNG xóa file ở thư mục uploads/

        res.json({
            message: "Xóa ảnh thành công (đã xóa khỏi hệ thống)!"
        });
    } catch (error) {
        console.error("Lỗi xóa ảnh sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
