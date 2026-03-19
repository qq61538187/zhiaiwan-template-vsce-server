import * as http from "node:http";
import { DEFAULT_HEALTH_CHECK_TIMEOUT_MS, HEALTH_CHECK_PATH } from "../shared/config";

// 启动阶段轮询健康接口，避免“进程已起”但服务尚不可用的误判。
export async function waitForServerHealthy(
  port: number,
  timeoutMs: number,
  intervalMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerHealthy(port)) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

// 统一健康检查口径，所有启动/重启分支都按同一标准判断可用性。
export function isServerHealthy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: HEALTH_CHECK_PATH,
        method: "GET",
        timeout: DEFAULT_HEALTH_CHECK_TIMEOUT_MS
      },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300);
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
