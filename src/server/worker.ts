import { Server } from "node:http";
import { getRuntimeConfigFromEnv } from "../shared/config";
import { startServer, stopServer } from "./app";

let server: Server | undefined;
let isStopping = false;

async function main(): Promise<void> {
  const runtimeConfig = getRuntimeConfigFromEnv();

  try {
    const started = await startServer(runtimeConfig.port);
    server = started.server;
    sendMessage({ type: "ready" });
  } catch (error) {
    sendMessage({
      type: "start-error",
      message: toErrorMessage(error)
    });
    process.exit(1);
  }
}

process.on("message", (message: { type?: string } | undefined) => {
  if (message?.type === "shutdown") {
    void shutdown(0);
  }
});

process.on("disconnect", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("uncaughtException", (error) => {
  console.error(`[worker] 未捕获异常: ${toErrorMessage(error)}`);
  void shutdown(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(`[worker] 未处理拒绝: ${toErrorMessage(reason)}`);
  void shutdown(1);
});

async function shutdown(exitCode: number): Promise<void> {
  if (isStopping) {
    return;
  }
  isStopping = true;

  try {
    if (server) {
      await stopServer(server);
      server = undefined;
    }
  } catch (error) {
    console.error(`[worker] 关闭失败: ${toErrorMessage(error)}`);
  } finally {
    process.exit(exitCode);
  }
}

function sendMessage(message: { type: "ready" | "start-error"; message?: string }): void {
  if (process.send) {
    process.send(message);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

void main();
