// backend/test/userController.test.js

jest.mock("../db", () => ({
  sql: {
    Int: "Int",
    Bit: "Bit",
    NVarChar: () => "NVarChar",
    Decimal: () => "Decimal",
    MAX: "MAX",
  },
  poolPromise: Promise.resolve({
    request: jest.fn(),
  }),
}));

jest.mock("../utils/helpers", () => ({
  formatDateTime: jest.fn(() => "formatted-date"),
}));

jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({ toString: jest.fn(() => "mock-token") })),
}));

const { poolPromise } = require("../db");

const {
  getProfile,
  updateProfile,
  updateProfileV2,
  getFavoriteEvents,
  createSavedRoute,
  getSavedRoutes,
  getSavedRouteById,
  deleteSavedRoute,
  shareSavedRoute,
  shareDirectRoute,
  getSharedRoute,
} = require("../controllers/userController");

describe("User Controller", () => {
  let req;
  let res;
  let requestMock;

  beforeEach(async () => {
    // Ẩn console.error và console.log để terminal gọn gàng khi test lỗi 500
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    req = {
      user: {
        id: 1,
      },
      body: {},
      params: {},
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    requestMock = {
      input: jest.fn().mockReturnThis(),
      query: jest.fn(),
    };

    const pool = await poolPromise;
    pool.request = jest.fn(() => requestMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getProfile", () => {
    test("404 user not found", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [],
      });

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("success", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [
          {
            user_id: 1,
            username: "admin",
            email: "admin@test.com",
            role: "admin",
            created_at: new Date(),
            last_login_at: null,
            password_hash: "hash",
          },
        ],
      });

      await getProfile(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("db error", async () => {
      requestMock.query.mockRejectedValue(new Error("DB"));
      await getProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateProfile", () => {
    test("empty username", async () => {
      req.body.username = "";

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("success", async () => {
      req.body.username = "newuser";

      requestMock.query.mockResolvedValue({});

      await updateProfile(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("db error", async () => {
      req.body.username = "newuser";
      requestMock.query.mockRejectedValue(new Error("DB"));
      await updateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateProfileV2", () => {
    test("missing username", async () => {
      await updateProfileV2(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("username too short", async () => {
      req.body.username = "ab";

      await updateProfileV2(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("success", async () => {
      req.body.username = "abcdef";

      requestMock.query.mockResolvedValue({});

      await updateProfileV2(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("getFavoriteEvents", () => {
    test("success", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [{ event_id: 1 }, { event_id: 2 }],
      });

      await getFavoriteEvents(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [1, 2],
        })
      );
    });
  });

  // --- Saved Routes Tests ---
  describe("createSavedRoute", () => {
    test("400 missing data", async () => {
      await createSavedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    test("success", async () => {
      req.body = {
        origin_lat: 1,
        origin_lng: 1,
        destination_lat: 2,
        destination_lng: 2,
        route_data: "data",
      };
      requestMock.query.mockResolvedValue({ recordset: [{ route_id: 1 }] });
      await createSavedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
    test("db error", async () => {
      req.body = {
        origin_lat: 1,
        origin_lng: 1,
        destination_lat: 2,
        destination_lng: 2,
        route_data: "data",
      };
      requestMock.query.mockRejectedValue(new Error("DB Error"));
      await createSavedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getSavedRoutes", () => {
    test("success", async () => {
      requestMock.query.mockResolvedValue({ recordset: [] });
      await getSavedRoutes(req, res);
      expect(res.json).toHaveBeenCalled();
    });
    test("db error", async () => {
      requestMock.query.mockRejectedValue(new Error("DB"));
      await getSavedRoutes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getSavedRouteById", () => {
    test("404 not found", async () => {
      req.params.id = "1";
      requestMock.query.mockResolvedValue({ recordset: [] });
      await getSavedRouteById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    test("success", async () => {
      req.params.id = "1";
      requestMock.query.mockResolvedValue({ recordset: [{ route_id: 1 }] });
      await getSavedRouteById(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("deleteSavedRoute", () => {
    test("404 not found", async () => {
      req.params.id = "1";
      requestMock.query.mockResolvedValue({ rowsAffected: [0] });
      await deleteSavedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    test("success", async () => {
      req.params.id = "1";
      requestMock.query.mockResolvedValue({ rowsAffected: [1] });
      await deleteSavedRoute(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("shareSavedRoute", () => {
    test("404 not found", async () => {
      req.params.id = "1";
      requestMock.query.mockResolvedValue({ rowsAffected: [0] });
      await shareSavedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    test("success", async () => {
      req.params.id = "1";
      requestMock.query.mockResolvedValue({
        rowsAffected: [1],
        recordset: [{ share_token: "token" }],
      });
      await shareSavedRoute(req, res);
      expect(res.json).toHaveBeenCalled();
    });
    test("error", async () => {
      req.params.id = "1";
      requestMock.query.mockRejectedValue(new Error("DB"));
      await shareSavedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("shareDirectRoute", () => {
    test("400 missing data", async () => {
      await shareDirectRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    test("success", async () => {
      req.body = {
        origin_lat: 1,
        origin_lng: 1,
        destination_lat: 2,
        destination_lng: 2,
        route_data: "data",
      };
      requestMock.query.mockResolvedValue({
        recordset: [{ share_token: "token" }],
      });
      await shareDirectRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("getSharedRoute", () => {
    test("404 not found", async () => {
      req.params.token = "abc";
      requestMock.query.mockResolvedValue({ recordset: [] });
      await getSharedRoute(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    test("success", async () => {
      req.params.token = "abc";
      requestMock.query.mockResolvedValue({ recordset: [{ route_id: 1 }] });
      await getSharedRoute(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });
});