require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");
const mapRoutes = require("./routes/mapRoutes");
const savedRoutesRoutes = require("./routes/savedRoutesRoutes");
const userController = require("./controllers/userController");

const app = express();

// Cấu hình CORS cho phép Frontend ở cổng 5173 truy cập
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));

app.use(express.json());

// ============ ROUTES ============
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", eventRoutes);          // /api/events, /api/event-categories, /api/event-roads, /api/traffic-alerts
app.use("/api", mapRoutes);            // /api/flood-zones, /api/pois, /api/poi-categories
app.use("/api/saved-routes", savedRoutesRoutes);

// Route public riêng lẻ, không thuộc nhóm prefix nào ở trên
app.get("/api/routes/share/:token", userController.getSharedRoute);

// ============ SERVER STARTUP ============

const PORT = process.env.PORT || 5001;

// CHỈ CHẠY KHI KHÔNG PHẢI ĐANG TEST
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Server backend tại http://localhost:${PORT}`);
        console.log(`✅ Kết nối Database thành công!`);
    });
}

module.exports = app;