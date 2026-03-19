import * as fs from "node:fs";
import * as vscode from "vscode";
import {
  DEFAULT_SERVER_PORT,
  EXTENSION_CONFIG_PORT_KEY,
  EXTENSION_CONFIG_SECTION
} from "../shared/config";
import { getServiceLogPath, getWorkerPath } from "./constants";
import { isServerHealthy } from "./health";
import { logError, logInfo, logWarn } from "./logging";
import { getPortProbeCommandStatus, isPortProbeUnavailable, killPortListeners } from "./probe";
import { ensureServerAvailable } from "./service";
import { toErrorMessage } from "./utils";

// 统一注册扩展命令，避免入口文件承担具体交互细节。
export function registerExtensionCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  const openServiceLogCmd = vscode.commands.registerCommand(
    "nodeServerExtension.openServiceLog",
    async () => {
      const serviceLogPath = getServiceLogPath(context.extensionPath);
      try {
        const document = await vscode.workspace.openTextDocument(serviceLogPath);
        await vscode.window.showTextDocument(document, { preview: false });
      } catch {
        await vscode.window.showWarningMessage(`服务日志文件暂不存在：${serviceLogPath}`);
      }
    }
  );

  const restartServerCmd = vscode.commands.registerCommand(
    "nodeServerExtension.restartServer",
    async () => {
      const port = getPort();
      const workerPath = getWorkerPath(context.extensionPath);

      if (!fs.existsSync(workerPath)) {
        logError(`未找到 worker 入口: ${workerPath}`);
        await vscode.window.showErrorMessage("Template Server 重启失败：缺少 worker.js");
        return;
      }

      try {
        let killed: number[] = [];
        let canForceRestart = true;
        try {
          killed = await killPortListeners(port);
        } catch (error) {
          if (!isPortProbeUnavailable(error)) {
            throw error;
          }
          canForceRestart = false;
          // 探测工具缺失时不直接失败，避免在精简环境里“重启命令不可用”。
          logWarn(`当前环境缺少端口探测命令(${toErrorMessage(error)})，跳过强制重启。port=${port}`);
        }
        if (killed.length > 0) {
          logInfo(`重启前已结束端口占用进程。port=${port} pids=${killed.join(",")}`);
        }

        if (!canForceRestart) {
          // 无法强制杀进程时退化为“保证可用”，避免误杀未知进程。
          if (await isServerHealthy(port)) {
            logInfo(`服务当前可用，复用现有实例。port=${port}`);
            await vscode.window.showWarningMessage(
              `当前环境缺少端口探测命令，无法强制重启，已复用可用服务。port=${port}`
            );
            return;
          }
          await ensureServerAvailable(context.extensionPath, port, workerPath, true);
          await vscode.window.showInformationMessage(`Template Server 已启动。port=${port}`);
          return;
        }

        await ensureServerAvailable(context.extensionPath, port, workerPath, false);
        await vscode.window.showInformationMessage(`Template Server 已重启。port=${port}`);
      } catch (error) {
        const message = toErrorMessage(error);
        logError(`重启失败。port=${port} error=${message}`);
        await vscode.window.showErrorMessage(`Template Server 重启失败：${message}`);
      }
    }
  );

  const checkProbeCommandsCmd = vscode.commands.registerCommand(
    "nodeServerExtension.checkProbeCommands",
    async () => {
      const probeStatus = await getPortProbeCommandStatus();
      const available = probeStatus.filter((item) => item.available).map((item) => item.name);
      const missing = probeStatus.filter((item) => !item.available).map((item) => item.name);

      if (missing.length === 0) {
        const text = `端口探测命令可用：${available.join(", ")}`;
        logInfo(text);
        await vscode.window.showInformationMessage(text);
        return;
      }

      const text = `端口探测命令缺失：${missing.join(", ")}；可用：${available.join(", ") || "无"}`;
      // 这里用 warning 是为了提醒“重启能力会降级”，而不是接口不可用。
      logWarn(text);
      await vscode.window.showWarningMessage(text);
    }
  );

  return [openServiceLogCmd, restartServerCmd, checkProbeCommandsCmd];
}

// 端口读取统一走配置项，保证命令与激活流程使用同一来源。
function getPort(): number {
  return vscode.workspace
    .getConfiguration(EXTENSION_CONFIG_SECTION)
    .get<number>(EXTENSION_CONFIG_PORT_KEY, DEFAULT_SERVER_PORT);
}
