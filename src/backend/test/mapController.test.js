jest.mock("../db", () => {
    const query = jest.fn();
    return {
        sql: { Int: "Int" },
        poolPromise: Promise.resolve({
            request: () => ({ input: jest.fn().mockReturnThis(), query })
        })
    };
});

const { getFloodZones, getPois, getPoiCategories } = require("../controllers/mapController");
const { poolPromise } = require("../db");

describe("MAP CONTROLLER", () => {
    let req, res, queryMock;

    beforeEach(async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        req = { query: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const pool = await poolPromise;
        queryMock = pool.request().query;
        jest.clearAllMocks();
    });

    afterEach(() => { jest.restoreAllMocks(); });

    describe("getFloodZones", () => {
        test("Success with all risk branches and invalid JSON", async () => {
            queryMock.mockResolvedValueOnce({
                recordset: [
                    { zone_id: 1, zone_name: "Nguyễn Văn Linh", risk_level: "High", polygon_coordinates: "[16, 108]" },
                    { zone_id: 2, zone_name: "Other High", risk_level: "High", polygon_coordinates: "invalid_json" },
                    { zone_id: 3, zone_name: "Tiên Sơn", risk_level: "Medium", polygon_coordinates: null },
                    { zone_id: 4, zone_name: "Other Medium", risk_level: "Medium", polygon_coordinates: "[[16, 108]]" },
                    { zone_id: 5, zone_name: "Low Risk", risk_level: "Low", polygon_coordinates: "[[16, 108]]" }
                ]
            });
            await getFloodZones(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        test("Error", async () => {
            queryMock.mockRejectedValueOnce(new Error("DB Error"));
            await getFloodZones(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("getPois", () => {
        test("Success without category_id", async () => {
            queryMock.mockResolvedValueOnce({ recordset: [{ poi_id: 1 }] });
            await getPois(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        test("Success with category_id", async () => {
            req.query.category_id = "1";
            queryMock.mockResolvedValueOnce({ recordset: [{ poi_id: 1 }] });
            await getPois(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        test("Error", async () => {
            queryMock.mockRejectedValueOnce(new Error("DB Error"));
            await getPois(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("getPoiCategories", () => {
        test("Success", async () => {
            queryMock.mockResolvedValueOnce({ recordset: [{ id: 1 }] });
            await getPoiCategories(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        test("Error", async () => {
            queryMock.mockRejectedValueOnce(new Error("DB Error"));
            await getPoiCategories(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});