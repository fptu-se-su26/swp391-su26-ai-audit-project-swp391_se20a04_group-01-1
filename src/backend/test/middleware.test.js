// test/middleware.test.js

const jwt = require("jsonwebtoken");

jest.mock("jsonwebtoken");

const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth");

describe("authenticateToken", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test("should return 401 when token missing", () => {
    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Thiếu token xác thực!",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("should return 401 when token expired", () => {
    req.headers.authorization = "Bearer expiredtoken";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback({ name: "TokenExpiredError" });
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      message: "Token đã hết hạn!",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should return 403 when token invalid", () => {
    req.headers.authorization = "Bearer invalidtoken";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback({ name: "JsonWebTokenError" });
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith({
      message: "Token không hợp lệ!",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should call next when token valid", () => {
    const fakeUser = {
      id: 1,
      role: "admin",
    };

    req.headers.authorization = "Bearer validtoken";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, fakeUser);
    });

    authenticateToken(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});

describe("authorizeRole", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test("should return 403 when user missing", () => {
    authorizeRole("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith({
      message: "Bạn không có quyền truy cập tài nguyên này!",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should return 403 when role not allowed", () => {
    req.user = {
      role: "user",
    };

    authorizeRole("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith({
      message: "Bạn không có quyền truy cập tài nguyên này!",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should call next when role allowed", () => {
    req.user = {
      role: "admin",
    };

    authorizeRole("admin", "manager")(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});