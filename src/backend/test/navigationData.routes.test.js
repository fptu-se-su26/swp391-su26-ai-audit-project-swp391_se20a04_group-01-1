const request = require("supertest");
const express = require("express");

jest.mock("../db", () => require("./testUtils/mockDb").mockDbModule());

const { __mockQuery } = require("../db");
const eventRoadRouter = require("../routes/eventRoad.routes");
const floodRouter = require("../routes/flood.routes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/event-roads", eventRoadRouter);
    app.use("/api/flood-zones", floodRouter);
    return app;
}

beforeEach(() => {
    __mockQuery.mockReset();
});

describe("GET /api/flood-zones - flood data used by navigation", () => {
    const app = buildApp();

    test("TC_034-equivalent - flood zone High -> level high, color red, depth computed", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    zone_id: 1,
                    zone_name: "Khu vực Nguyễn Văn Linh",
                    district: "Hải Châu",
                    risk_level: "High",
                    polygon_coordinates: JSON.stringify([16.05, 108.2]),
                    description: "",
                    typical_flood_months: "",
                    is_active: 1,
                    last_updated: new Date("2026-06-25"),
                    updated_by: 99,
                    depth_cm: null,
                },
            ],
        });

        const res = await request(app).get("/api/flood-zones");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0]).toMatchObject({
            level: "high",
            color: "red",
            depthCm: 80,
            center: [16.05, 108.2],
        });
    });

    test("polygon JSON loi -> khong crash, center null", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    zone_id: 2,
                    zone_name: "Vùng ngập lỗi polygon",
                    district: "Sơn Trà",
                    risk_level: "Medium",
                    polygon_coordinates: "{invalid-json",
                    description: "",
                    typical_flood_months: "",
                    is_active: 1,
                    last_updated: new Date("2026-06-25"),
                    updated_by: 99,
                    depth_cm: 45,
                },
            ],
        });

        const res = await request(app).get("/api/flood-zones");

        expect(res.status).toBe(200);
        expect(res.body.data[0].center).toBeNull();
        expect(res.body.data[0].depthCm).toBe(45);
    });
});

describe("Event roads - restricted road data used by rerouting", () => {
    const app = buildApp();

    test("GET /api/event-roads parses geojson/bypass JSON safely", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    road_id: 1,
                    event_id: 2,
                    event_title: "Lễ hội",
                    event_status: "approved",
                    road_name: "Đường Trần Phú",
                    restriction_type: "closed",
                    restriction_start: new Date("2026-06-25T08:00:00Z"),
                    restriction_end: new Date("2026-06-25T12:00:00Z"),
                    polyline_encoded: null,
                    geojson_coords: JSON.stringify([[108.22, 16.06], [108.23, 16.07]]),
                    bypass_coords: JSON.stringify([[108.24, 16.08]]),
                    description: "",
                    created_at: new Date("2026-06-25"),
                    days_of_week: null,
                    start_time_of_day: null,
                    end_time_of_day: null,
                },
            ],
        });

        const res = await request(app).get("/api/event-roads?approved_only=true");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].geojson_coords).toEqual([[108.22, 16.06], [108.23, 16.07]]);
        expect(res.body.data[0].bypass_coords).toEqual([[108.24, 16.08]]);
    });

    test("POST /api/event-roads thieu thong tin bat buoc -> 400", async () => {
        const res = await request(app)
            .post("/api/event-roads")
            .send({ event_id: 1, road_name: "Đường A" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("PUT /api/event-roads/:id khong tim thay road -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ rowsAffected: [0] });

        const res = await request(app)
            .put("/api/event-roads/999")
            .send({
                event_id: 1,
                road_name: "Đường A",
                restriction_type: "closed",
                restriction_start: "2026-06-25T08:00:00Z",
                restriction_end: "2026-06-25T12:00:00Z",
            });

        expect(res.status).toBe(404);
    });
});
