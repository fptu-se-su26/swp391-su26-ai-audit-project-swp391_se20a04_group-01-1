const { sql, poolPromise } = require("../db");

// GET /api/flood-zones (public, chỉ lấy zone đang active)
const getFloodZones = async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                zone_id,
                zone_name,
                district,
                risk_level,
                polygon_coordinates,
                description,
                typical_flood_months,
                is_active,
                last_updated,
                updated_by
            FROM FloodZones
            WHERE is_active = 1
            ORDER BY zone_id ASC
        `);

        const data = result.recordset.map((zone) => {
            let coordinates = null;

            try {
                coordinates = zone.polygon_coordinates
                    ? JSON.parse(zone.polygon_coordinates)
                    : null;
            } catch (error) {
                console.error("Lỗi parse polygon_coordinates:", zone.zone_name);
            }

            let depthCm = 8;
            let level = "low";
            let color = "yellow";
            let radius = 150;

            if (zone.risk_level === "High") {
                depthCm = zone.zone_name.includes("Nguyễn Văn Linh") ? 80 : 55;
                level = "high";
                color = "red";
                radius = 280;
            } else if (zone.risk_level === "Medium") {
                depthCm = zone.zone_name.includes("Tiên Sơn") ? 15 : 25;
                level = "medium";
                color = "orange";
                radius = 220;
            }

            return {
                id: String(zone.zone_id),
                zone_id: zone.zone_id,
                name: zone.zone_name,
                district: zone.district,

                risk_level: zone.risk_level,
                polygon_coordinates: zone.polygon_coordinates,
                description: zone.description,
                typical_flood_months: zone.typical_flood_months,

                center: Array.isArray(coordinates) && typeof coordinates[0] === "number"
                    ? coordinates
                    : null,

                radius,
                depthCm,
                level,
                color,
                depthValue: depthCm / 100,
                depthLevel: level,

                bypassPosition: null,
                bypassOptions: []
            };
        });

        res.json({
            success: true,
            message: "Lấy dữ liệu vùng ngập lụt thành công",
            data
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu FloodZones:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
};

// ============ POIs (Points of Interest) ============

// GET /api/pois
const getPois = async (req, res) => {
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
            WHERE p.is_active = 1
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
};

// GET /api/poi-categories
const getPoiCategories = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(
            "SELECT id, name, icon, color_code, description FROM POIsCategories ORDER BY id"
        );

        res.json({
            message: "Lấy danh sách POI categories thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu POIsCategories:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

module.exports = {
    getFloodZones,
    getPois,
    getPoiCategories
};