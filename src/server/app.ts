import compression from "compression";
import cors from "cors";
import { randomUUID } from "node:crypto";
import express, { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { Server } from "node:http";
import { errorHandler } from "./middleware/errorHandler";
import { registerApiRoutes } from "./routes";
import { logger } from "./utils/logger";

export interface StartedServer {
  app: Express;
  server: Server;
  port: number;
}

export function createApp(): Express {
  const app = express();

  // 先挂通用中间件，保证后续业务路由默认受保护。
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  // 统一请求日志放在路由前，保证成功/失败路径都能拿到同一格式埋点。
  app.use(requestLogMiddleware);

  registerApiRoutes(app);

  // 错误处理中间件必须放在路由后面，才能兜底前面抛出的异常。
  app.use(errorHandler);

  return app;
}

export async function startServer(port: number): Promise<StartedServer> {
  const app = createApp();

  const server = await listen(app, port);
  logger.info({ port }, "Node 服务已启动");

  return { app, server, port };
}

export async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function listen(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    // 用事件确认启动结果，避免直接返回 listen() 造成调用方误判启动成功。
    const server = app.listen(port);
    server.on("listening", () => resolve(server));
    server.on("error", reject);
  });
}

function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  // 统一在入口处透传 requestId，便于调用方用单个 ID 串联全链路日志。
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      },
      "请求处理完成"
    );
  });

  next();
}

function getRequestId(req: Request): string {
  const headerValue = req.header("x-request-id");
  if (headerValue && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return randomUUID();
}
