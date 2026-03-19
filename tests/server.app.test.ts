import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { errorHandler } from "../src/server/middleware/errorHandler";
import { HEALTH_CHECK_PATH } from "../src/shared/config";

describe("server app", () => {
  it("GET /api/health returns 200", async () => {
    const response = await request(createApp()).get(HEALTH_CHECK_PATH);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("成功");
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("error middleware returns fallback 500 payload", async () => {
    const app = express();
    app.get("/boom", () => {
      throw new Error("boom");
    });
    app.use(errorHandler);

    const response = await request(app).get("/boom");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: "失败",
      message: "服务器内部错误。"
    });
  });
});
