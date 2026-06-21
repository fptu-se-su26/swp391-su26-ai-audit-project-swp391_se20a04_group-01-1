jest.mock("bcrypt", () => ({ compare: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ sign: jest.fn().mockReturnValue("mocked-token") }));
jest.mock("../utils/helpers", () => ({
    isValidEmail: jest.fn().mockReturnValue(true),
    checkBanStatus: jest.fn().mockReturnValue({ banned: false })
}));
jest.mock("../db", () => {
    const query = jest.fn();
    return {
        sql: { NVarChar: "NVarChar", Int: "Int" },
        mockQuery: query,
        poolPromise: Promise.resolve({ request: () => ({ input: jest.fn().mockReturnThis(), query }) })
    };
});

const bcrypt = require("bcrypt");
const { login } = require("../controllers/authController");
const { mockQuery } = require("../db");
const helpers = require("../utils/helpers");

describe("LOGIN", () => {
    let req, res;
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();
        helpers.isValidEmail.mockReturnValue(true);
        helpers.checkBanStatus.mockReturnValue({ banned: false });
    });

    test("Missing fields", async () => {
        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Invalid email", async () => {
        req.body = { email: "abc", password: "123" };
        helpers.isValidEmail.mockReturnValue(false);
        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("User not found", async () => {
        req.body = { email: "abc@gmail.com", password: "123" };
        mockQuery.mockResolvedValueOnce({ recordset: [] });
        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("Wrong password", async () => {
        req.body = { email: "abc@gmail.com", password: "123" };
        mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1, password_hash: "hash" }] });
        bcrypt.compare.mockResolvedValue(false);
        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("Banned user", async () => {
        req.body = { email: "abc@gmail.com", password: "123" };
        mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1 }] });
        helpers.checkBanStatus.mockReturnValue({ banned: true, message: "Banned" });
        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("2FA Required for admin", async () => {
        req.body = { email: "admin@gmail.com", password: "123" };
        mockQuery
            .mockResolvedValueOnce({ recordset: [{ user_id: 1, email: "admin@gmail.com" }] }) // User
            .mockResolvedValueOnce({ recordset: [{ is_2fa_enabled: true, role: "admin" }] }); // DB 2FA check
        bcrypt.compare.mockResolvedValue(true);
        await login(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requires2FA: true }));
    });

    test("Login success", async () => {
        req.body = { email: "user@gmail.com", password: "123" };
        mockQuery
            .mockResolvedValueOnce({ recordset: [{ user_id: 1, email: "user@gmail.com", role: "user" }] })
            .mockResolvedValueOnce({ recordset: [{ is_2fa_enabled: false, role: "user" }] })
            .mockResolvedValueOnce({}); // Update last_login
        bcrypt.compare.mockResolvedValue(true);
        await login(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "mocked-token" }));
    });

    test("DB Error", async () => {
        req.body = { email: "a@gmail.com", password: "123" };
        mockQuery.mockRejectedValue(new Error("DB Error"));
        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});