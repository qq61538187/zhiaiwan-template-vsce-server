import * as fs from "node:fs";
import * as vscode from "vscode";
import {
  DEFAULT_SERVER_PORT,
  EXTENSION_CONFIG_PORT_KEY,
  EXTENSION_CONFIG_SECTION
} from "./shared/config";
import { registerExtensionCommands } from "./extension/commands";
import { getServiceLogPath, getWorkerPath, OUTPUT_CHANNEL_NAME } from "./extension/constants";
import { logError, logInfo, initLogging } from "./extension/logging";
import { ensureServerAvailable } from "./extension/service";
import { toErrorMessage } from "./extension/utils";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);
  initLogging(outputChannel, getServiceLogPath(context.extensionPath));
  logInfo("扩展已激活：启动独立服务");

  context.subscriptions.push(...registerExtensionCommands(context));

  const port = getPort();
  const workerPath = getWorkerPath(context.extensionPath);

  if (!fs.existsSync(workerPath)) {
    logError(`未找到 worker 入口: ${workerPath}`);
    await vscode.window.showErrorMessage("Template Server 启动失败：缺少 worker.js");
    return;
  }

  try {
    await ensureServerAvailable(context.extensionPath, port, workerPath, true);
  } catch (error) {
    logError(`启动失败。port=${port} error=${toErrorMessage(error)}`);
  }
}

export function deactivate(): void {}

function getPort(): number {
  return vscode.workspace
    .getConfiguration(EXTENSION_CONFIG_SECTION)
    .get<number>(EXTENSION_CONFIG_PORT_KEY, DEFAULT_SERVER_PORT);
}
