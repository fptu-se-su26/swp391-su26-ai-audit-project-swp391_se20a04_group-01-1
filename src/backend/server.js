require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const sql = require("mssql");

const { startScheduler } = require("./schedulerService");
const {
  startTrafficAlertScheduler,
} = require("./scheduler/trafficAlertScheduler");
const { poolPromise } = require("./db");
const {
  syncDanangEventsAutomatically,
} = require("./services/autoSyncEventsService");

const app = express();
const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  req.io = io;
  next();
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

app.use("/api", globalLimiter);
app.use("/api/admin", adminLimiter);
app.use("/api/weather/simulate", adminLimiter);
app.use("/api/auth/login", authLimiter);

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/events", require("./routes/events.routes"));
app.use("/api/favorite-locations", require("./routes/favoriteLocation.routes"));
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

io.on("connection", (socket) => {
  console.log(`🔌 [Socket] Thiết bị kết nối: ${socket.id}`);

  socket.on("join-session", ({ shareToken }) => {
    socket.join(shareToken);
  });

  socket.on("track-location", ({ shareToken }) => {
    socket.join(shareToken);
  });

  socket.on("update-location", async ({ shareToken, lat, lng, heading }) => {
    socket.to(shareToken).emit("location-updated", {
      lat,
      lng,
      heading,
    });

    try {
      const pool = await poolPromise;

      await pool
        .request()
        .input("share_token", sql.NVarChar(100), shareToken)
        .input("current_lat", sql.Decimal(9, 6), lat)
        .input("current_lng", sql.Decimal(9, 6), lng).query(`
          UPDATE LiveLocationShares
          SET
            current_lat = @current_lat,
            current_lng = @current_lng,
            updated_at = GETDATE()
          WHERE
            share_token = @share_token
            AND is_active = 1
        `);
    } catch (error) {
      console.error("Lỗi lưu tọa độ di chuyển vào DB:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Thiết bị ngắt kết nối: ${socket.id}`);
  });
});

server.listen(PORT, async () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);

  startScheduler();
  startTrafficAlertScheduler();

  try {
    console.log("⏳ Đang thực hiện quét tự động sự kiện khởi đầu...");
    await syncDanangEventsAutomatically();
  } catch (error) {
    console.error("Lỗi cào sự kiện tự động lúc khởi động:", error.message);
  }
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} đang được sử dụng.`);
  } else {
    console.error("❌ Lỗi HTTP server:", error);
  }
});
