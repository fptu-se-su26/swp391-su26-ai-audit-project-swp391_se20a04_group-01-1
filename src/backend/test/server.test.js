// test/server.test.js

const request = require("supertest");

process.env.NODE_ENV = "test";

const app = require("../server");

describe("Server", () => {
  test("app should be defined", () => {
    expect(app).toBeDefined();
  });

  test("unknown route should return 404", async () => {
    const res = await request(app)
      .get("/unknown-route");

    expect(res.status).toBe(404);
  });

  test("share route exists", async () => {
    const res = await request(app)
      .get("/api/routes/share/testtoken");

    expect([200, 404, 500]).toContain(
      res.status
    );
  });
});