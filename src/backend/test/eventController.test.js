// backend/test/eventController.test.js

jest.mock("../db", () => ({
  sql: {
    Int: "Int",
    Bit: "Bit",
    NVarChar: "NVarChar",
    DateTime: "DateTime",
    Time: "Time",
    MAX: "MAX",
    Decimal: () => "Decimal",
  },
  poolPromise: Promise.resolve({
    request: jest.fn(),
  }),
}));

jest.mock("../utils/helpers", () => ({
  parseTimeToDate: jest.fn((v) => v),
}));

const { poolPromise } = require("../db");

const {
  getEvents,
  createEvent,
  getEventCategories,
  updateEvent,
  deleteEvent,
  toggleFavoriteEvent,
  getTrafficAlerts,
  createTrafficAlert,
  getEventRoads,
  createEventRoad,
  updateEventRoad,
  deleteEventRoad,
} = require("../controllers/eventController");

describe("Event Controller", () => {
  let req;
  let res;
  let requestMock;

  beforeEach(async () => {
    // Ẩn log lỗi khi test các case 500
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    req = {
      user: {
        id: 1,
      },
      params: {},
      query: {},
      body: {},
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

  describe("getEvents", () => {
    test("success without filter", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [],
      });

      await getEvents(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("success with status filter", async () => {
      req.query.status = "approved";

      requestMock.query.mockResolvedValue({
        recordset: [],
      });

      await getEvents(req, res);

      expect(requestMock.input).toHaveBeenCalled();
    });

    test("db error", async () => {
      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("createEvent", () => {
    test("missing required fields", async () => {
      req.body = {};

      await createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("create success", async () => {
      req.body = {
        title: "Test Event",
        location_name: "Da Nang",
        start_time: "2026-01-01",
      };

      requestMock.query.mockResolvedValue({});

      await createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("db error", async () => {
      req.body = {
        title: "Test Event",
        location_name: "Da Nang",
        start_time: "2026-01-01",
      };

      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getEventCategories", () => {
    test("success", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [],
      });

      await getEventCategories(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("error", async () => {
      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await getEventCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateEvent", () => {
    test("event not found", async () => {
      requestMock.query
        .mockResolvedValueOnce({
          recordset: [],
        });

      req.params.id = "1";

      await updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("update success", async () => {
      requestMock.query
        .mockResolvedValueOnce({
          recordset: [{ event_id: 1 }],
        })
        .mockResolvedValueOnce({});

      req.params.id = "1";

      await updateEvent(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("deleteEvent", () => {
    test("not found", async () => {
      requestMock.query
        .mockResolvedValueOnce({
          recordset: [],
        });

      req.params.id = "1";

      await deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("success", async () => {
      requestMock.query
        .mockResolvedValueOnce({
          recordset: [{ event_id: 1 }],
        })
        .mockResolvedValueOnce({});

      req.params.id = "1";

      await deleteEvent(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("toggleFavoriteEvent", () => {
    test("invalid id", async () => {
      req.params.id = "abc";

      await toggleFavoriteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("event not found", async () => {
      req.params.id = "1";

      requestMock.query.mockResolvedValueOnce({
        recordset: [],
      });

      await toggleFavoriteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("favorite event", async () => {
      req.params.id = "1";

      requestMock.query
        .mockResolvedValueOnce({
          recordset: [{
            event_id: 1,
            favorite_count: 5,
          }],
        })
        .mockResolvedValueOnce({
          recordset: [],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await toggleFavoriteEvent(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isFavorite: true,
        })
      );
    });

    test("unfavorite event", async () => {
      req.params.id = "1";

      requestMock.query
        .mockResolvedValueOnce({
          recordset: [{
            event_id: 1,
            favorite_count: 5,
          }],
        })
        .mockResolvedValueOnce({
          recordset: [{ ok: 1 }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await toggleFavoriteEvent(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          isFavorite: false,
        })
      );
    });
  });

  describe("getTrafficAlerts", () => {
    test("success", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [
          {
            alert_id: 1,
            title: "Alert",
            latitude: "16.1",
            longitude: "108.2",
            is_active: 1,
          },
        ],
      });

      await getTrafficAlerts(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("error", async () => {
      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await getTrafficAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("createTrafficAlert", () => {
    test("missing required fields", async () => {
      req.body = {};

      await createTrafficAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("success", async () => {
      req.body = {
        type: "accident",
        title: "Tai nan",
        latitude: 16.1,
        longitude: 108.2,
        severity: "high",
      };

      requestMock.query.mockResolvedValue({
        recordset: [
          {
            alert_id: 99,
          },
        ],
      });

      await createTrafficAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("db error", async () => {
      req.body = {
        type: "accident",
        title: "Tai nan",
        latitude: 16.1,
        longitude: 108.2,
        severity: "high",
      };

      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await createTrafficAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getEventRoads", () => {
    test("success", async () => {
      requestMock.query.mockResolvedValue({
        recordset: [{
          road_id: 1,
          geojson_coords: "{\"type\":\"Line\"}",
          bypass_coords: "[]"
        }]
      });

      await getEventRoads(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("success with active_only", async () => {
      req.query = {
        active_only: "true",
        approved_only: "true",
        event_id: "1"
      };

      requestMock.query.mockResolvedValue({
        recordset: [{
          road_id: 1,
          days_of_week: "0,1,2,3,4,5,6",
          start_time_of_day: "00:00",
          end_time_of_day: "23:59"
        }]
      });

      await getEventRoads(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    test("db error", async () => {
      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await getEventRoads(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("createEventRoad", () => {
    test("missing fields", async () => {
      await createEventRoad(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("success", async () => {
      req.body = {
        event_id: 1,
        road_name: "Road 1",
        restriction_type: "Full",
        restriction_start: "2026",
        restriction_end: "2026",
        geojson_coords: { a: 1 }
      };

      requestMock.query.mockResolvedValue({});

      await createEventRoad(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("db error", async () => {
      req.body = {
        event_id: 1,
        road_name: "Road 1",
        restriction_type: "Full",
        restriction_start: "2026",
        restriction_end: "2026"
      };

      requestMock.query.mockRejectedValue(
        new Error("DB Error")
      );

      await createEventRoad(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateEventRoad", () => {
    test("missing fields", async () => {
      await updateEventRoad(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("404 not found", async () => {
      req.params.id = "1";

      req.body = {
        event_id: 1,
        road_name: "Road 1",
        restriction_type: "Full",
        restriction_start: "2026",
        restriction_end: "2026"
      };

      requestMock.query.mockResolvedValue({
        rowsAffected: [0]
      });

      await updateEventRoad(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("success", async () => {
      req.params.id = "1";

      req.body = {
        event_id: 1,
        road_name: "Road 1",
        restriction_type: "Full",
        restriction_start: "2026",
        restriction_end: "2026"
      };

      requestMock.query.mockResolvedValue({
        rowsAffected: [1]
      });

      await updateEventRoad(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("deleteEventRoad", () => {
    test("404 not found", async () => {
      req.params.id = "1";

      requestMock.query.mockResolvedValue({
        rowsAffected: [0]
      });

      await deleteEventRoad(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("success", async () => {
      req.params.id = "1";

      requestMock.query.mockResolvedValue({
        rowsAffected: [1]
      });

      await deleteEventRoad(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });
});