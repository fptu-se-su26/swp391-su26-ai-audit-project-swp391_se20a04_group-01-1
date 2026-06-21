const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({ OAuth2Client: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })) }));
jest.mock("jsonwebtoken", () => ({ sign: jest.fn().mockReturnValue("jwt") }));
jest.mock("../utils/helpers", () => ({ isValidEmail: jest.fn().mockReturnValue(true), checkBanStatus: jest.fn().mockReturnValue({ banned: false }) }));
jest.mock("../db", () => {
    const query = jest.fn();
    return { sql: { NVarChar: "NVarChar", Int: "Int" }, mockQuery: query, poolPromise: Promise.resolve({ request: () => ({ input: jest.fn().mockReturnThis(), query }) }) };
});

const { googleLogin } = require("../controllers/authController");
const { mockQuery } = require("../db");
const helpers = require("../utils/helpers");

describe("GOOGLE LOGIN CONTROLLER", () => {
    let req, res;
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        req = { body: { token: "token" } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();
        helpers.isValidEmail.mockReturnValue(true);
        helpers.checkBanStatus.mockReturnValue({ banned: false });
    });

    test("Missing email from Google", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ name: "User" }) }); // Không có email
        await googleLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Invalid email from Google", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ email: "invalid", name: "User" }) });
        helpers.isValidEmail.mockReturnValueOnce(false);
        await googleLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("Banned user via Google", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ email: "a@gmail.com" }) });
        mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1 }] });
        helpers.checkBanStatus.mockReturnValueOnce({ banned: true, message: "Ban" });
        await googleLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("Insert new user failed", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ email: "a@gmail.com" }) });
        mockQuery.mockResolvedValueOnce({ recordset: [] }).mockResolvedValueOnce({}).mockResolvedValueOnce({ recordset: [] }); // Trả về rỗng sau khi insert
        await googleLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("Success existing user", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ email: "a@gmail.com" }) });
        mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1, email: "a@gmail.com" }] }).mockResolvedValueOnce({});
        await googleLogin(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    test("Success new user", async () => {
        mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ email: "a@gmail.com", name: "Name" }) });
        mockQuery.mockResolvedValueOnce({ recordset: [] }) 
            .mockResolvedValueOnce({}) 
            .mockResolvedValueOnce({ recordset: [{ user_id: 2 }] }) 
            .mockResolvedValueOnce({}); 
        await googleLogin(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    test("Google Auth Error", async () => {
        mockVerifyIdToken.mockRejectedValue(new Error("Invalid Token"));
        await googleLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});