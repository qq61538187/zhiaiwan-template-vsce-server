import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { getRuntimeConfigFromEnv, SERVER_ENV_KEYS } from "../shared/config";
import { getServiceLogPath, START_LOCK_FILE_NAME } from "./constants";
import { isServerHealthy, waitForServerHealthy } from "./health";
import { logInfo } from "./logging";

// 确保端口对应服务可用。
// 多窗口并发激活时只允许一个窗口实际拉起 worker，其余窗口复用已有实例。
export async function ensureServerAvailable(
  extensionPath: string,
  port: number,
  workerPath: string,
  allowReuse: boolean
): Promise<void> {
  const runtimeConfig = getRuntimeConfigFromEnv();

  // 多窗口共享同一端口时优先复用，避免每个窗口都重复拉起 worker。
  if (allowReuse && (await isServerHealthy(port))) {
    logInfo(`检测到已有服务，复用实例。port=${port}`);
    return;
  }

  let releaseStartLock = tryAcquireStartLock(extensionPath);
  if (!releaseStartLock) {
    // 先等待正在启动的实例，只有确认失败后才尝试抢锁补启动。
    logInfo(`检测到其他窗口正在启动服务，等待结果。port=${port}`);
    if (
      await waitForServerHealthy(
        port,
        runtimeConfig.startupWaitTimeoutMs,
        runtimeConfig.startupWaitIntervalMs
      )
    ) {
      logInfo(`服务已就绪，复用实例。port=${port}`);
      return;
    }
    releaseStartLock = tryAcquireStartLock(extensionPath);
    if (!releaseStartLock) {
      throw new Error("启动锁被占用，请稍后重试。");
    }
  }

  try {
    if (allowReuse && (await isServerHealthy(port))) {
      logInfo(`服务已就绪，复用实例。port=${port}`);
      return;
    }

    // detached + ignore 保证窗口关闭后服务不被宿主进程阻塞。
    const child = cp.spawn(process.execPath, [workerPath], {
      cwd: path.dirname(workerPath),
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        [SERVER_ENV_KEYS.port]: String(port),
        [SERVER_ENV_KEYS.logFile]: getServiceLogPath(extensionPath)
      }
    });
    child.unref();

    // 只以健康检查作为启动成功标准，避免把“进程已创建”误判为“服务可用”。
    if (
      await waitForServerHealthy(
        port,
        runtimeConfig.startupWaitTimeoutMs,
        runtimeConfig.startupWaitIntervalMs
      )
    ) {
      logInfo(`独立服务已就绪。port=${port}`);
      return;
    }
    throw new Error("已触发启动但服务未就绪。");
  } finally {
    releaseStartLock();
  }
}

// 用文件锁在窗口间做轻量互斥，避免同时 spawn 导致重复启动和日志混乱。
function tryAcquireStartLock(extensionPath: string): (() => void) | undefined {
  const lockPath = path.join(extensionPath, START_LOCK_FILE_NAME);
  let fd: number;

  try {
    // 用文件锁协调多窗口并发启动，避免同一时刻重复 spawn。
    fd = fs.openSync(lockPath, "wx");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EEXIST") {
      return undefined;
    }
    throw error;
  }

  return () => {
    try {
      fs.closeSync(fd);
    } catch {}
    try {
      fs.unlinkSync(lockPath);
    } catch {}
  };
}
