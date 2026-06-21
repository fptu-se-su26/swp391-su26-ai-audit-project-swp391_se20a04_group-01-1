// backend/test/adminController.test.js
const mockQuery = jest.fn();
const mockInput = jest.fn().mockReturnThis();

// Mock Database đúng chuẩn để không bao giờ bị Crash
jest.mock("../db", () => ({
    sql: {
        Int: "Int",
        Bit: "Bit",
        NVarChar: "NVarChar"
    },
    poolPromise: Promise.resolve({
        request: jest.fn().mockImplementation(() => ({
            input: mockInput,
            query: mockQuery
        }))
    })
}));

const {
    getAllUsers,
    banUser,
    getAdminFloodZones,
    updateFloodZoneStatus,
    getAdminTrafficAlerts,
    toggleTrafficAlert,
    deleteTrafficAlert
} = require("../controllers/adminController");

describe("ADMIN CONTROLLER", () => {
    let req, res;

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        req = { user: { role: 'admin', id: 1 }, body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        
        mockQuery.mockClear();
        mockInput.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ==========================================
    // 1. getAllUsers
    // ==========================================
    describe("getAllUsers", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await getAllUsers(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("Success", async () => {
            mockQuery.mockResolvedValueOnce({ recordset: [] });
            await getAllUsers(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await getAllUsers(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // 2. banUser
    // ==========================================
    describe("banUser", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await banUser(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("400 Invalid ID", async () => {
            req.params.id = "abc";
            await banUser(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        test("404 Not Found", async () => {
            req.params.id = "1";
            mockQuery.mockResolvedValueOnce({ rowsAffected: [0] });
            await banUser(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        test("Success", async () => {
            req.params.id = "1";
            req.body.ban_reason = "Spam";
            mockQuery.mockResolvedValueOnce({ rowsAffected: [1] });
            await banUser(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            req.params.id = "1";
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await banUser(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // 3. getAdminFloodZones
    // ==========================================
    describe("getAdminFloodZones", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await getAdminFloodZones(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("Success with all branches", async () => {
            mockQuery.mockResolvedValueOnce({
                recordset: [
                    { zone_id: 1, zone_name: "Nguyễn Văn Linh", risk_level: "High", polygon_coordinates: "[16, 108]", last_updated: new Date() },
                    { zone_id: 2, zone_name: "Other High", risk_level: "High", polygon_coordinates: "invalid_json", last_updated: null },
                    { zone_id: 3, zone_name: "Tiên Sơn", risk_level: "Medium", polygon_coordinates: null },
                    { zone_id: 4, zone_name: "Other Medium", risk_level: "Medium", polygon_coordinates: "[[16, 108]]" },
                    { zone_id: 5, zone_name: "Low Risk", risk_level: "Low", polygon_coordinates: "[[16, 108]]" }
                ]
            });
            await getAdminFloodZones(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await getAdminFloodZones(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // 4. updateFloodZoneStatus
    // ==========================================
    describe("updateFloodZoneStatus", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await updateFloodZoneStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("400 Invalid ID", async () => {
            req.params.id = "abc";
            await updateFloodZoneStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        test("400 Missing is_active", async () => {
            req.params.id = "1";
            await updateFloodZoneStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        test("Success true", async () => {
            req.params.id = "1";
            req.body.is_active = true;
            mockQuery.mockResolvedValueOnce({});
            await updateFloodZoneStatus(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Success false", async () => {
            req.params.id = "1";
            req.body.is_active = false;
            mockQuery.mockResolvedValueOnce({});
            await updateFloodZoneStatus(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            req.params.id = "1";
            req.body.is_active = true;
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await updateFloodZoneStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // 5. getAdminTrafficAlerts
    // ==========================================
    describe("getAdminTrafficAlerts", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await getAdminTrafficAlerts(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("Success", async () => {
            mockQuery.mockResolvedValueOnce({ recordset: [{ alert_id: 1, latitude: 16, longitude: 108, is_active: 1 }] });
            await getAdminTrafficAlerts(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await getAdminTrafficAlerts(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // 6. toggleTrafficAlert
    // ==========================================
    describe("toggleTrafficAlert", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await toggleTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("400 Missing is_active", async () => {
            req.params.id = "1";
            await toggleTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        test("404 Not Found", async () => {
            req.params.id = "1";
            req.body.is_active = true;
            mockQuery.mockResolvedValueOnce({ rowsAffected: [0] });
            await toggleTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        test("Success", async () => {
            req.params.id = "1";
            req.body.is_active = false;
            mockQuery.mockResolvedValueOnce({ rowsAffected: [1] });
            await toggleTrafficAlert(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            req.params.id = "1";
            req.body.is_active = true;
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await toggleTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // 7. deleteTrafficAlert
    // ==========================================
    describe("deleteTrafficAlert", () => {
        test("403 Not Admin", async () => {
            req.user.role = 'user';
            await deleteTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        test("404 Not Found", async () => {
            req.params.id = "1";
            mockQuery.mockResolvedValueOnce({ rowsAffected: [0] });
            await deleteTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        test("Success", async () => {
            req.params.id = "1";
            mockQuery.mockResolvedValueOnce({ rowsAffected: [1] });
            await deleteTrafficAlert(req, res);
            expect(res.json).toHaveBeenCalled();
        });
        test("Error", async () => {
            req.params.id = "1";
            mockQuery.mockRejectedValueOnce(new Error("DB Error"));
            await deleteTrafficAlert(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});