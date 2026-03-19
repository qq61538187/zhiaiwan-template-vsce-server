import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { getRuntimeConfigFromEnv, LogLevel } from "../shared/config";

let outputChannel: vscode.OutputChannel | undefined;
let serviceLogPath: string | undefined;
const runtimeConfig = getRuntimeConfigFromEnv();
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2
};

export function initLogging(channel: vscode.OutputChannel, extensionServiceLogPath: string): void {
  outputChannel = channel;
  serviceLogPath = extensionServiceLogPath;
}

export function logInfo(message: string): void {
  writeExtensionLog("信息", message);
}

export function logWarn(message: string): void {
  writeExtensionLog("警告", message);
}

export function logError(message: string): void {
  writeExtensionLog("错误", message);
}

function writeExtensionLog(level: "信息" | "警告" | "错误", message: string): void {
  const normalizedLevel: LogLevel = level === "错误" ? "error" : level === "警告" ? "warn" : "info";
  if (LEVEL_PRIORITY[normalizedLevel] > LEVEL_PRIORITY[runtimeConfig.logLevel]) {
    return;
  }
  const line = `[${level}] ${new Date().toISOString()} ${message}`;
  outputChannel?.appendLine(line);
  if (!serviceLogPath) {
    return;
  }
  try {
    // 扩展日志和 worker 日志写同一文件，保证多窗口排障时上下文连续。
    fs.mkdirSync(path.dirname(serviceLogPath), { recursive: true });
    fs.appendFileSync(serviceLogPath, `${line}\n`, "utf8");
  } catch {
    // 文件日志写入失败时不影响扩展主流程。
  }
}
