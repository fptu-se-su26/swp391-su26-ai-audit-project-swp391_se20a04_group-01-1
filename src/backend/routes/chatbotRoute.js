/**
 * chatbotRoute.js
 */
const express = require('express');
const { chat, clearHistory } = require('../controllers/aiService');
const { poolPromise } = require('../db');

const router = express.Router();

router.post('/', chat);
router.post('/clear', clearHistory);

// ─── DEBUG: GET http://localhost:5001/api/chatbot/debug/pois ───────────────────
// Gọi để kiểm tra categories thực trong DB và test keyword LIKE match
// XÓA sau khi xác nhận data đúng
// ──────────────────────────────────────────────────────────────────────────────
router.get('/debug/pois', async (req, res) => {
    try {
        const pool = await poolPromise;
        const sql  = require('mssql');

        const [total, activeBreakdown, categories, sample] = await Promise.all([
            pool.request().query(`SELECT COUNT(*) AS total FROM POIs`),
            pool.request().query(`SELECT is_active, COUNT(*) AS count FROM POIs GROUP BY is_active`),
            pool.request().query(`SELECT id, name FROM POIsCategories ORDER BY id`),
            pool.request().query(`
                SELECT TOP 10
                    p.poi_id, p.name, p.is_active, p.rating,
                    c.name AS category_name
                FROM POIs p
                LEFT JOIN POIsCategories c ON p.category_id = c.id
                WHERE p.is_active = 1
                ORDER BY p.is_featured DESC, p.rating DESC
            `),
        ]);

        // Test 6 categories chính + cà phê
        const keywordTests = {};
        for (const kw of ['Nhà hàng', 'Khách sạn', 'Điểm tham quan', 'Giải trí', 'Bảo tàng', 'ATM', 'cà phê']) {
            const r = await pool.request()
                .input('kw', sql.NVarChar, `%${kw}%`)
                .query(`
                    SELECT COUNT(*) AS cnt
                    FROM POIs p
                    LEFT JOIN POIsCategories c ON p.category_id = c.id
                    WHERE p.is_active = 1
                      AND (p.name LIKE @kw OR p.description LIKE @kw OR c.name LIKE @kw)
                `);
            keywordTests[kw] = r.recordset[0].cnt;
        }

        res.json({
            total_rows:          total.recordset[0].total,
            is_active_breakdown: activeBreakdown.recordset,
            categories_in_db:    categories.recordset,
            sample_top10_active: sample.recordset,
            // Nếu keyword nào = 0 → intentService map sai hoặc data chưa seed
            keyword_search_test: keywordTests,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;