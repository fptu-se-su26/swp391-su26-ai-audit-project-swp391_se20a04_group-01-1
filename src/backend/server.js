require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require('express-rate-limit');
const { startScheduler } = require('./schedulerService');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // limit each IP to 10 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/register', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Quá nhiều tài khoản được tạo. Thử lại sau 1 giờ.' }
}));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/event-categories', require('./routes/eventCategory.routes'));
app.use('/api/flood-zones', require('./routes/flood.routes'));
app.use('/api/pois', require('./routes/poi.routes'));
app.use('/api/poi-categories', require('./routes/poiCategory.routes'));
app.use('/api/event-roads', require('./routes/eventRoad.routes'));
app.use('/api/traffic-alerts', require('./routes/traffic.routes'));
app.use('/api/saved-routes', require('./routes/savedRoutes.routes'));
app.use('/api/routes', require('./routes/shareRoute.routes'));

// Server startup
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    startScheduler();
}).on("error", (err) => {
    console.error("❌ Server error:", err);
});