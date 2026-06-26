const request = require("supertest");
const express = require("express");

jest.mock("../db", () => require("./testUtils/mockDb").mockDbModule());
jest.mock("../middleware/auth", () => require("./testUtils/mockAuthMiddleware").build());

const { __mockQuery } = require("../db");
const savedRoutesRouter = require("../routes/savedRoutes.routes");
const shareRouteRouter = require("../routes/shareRoute.routes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/saved-routes", savedRoutesRouter);
    app.use("/api/routes", shareRouteRouter);
    return app;
}

const USER = JSON.stringify({ id: 1, role: "user" });

const validRoutePayload = {
    origin_name: "Cầu Rồng",
    origin_lat: 16.061,
    origin_lng: 108.227,
    destination_name: "Bệnh viện Đà Nẵng",
    destination_lat: 16.067,
    destination_lng: 108.214,
    route_name: "Tuyến an toàn",
    route_data: JSON.stringify({ geometry: [[108.227, 16.061], [108.214, 16.067]] }),
    distance_meters: 1800,
    duration_seconds: 420,
    profile: "driving",
};

beforeEach(() => {
    __mockQuery.mockReset();
});

describe("Saved routes - Module 5 navigation persistence", () => {
    const app = buildApp();

    test("chua dang nhap khi luu route -> 401", async () => {
        const res = await request(app).post("/api/saved-routes").send(validRoutePayload);
        expect(res.status).toBe(401);
    });

    test("TC_076-equivalent - thieu toa do/route_data -> 400", async () => {
        const res = await request(app)
            .post("/api/saved-routes")
            .set("x-test-user", USER)
            .send({ origin_lat: 16.061, origin_lng: 108.227 });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("TC_033-equivalent - luu route hop le -> 201", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [{ route_id: 10, ...validRoutePayload }],
        });

        const res = await request(app)
            .post("/api/saved-routes")
            .set("x-test-user", USER)
            .send(validRoutePayload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.route.route_id).toBe(10);
    });

    test("lay danh sach route rong -> 200 voi mang rong", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app)
            .get("/api/saved-routes")
            .set("x-test-user", USER);

        expect(res.status).toBe(200);
        expect(res.body.routes).toEqual([]);
    });

    test("route khong thuoc user hien tai -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app)
            .get("/api/saved-routes/999")
            .set("x-test-user", USER);

        expect(res.status).toBe(404);
    });

    test("xoa route da luu thanh cong -> 200", async () => {
        __mockQuery.mockResolvedValueOnce({ rowsAffected: [1] });

        const res = await request(app)
            .delete("/api/saved-routes/10")
            .set("x-test-user", USER);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("xoa route khong ton tai -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ rowsAffected: [0] });

        const res = await request(app)
            .delete("/api/saved-routes/999")
            .set("x-test-user", USER);

        expect(res.status).toBe(404);
    });
});

describe("Shared route public link", () => {
    const app = buildApp();

    test("tao share token cho route da luu -> 200", async () => {
        __mockQuery.mockResolvedValueOnce({
            rowsAffected: [1],
            recordset: [{ share_token: "abc123" }],
        });

        const res = await request(app)
            .post("/api/saved-routes/10/share")
            .set("x-test-user", USER);

        expect(res.status).toBe(200);
        expect(res.body.share_token).toBe("abc123");
    });

    test("link share khong hop le -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app).get("/api/routes/share/missing-token");

        expect(res.status).toBe(404);
    });
});
