export const API_BASE_PATH = "/api";
export const HEALTH_ROUTE_PATH = "/health";
export const HEALTH_CHECK_PATH = `${API_BASE_PATH}${HEALTH_ROUTE_PATH}`;

export const EXTENSION_CONFIG_SECTION = "nodeServerExtension";
export const EXTENSION_CONFIG_PORT_KEY = "port";

export const DEFAULT_SERVER_PORT = 3510;
export const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 1000;
export const DEFAULT_STARTUP_WAIT_TIMEOUT_MS = 8000;
export const DEFAULT_STARTUP_WAIT_INTERVAL_MS = 250;
export const DEFAULT_LOG_LEVEL: LogLevel = "info";

export type LogLevel = "error" | "warn" | "info";

export const SERVER_ENV_KEYS = {
  port: "TEMPLATE_SERVER_PORT",
  logFile: "TEMPLATE_SERVER_LOG_FILE",
  logLevel: "TEMPLATE_SERVER_LOG_LEVEL",
  healthCheckTimeoutMs: "TEMPLATE_SERVER_HEALTH_TIMEOUT_MS",
  startupWaitTimeoutMs: "TEMPLATE_SERVER_STARTUP_TIMEOUT_MS",
  startupWaitIntervalMs: "TEMPLATE_SERVER_STARTUP_INTERVAL_MS"
} as const;

export interface RuntimeConfig {
  port: number;
  logLevel: LogLevel;
  healthCheckTimeoutMs: number;
  startupWaitTimeoutMs: number;
  startupWaitIntervalMs: number;
}

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
  if (raw === "error" || raw === "warn" || raw === "info") {
    return raw;
  }
  return fallback;
}
