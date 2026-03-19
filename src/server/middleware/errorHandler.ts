import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(
    {
      message: err.message,
      stack: err.stack,
      path: req.path
    },
    "未预期错误"
  );

  // 生产环境不回传内部错误细节，避免泄漏实现信息。
  res.status(500).json({
    status: "失败",
    message: "服务器内部错误。"
  });
}
