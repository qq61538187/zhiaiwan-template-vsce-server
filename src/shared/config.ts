export const API_BASE_PATH = "/api";
export const HEALTH_ROUTE_PATH = "/health";
// 健康检查路径由一处拼接，避免扩展侧与服务侧路径漂移。
export const HEALTH_CHECK_PATH = `${API_BASE_PATH}${HEALTH_ROUTE_PATH}`;

// 配置前缀集中定义，避免命令前缀重命名时遗漏键名。
export const EXTENSION_CONFIG_SECTION = "nodeServerExtension";
export const EXTENSION_CONFIG_PORT_KEY = "port";

export const DEFAULT_SERVER_PORT = 3510;
export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 1000;
// 启动等待默认 8s，兼顾冷启动波动与失败快速反馈。
export const DEFAULT_STARTUP_WAIT_TIMEOUT_MS = 8000;
export const DEFAULT_STARTUP_WAIT_INTERVAL_MS = 250;
export const DEFAULT_LOG_LEVEL: LogLevel = "info";

export type LogLevel = "error" | "warn" | "info";

// 环境变量键统一收口，避免多处手写导致拼写不一致。
export const SERVER_ENV_KEYS = {
  port: "VSCE_SERVER_PORT",
  logFile: "VSCE_SERVER_LOG_FILE",
  logLevel: "VSCE_SERVER_LOG_LEVEL",
  healthCheckTimeoutMs: "VSCE_SERVER_HEALTH_TIMEOUT_MS",
  startupWaitTimeoutMs: "VSCE_SERVER_STARTUP_TIMEOUT_MS",
  startupWaitIntervalMs: "VSCE_SERVER_STARTUP_INTERVAL_MS"
} as const;

export interface RuntimeConfig {
  port: number;
  logLevel: LogLevel;
  healthCheckTimeoutMs: number;
  startupWaitTimeoutMs: number;
  startupWaitIntervalMs: number;
}

// 非法环境变量一律回退默认值，保证模板在脏环境下也能启动。
export function getRuntimeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    port: parsePositiveInt(env[SERVER_ENV_KEYS.port], DEFAULT_SERVER_PORT),
    logLevel: parseLogLevel(env[SERVER_ENV_KEYS.logLevel], DEFAULT_LOG_LEVEL),
    healthCheckTimeoutMs: parsePositiveInt(
      env[SERVER_ENV_KEYS.healthCheckTimeoutMs],
      DEFAULT_HEALTH_CHECK_TIMEOUT_MS
    ),
    startupWaitTimeoutMs: parsePositiveInt(
      env[SERVER_ENV_KEYS.startupWaitTimeoutMs],
      DEFAULT_STARTUP_WAIT_TIMEOUT_MS
    ),
    startupWaitIntervalMs: parsePositiveInt(
      env[SERVER_ENV_KEYS.startupWaitIntervalMs],
      DEFAULT_STARTUP_WAIT_INTERVAL_MS
    )
  };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function parseLogLevel(raw: string | undefined, fallback: LogLevel): LogLevel {
  // 只接受白名单级别，避免未知值让日志过滤逻辑失真。
  if (raw === "error" || raw === "warn" || raw === "info") {
    return raw;
  }
  return fallback;
}
