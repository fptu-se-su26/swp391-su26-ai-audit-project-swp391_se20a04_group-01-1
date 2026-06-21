jest.mock("bcrypt", () => ({ hash: jest.fn().mockResolvedValue("hashed"), genSalt: jest.fn().mockResolvedValue("salt") }));
jest.mock("../utils/helpers", () => ({ isValidEmail: jest.fn().mockReturnValue(true), isValidPassword: jest.fn().mockReturnValue(true) }));
jest.mock("../db", () => {
    const query = jest.fn();
    return { sql: { NVarChar: "NVarChar" }, mockQuery: query, poolPromise: Promise.resolve({ request: () => ({ input: jest.fn().mockReturnThis(), query }) }) };
});

const { register } = require("../controllers/authController");
const { mockQuery } = require("../db");
const helpers = require("../utils/helpers");

describe("REGISTER", () => {
    let req, res;
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();
        helpers.isValidEmail.mockReturnValue(true);
        helpers.isValidPassword.mockReturnValue(true);
    });

    test("Missing fields", async () => {
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Invalid email", async () => {
        req.body = { username: "abc", email: "a", password: "123" };
        helpers.isValidEmail.mockReturnValue(false);
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Invalid password", async () => {
        req.body = { username: "abc", email: "a@gmail.com", password: "12" };
        helpers.isValidPassword.mockReturnValue(false);
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Username too short", async () => {
        req.body = { username: "ab", email: "a@gmail.com", password: "123456" };
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Duplicate email", async () => {
        req.body = { username: "abc", email: "a@gmail.com", password: "123456" };
        mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1 }] });
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Register success", async () => {
        req.body = { username: "abc", email: "a@gmail.com", password: "123456" };
        mockQuery.mockResolvedValueOnce({ recordset: [] }).mockResolvedValueOnce({});
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test("DB Error", async () => {
        req.body = { username: "abc", email: "a@gmail.com", password: "123456" };
        mockQuery.mockRejectedValue(new Error("DB Error"));
        await register(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});