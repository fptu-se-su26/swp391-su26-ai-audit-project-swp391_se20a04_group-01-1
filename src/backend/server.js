require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { startScheduler } = require("./schedulerService");
const { Server } = require("socket.io");
const { poolPromise } = require("./db"); 
const sql = require("mssql");             

const app = express();
<<<<<<< HEAD
let io;

// Middleware
=======
>>>>>>> 3b28950f445693dcb781126dc60996a80919a7c3
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

<<<<<<< HEAD
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                   // limit each IP to 15 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Bạn đã gửi quá nhiều yêu cầu đến AI. Vui lòng thử lại sau 15 phút.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/register', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Quá nhiều tài khoản được tạo. Thử lại sau 1 giờ.' }
}));
app.use('/api/ai/chat', aiLimiter);

// Middleware chuyển tiếp socket instance vào req để dùng trong API routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/events', require('./routes/eventImages.routes'));
app.use('/api/event-categories', require('./routes/eventCategory.routes'));
app.use('/api/flood-zones', require('./routes/flood.routes'));
app.use('/api/pois', require('./routes/poi.routes'));
app.use('/api/poi-categories', require('./routes/poiCategory.routes'));
app.use('/api/event-roads', require('./routes/eventRoad.routes'));
app.use('/api/traffic-alerts', require('./routes/traffic.routes'));
app.use('/api/saved-routes', require('./routes/savedRoutes.routes'));
app.use('/api/routes', require('./routes/shareRoute.routes'));
app.use('/api/weather', require('./routes/weather.routes'));
app.use('/api/location', require('./routes/liveLocation.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
=======
const globalLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100 });
const adminLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 20 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

app.use("/api", globalLimiter);
app.use("/api/admin", adminLimiter);
app.use("/api/weather/simulate", adminLimiter);
app.use("/api/auth/login", authLimiter);
>>>>>>> 3b28950f445693dcb781126dc60996a80919a7c3

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    startScheduler();
});

<<<<<<< HEAD
server.on("error", (err) => {
    console.error("❌ Server error:", err);
});

// Khởi tạo Socket.io phục vụ Chia sẻ vị trí trực tiếp
const { Server } = require("socket.io");
io = new Server(server, {
=======
const io = new Server(server, {
>>>>>>> 3b28950f445693dcb781126dc60996a80919a7c3
    cors: {
        origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
        credentials: true
    }
});

<<<<<<< HEAD
=======
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/events", require("./routes/events.routes"));
app.use("/api/event-categories", require("./routes/eventCategory.routes"));
app.use("/api/flood-zones", require("./routes/flood.routes"));
app.use("/api/pois", require("./routes/poi.routes"));
app.use("/api/poi-categories", require("./routes/poiCategory.routes"));
app.use("/api/event-roads", require("./routes/eventRoad.routes"));
app.use("/api/traffic-alerts", require("./routes/traffic.routes"));
app.use("/api/saved-routes", require("./routes/savedRoutes.routes"));
app.use("/api/routes", require("./routes/shareRoute.routes"));
app.use("/api/weather", require("./routes/weather.routes"));
app.use("/api/location", require("./routes/liveLocation.routes"));
app.use("/api/ai", require("./routes/ai.routes"));

>>>>>>> 3b28950f445693dcb781126dc60996a80919a7c3
io.on("connection", (socket) => {
    console.log(`🔌 [Socket] Thiết bị kết nối: ${socket.id}`);

    // Sharer tham gia phòng phát GPS
    socket.on("join-session", ({ shareToken }) => {
        socket.join(shareToken);

        console.log(
            `🛰️ [Socket] Người chia sẻ đã tham gia phòng: ${shareToken}`
        );
    });

    socket.on("track-location", ({ shareToken }) => {
        socket.join(shareToken);

        console.log(
            `👀 [Socket] Người theo dõi đã tham gia phòng: ${shareToken}`
        );
    });

    // Cập nhật vị trí thời gian thực
    socket.on(
        "update-location",
        async ({ shareToken, lat, lng, heading }) => {
            // Broadcast cho người theo dõi
            socket
                .to(shareToken)
                .emit("location-updated", {
                    lat,
                    lng,
                    heading
                });

            try {
                const { poolPromise } = require("./db");
                const sql = require("mssql");

                const pool = await poolPromise;

                await pool
                    .request()
                    .input(
                        "share_token",
                        sql.NVarChar(100),
                        shareToken
                    )
                    .input(
                        "current_lat",
                        sql.Decimal(9, 6),
                        lat
                    )
                    .input(
                        "current_lng",
                        sql.Decimal(9, 6),
                        lng
                    )
                    .query(`
                        UPDATE LiveLocationShares
                        SET
                            current_lat = @current_lat,
                            current_lng = @current_lng,
                            updated_at = GETDATE()
                        WHERE
                            share_token = @share_token
                            AND is_active = 1
                    `);
            } catch (err) {
                console.error(
                    "Lỗi lưu tọa độ di chuyển vào DB:",
                    err.message
                );
            }
        }
    );

    socket.on("disconnect", () => {
        console.log(
            `Thiết bị ngắt kết nối: ${socket.id}`
        );
    });
});