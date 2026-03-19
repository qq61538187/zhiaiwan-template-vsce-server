import { Express } from "express";
import { API_BASE_PATH } from "../../shared/config";
import { healthRouter } from "./health";

// 新增业务路由统一在这里注册，避免 app.ts 持续膨胀。
export function registerApiRoutes(app: Express): void {
  app.use(API_BASE_PATH, healthRouter);
}
