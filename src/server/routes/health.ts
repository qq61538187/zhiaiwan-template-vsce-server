import { Router } from "express";
import { HEALTH_ROUTE_PATH } from "../../shared/config";

export const healthRouter = Router();

healthRouter.get(HEALTH_ROUTE_PATH, (_req, res) => {
  // 健康检查只返回基础状态，避免暴露运行环境细节。
  res.status(200).json({
    // 状态值统一中文，便于调用方直接面向终端用户展示。
    status: "成功",
    timestamp: new Date().toISOString()
  });
});
