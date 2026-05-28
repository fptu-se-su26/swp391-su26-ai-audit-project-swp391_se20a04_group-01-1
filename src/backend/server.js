require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ============ MIDDLEWARE ============

// ✅ FIX: Định nghĩa middleware TRƯỚC khi dùng
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Thiếu token xác thực!' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token đã hết hạn!' });
            }
            return res.status(403).json({ message: 'Token không hợp lệ!' });
        }

        req.user = user;
        next();
    });
};
// ============ ĐĂNG KÝ ============

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin!' });
        }

        const pool = await poolPromise;

        // 2. Kiểm tra xem email hoặc username đã tồn tại chưa
        const checkExist = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('username', sql.NVarChar, username)
            .query('SELECT user_id FROM Users WHERE email = @email OR username = @username');

        if (checkExist.recordset.length > 0) {
            return res.status(400).json({ message: 'Email hoặc Username đã được sử dụng!' });
        }

        // 3. Mã hóa mật khẩu (Băm password)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Lưu user mới vào Database (Mặc định role là 'user')
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, 'user')
            .query(`INSERT INTO Users (username, email, password_hash, role) 
                    VALUES (@username, @email, @password_hash, @role)`);

        res.status(201).json({ message: 'Tạo tài khoản thành công!' });
    } catch (error) {
        console.error('❌ Lỗi API đăng ký:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});
// ============ ĐĂNG NHẬP ============

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu!' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT user_id, username, email, password_hash, role FROM Users WHERE email = @email');

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        // ✅ So sánh password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        // ✅ Tạo JWT token
        const token = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // ✅ Trả về token + user info
        res.json({
            token,
            role: user.role,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ============ PROTECTED ROUTES ============

// ✅ GET /api/user/profile - Lấy thông tin user
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;

        // ✅ FIX: Đúng tên parameter @user_id
        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT user_id, username, email, role FROM Users WHERE user_id = @user_id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Người dùng không tồn tại!' });
        }

        // ✅ FIX: Trả về đúng format response
        res.json({
            message: 'Lấy dữ liệu thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ✅ PUT /api/user/profile - Cập nhật profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username) {
            return res.status(400).json({ message: 'Vui lòng nhập username!' });
        }

        const pool = await poolPromise;

        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('username', sql.NVarChar, username)
            .query('UPDATE Users SET username = @username WHERE user_id = @user_id');

        res.json({ message: 'Cập nhật profile thành công!' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ============ EVENTS ============

// POST /api/events - Thêm sự kiện (cần protected sau)
app.post('/api/events', async (req, res) => {
    try {
        const { Title, TimeRange, EventDate, Location, Status, IsLive, CrowdLevel, Description } = req.body;

        if (!Title || !EventDate || !Location) {
            return res.status(400).json({ message: 'Thiếu thông tin sự kiện!' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('Title', sql.NVarChar, Title)
            .input('TimeRange', sql.NVarChar, TimeRange || null)
            .input('EventDate', sql.NVarChar, EventDate)
            .input('Location', sql.NVarChar, Location)
            .input('Status', sql.NVarChar, Status || 'pending')
            .input('IsLive', sql.Bit, IsLive || 0)
            .input('CrowdLevel', sql.NVarChar, CrowdLevel || 'low')
            .input('Description', sql.NVarChar, Description || null)
            .query(`INSERT INTO Events (Title, TimeRange, EventDate, Location, Status, IsLive, CrowdLevel, Description) 
                    VALUES (@Title, @TimeRange, @EventDate, @Location, @Status, @IsLive, @CrowdLevel, @Description)`);

        res.status(201).json({ message: 'Lưu sự kiện thành công!' });
    } catch (error) {
        console.error('❌ Lỗi API đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ============ THUẬT TOÁN DIJKSTRA & TÌM ĐƯỜNG ============

// Hàm tính khoảng cách Haversine giữa 2 tọa độ GPS (Đơn vị: Mét)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Bán kính Trái Đất (m)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// API POST /api/navigation/route - Thực hiện tính đường đi tối ưu
app.post('/api/navigation/route', async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng } = req.body;

        if (!startLat || !startLng || !endLat || !endLng) {
            return res.status(400).json({ message: 'Thiếu tọa độ GPS điểm đi hoặc điểm đến!' });
        }

        const pool = await poolPromise;

        // 1. Truy xuất danh sách Nodes và Edges
        const nodesResult = await pool.request().query('SELECT NodeID, Latitude, Longitude FROM Nodes');
        const edgesResult = await pool.request().query('SELECT EdgeID, SourceNodeID, TargetNodeID, Distance, SpeedLimit, Geometry FROM Edges');

        const nodes = nodesResult.recordset;
        const edges = edgesResult.recordset;

        if (nodes.length === 0 || edges.length === 0) {
            return res.status(500).json({ message: 'Dữ liệu bản đồ trống!' });
        }

        // 2. Định danh các Nút gần nhất với tọa độ yêu cầu (Start/End)
        let startNodeId = null, endNodeId = null;
        let minStartDist = Infinity, minEndDist = Infinity;

        nodes.forEach(node => {
            const distToStart = getDistance(startLat, startLng, node.Latitude, node.Longitude);
            if (distToStart < minStartDist) {
                minStartDist = distToStart;
                startNodeId = node.NodeID;
            }

            const distToEnd = getDistance(endLat, endLng, node.Latitude, node.Longitude);
            if (distToEnd < minEndDist) {
                minEndDist = distToEnd;
                endNodeId = node.NodeID;
            }
        });

        // 3. Xây dựng cấu trúc đồ thị vô hướng
        const graph = {};
        nodes.forEach(n => graph[n.NodeID] = {});

        edges.forEach(edge => {
            const u = edge.SourceNodeID;
            const v = edge.TargetNodeID;
            const speedMeterPerSecond = (edge.SpeedLimit * 1000) / 3600;
            const timeSeconds = edge.Distance / speedMeterPerSecond;

            const edgeInfo = {
                distance: edge.Distance,
                time: timeSeconds,
                geometry: JSON.parse(edge.Geometry),
                weight: edge.Distance // Cấu hình trọng số (ở đây là khoảng cách ngắn nhất)
            };

            // Gán 2 chiều (Vô hướng)
            graph[u][v] = edgeInfo;
            graph[v][u] = {
                ...edgeInfo,
                geometry: [...edgeInfo.geometry].reverse() // Đảo đầu tọa độ khi đi ngược lại
            };
        });

        // 4. Giải thuật Dijkstra tìm đường
        const distances = {};
        const previous = {};
        const queue = new Set();

        Object.keys(graph).forEach(node => {
            distances[node] = Infinity;
            previous[node] = null;
            queue.add(node);
        });
        distances[startNodeId] = 0;

        while (queue.size > 0) {
            let minNode = null;
            for (let node of queue) {
                if (minNode === null || distances[node] < distances[minNode]) {
                    minNode = node;
                }
            }

            if (distances[minNode] === Infinity || Number(minNode) === endNodeId) {
                break;
            }

            queue.delete(minNode);

            for (let neighbor in graph[minNode]) {
                const alt = distances[minNode] + graph[minNode][neighbor].weight;
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = minNode;
                }
            }
        }

        // 5. Truy vết ngược kết quả
        const pathNodes = [];
        let curr = endNodeId;
        while (curr !== null) {
            pathNodes.unshift(curr);
            curr = previous[curr];
        }

        if (pathNodes.length <= 1 || distances[endNodeId] === Infinity) {
            return res.status(404).json({ message: 'Không thể tìm thấy tuyến đường khả dụng!' });
        }

        // 6. Tổng hợp hình dáng tọa độ chi tiết và thời gian/khoảng cách
        let routeCoords = [];
        let totalDistance = 0;
        let totalTimeSec = 0;

        for (let i = 0; i < pathNodes.length - 1; i++) {
            const u = pathNodes[i];
            const v = pathNodes[i + 1];
            const edge = graph[u][v];

            totalDistance += edge.distance;
            totalTimeSec += edge.time;

            if (routeCoords.length > 0) {
                routeCoords.push(...edge.geometry.slice(1));
            } else {
                routeCoords.push(...edge.geometry);
            }
        }

        res.json({
            totalDistanceKm: parseFloat((totalDistance / 1000).toFixed(2)),
            totalTimeMin: Math.round(totalTimeSec / 60),
            coordinates: routeCoords
        });

    } catch (error) {
        console.error('Lỗi tính đường:', error);
        res.status(500).json({ message: 'Lỗi Server', error: error.message });
    }
});

// ============ SERVER STARTUP ============

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server backend tại http://localhost:${PORT}`);
    console.log(`✅ Kết nối Database thành công!`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Cổng ${PORT} đang bị sử dụng!`);
    } else {
        console.error('❌ Lỗi Server:', err);
    }
});