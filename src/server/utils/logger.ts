import * as fs from "node:fs";
import * as path from "node:path";
import { getRuntimeConfigFromEnv, LogLevel, SERVER_ENV_KEYS } from "../../shared/config";

type LogMeta = Record<string, unknown> | undefined;
const runtimeConfig = getRuntimeConfigFromEnv();
const logFilePath = process.env[SERVER_ENV_KEYS.logFile]?.trim();
let hasPreparedLogDir = false;
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2
};

export const logger = {
  info(meta: LogMeta, message: string): void {
    write("info", "信息", message, meta);
  },
  warn(meta: LogMeta, message: string): void {
    write("warn", "警告", message, meta);
  },
  error(meta: LogMeta, message: string): void {
    write("error", "错误", message, meta);
  }
};

function write(
  level: LogLevel,
  label: "信息" | "警告" | "错误",
  message: string,
  meta?: LogMeta
): void {
  if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[runtimeConfig.logLevel]) {
    return;
  }
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  // 统一成单行日志，方便在扩展输出通道和终端里检索。
  const line = `[${new Date().toISOString()}] [${label}] ${message}${payload}`;
  writeToFile(line);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

function writeToFile(line: string): void {
  if (!logFilePath) {
    return;
  }
  try {
    if (!hasPreparedLogDir) {
      fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
      hasPreparedLogDir = true;
    }
    fs.appendFileSync(logFilePath, `${line}\n`, "utf8");
  } catch {
    // 文件日志失败时保持业务可用，避免把日志问题放大成接口故障。
  }
}
