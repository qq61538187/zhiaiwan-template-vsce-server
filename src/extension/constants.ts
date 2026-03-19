import * as path from "node:path";

export const OUTPUT_CHANNEL_NAME = "Template Server";
export const START_LOCK_FILE_NAME = "server.start.lock";
export const WORKER_ENTRY = path.join("server", "worker.js");
export const SERVICE_LOG_RELATIVE_PATH = path.join("logs", "worker.log");

export function getWorkerPath(extensionPath: string): string {
  return path.join(extensionPath, "dist", WORKER_ENTRY);
}

export function getServiceLogPath(extensionPath: string): string {
  return path.join(extensionPath, SERVICE_LOG_RELATIVE_PATH);
}
