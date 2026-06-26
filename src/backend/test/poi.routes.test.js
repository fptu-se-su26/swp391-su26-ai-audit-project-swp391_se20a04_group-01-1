const request = require("supertest");
const express = require("express");

jest.mock("../db", () => require("./testUtils/mockDb").mockDbModule());
jest.mock("../middleware/auth", () => require("./testUtils/mockAuthMiddleware").build());

const { __mockQuery, __requestObj } = require("../db");
const poiRouter = require("../routes/poi.routes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/pois", poiRouter);
    return app;
}

const USER = JSON.stringify({ id: 1, role: "user" });

beforeEach(() => {
    __mockQuery.mockReset();
    __requestObj.input.mockClear();
});

describe("GET /api/pois - Module 3&4 search/filter related", () => {
    const app = buildApp();

    test("TC_069 - tra ve POI ten tieng Viet co dau, khong loi Unicode", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    poi_id: 1,
                    name: "Bảo tàng Đà Nẵng",
                    latitude: 16.071,
                    longitude: 108.224,
                    category_name: "Văn hóa",
                },
            ],
        });

        const res = await request(app).get("/api/pois");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Bảo tàng Đà Nẵng");
    });

    test("TC_073 - filter category_id hop le -> dung parameterized input", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app).get("/api/pois?category_id=1");

        expect(res.status).toBe(200);
        expect(__requestObj.input).toHaveBeenCalledWith("category_id", "Int", 1);
        expect(res.body.data).toEqual([]);
    });

    test("TC_071/TC_053 - DB khong co ket qua -> tra danh sach rong, khong crash", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app).get("/api/pois?category_id=9999");

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });
});

describe("POST /api/pois/:id/favorite - favorite toggle", () => {
    const app = buildApp();

    test("chua dang nhap -> 401", async () => {
        const res = await request(app).post("/api/pois/1/favorite");
        expect(res.status).toBe(401);
    });

    test("TC_059 - id khong hop le tren URL -> 400", async () => {
        const res = await request(app)
            .post("/api/pois/abc/favorite")
            .set("x-test-user", USER);

        expect(res.status).toBe(400);
    });

    test("category/POI id khong ton tai -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app)
            .post("/api/pois/9999/favorite")
            .set("x-test-user", USER);

        expect(res.status).toBe(404);
    });

    test("TC_044-equivalent - POI chua favorite -> luu thanh cong", async () => {
        __mockQuery
            .mockResolvedValueOnce({ recordset: [{ poi_id: 1 }] })
            .mockResolvedValueOnce({ recordset: [] })
            .mockResolvedValueOnce({ rowsAffected: [1] });

        const res = await request(app)
            .post("/api/pois/1/favorite")
            .set("x-test-user", USER);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.isFavorite).toBe(true);
    });

    test("TC_075 - POI da favorite -> xoa khoi danh sach yeu thich", async () => {
        __mockQuery
            .mockResolvedValueOnce({ recordset: [{ poi_id: 1 }] })
            .mockResolvedValueOnce({ recordset: [{ exists: 1 }] })
            .mockResolvedValueOnce({ rowsAffected: [1] });

        const res = await request(app)
            .post("/api/pois/1/favorite")
            .set("x-test-user", USER);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.isFavorite).toBe(false);
    });
});
