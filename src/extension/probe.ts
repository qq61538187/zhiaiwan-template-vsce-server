import { execFile } from "node:child_process";
import { toErrorMessage } from "./utils";

// 按端口定位监听进程并结束，供“重启服务”命令复用。
export async function killPortListeners(port: number): Promise<number[]> {
  const pids = await findPortPids(port);
  return killPids(pids);
}

// 返回当前环境的探测能力清单，便于提前判断重启是否会退化为“仅保活”。
export async function getPortProbeCommandStatus(): Promise<{ name: string; available: boolean }[]> {
  if (process.platform === "win32") {
    return [
      {
        name: "powershell",
        available: await isExecutableAvailable("powershell", [
          "-NoProfile",
          "-Command",
          "$PSVersionTable.PSVersion.ToString()"
        ])
      },
      {
        name: "pwsh",
        available: await isExecutableAvailable("pwsh", [
          "-NoProfile",
          "-Command",
          "$PSVersionTable.PSVersion.ToString()"
        ])
      },
      { name: "netstat", available: await isExecutableAvailable("netstat", ["-ano"]) }
    ];
  }
  return [
    { name: "lsof", available: await isExecutableAvailable("lsof", []) },
    { name: "fuser", available: await isExecutableAvailable("fuser", []) },
    { name: "ss", available: await isExecutableAvailable("ss", ["-ltnp"]) },
    { name: "netstat", available: await isExecutableAvailable("netstat", ["-anp"]) }
  ];
}

// 只识别“工具缺失”场景，避免把真实执行失败误判成可降级问题。
export function isPortProbeUnavailable(error: unknown): boolean {
  // 重启命令需要区分“探测工具缺失”和“真实执行失败”，缺失时走降级分支。
  if (isCommandNotFound(error)) {
    return true;
  }
  const message = toErrorMessage(error);
  return message.startsWith("port-probe-missing:");
}

// 按平台分层探测 PID：先走结构化输出，再走文本解析兜底。
async function findPortPids(port: number): Promise<number[]> {
  if (process.platform === "win32") {
    const missingCommands: string[] = [];
    // 先用 PowerShell 原生接口拿 OwningProcess，结果比 netstat 文本解析稳定。
    for (const shell of ["powershell", "pwsh"]) {
      try {
        const output = await runExecFile(
          shell,
          [
            "-NoProfile",
            "-Command",
            `Get-NetTCPConnection -State Listen -LocalPort ${port} | Select-Object -ExpandProperty OwningProcess`
          ],
          {
            allowExitCode1: true
          }
        );
        return parsePowerShellPids(output);
      } catch (error) {
        if (!isCommandNotFound(error)) {
          throw error;
        }
        missingCommands.push(shell);
      }
    }

    try {
      const output = await runExecFile("netstat", ["-ano", "-p", "tcp"], {
        allowExitCode1: true
      });
      return parseNetstatPids(output, port);
    } catch (error) {
      if (!isCommandNotFound(error)) {
        throw error;
      }
      missingCommands.push("netstat");
      throw new Error(`port-probe-missing:${missingCommands.join(",")}`);
    }
  }

  const missingCommands: string[] = [];

  try {
    // lsof 在多数 Unix 环境默认可用，优先使用最短输出减少解析误差。
    const output = await runExecFile("lsof", ["-nP", "-ti", `tcp:${port}`], {
      allowExitCode1: true
    });
    return output
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }
    missingCommands.push("lsof");
  }

  try {
    // 某些容器只保留 fuser/ss，不依赖单一工具以提升兼容性。
    const output = await runExecFile("fuser", ["-n", "tcp", String(port)], {
      allowExitCode1: true
    });
    return parseFuserPids(output);
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }
    missingCommands.push("fuser");
  }

  try {
    const output = await runExecFile("ss", ["-ltnp"], {
      allowExitCode1: true
    });
    return parseSsPids(output, port);
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }
    missingCommands.push("ss");
  }

  try {
    // netstat 放最后作为兼容兜底，避免优先走复杂文本解析路径。
    const output = await runExecFile("netstat", ["-anp"], {
      allowExitCode1: true
    });
    return parseUnixNetstatPids(output, port);
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }
    missingCommands.push("netstat");
  }

  throw new Error(`port-probe-missing:${missingCommands.join(",")}`);
}

// 这里仅关注“命令是否存在”，不要求零退出码，避免把无参数校验当成缺失。
function isExecutableAvailable(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(command, args, (error) => {
      if (!error) {
        resolve(true);
        return;
      }
      const err = error as NodeJS.ErrnoException;
      resolve(err.code !== "ENOENT");
    });
  });
}

function parsePowerShellPids(rawOutput: string): number[] {
  const pidSet = new Set<number>();
  for (const line of rawOutput.split(/\r?\n/)) {
    const pid = Number(line.trim());
    if (Number.isInteger(pid) && pid > 0) {
      pidSet.add(pid);
    }
  }
  return [...pidSet];
}

function parseNetstatPids(rawOutput: string, port: number): number[] {
  const pidSet = new Set<number>();
  const needle = `:${port}`;
  for (const line of rawOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(needle)) {
      continue;
    }
    const cols = trimmed.split(/\s+/);
    // netstat 最后一列约定为 PID/进程名（win/unix 格式不同但 PID 都在末位）。
    const pid = Number(cols[cols.length - 1]);
    if (Number.isInteger(pid) && pid > 0) {
      pidSet.add(pid);
    }
  }
  return [...pidSet];
}

function parseFuserPids(rawOutput: string): number[] {
  const pidSet = new Set<number>();
  const matches = rawOutput.match(/\b\d+\b/g) ?? [];
  for (const pidText of matches) {
    const pid = Number(pidText);
    if (Number.isInteger(pid) && pid > 0) {
      pidSet.add(pid);
    }
  }
  return [...pidSet];
}

function parseSsPids(rawOutput: string, port: number): number[] {
  const pidSet = new Set<number>();
  const needle = `:${port}`;

  for (const line of rawOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(needle) || !/LISTEN/i.test(trimmed)) {
      continue;
    }
    const matches = trimmed.match(/pid=(\d+)/g) ?? [];
    // ss 一行可能包含多个进程句柄，需全部提取以避免漏杀。
    for (const item of matches) {
      const pid = Number(item.replace("pid=", ""));
      if (Number.isInteger(pid) && pid > 0) {
        pidSet.add(pid);
      }
    }
  }

  return [...pidSet];
}

function parseUnixNetstatPids(rawOutput: string, port: number): number[] {
  const pidSet = new Set<number>();
  const needle = `:${port}`;

  for (const line of rawOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(needle)) {
      continue;
    }
    if (!/LISTEN/i.test(trimmed)) {
      continue;
    }
    const match = trimmed.match(/(\d+)\/[^\s]+$/);
    if (!match) {
      continue;
    }
    const pid = Number(match[1]);
    if (Number.isInteger(pid) && pid > 0) {
      pidSet.add(pid);
    }
  }

  return [...pidSet];
}

function killPids(pids: number[]): number[] {
  const killed: number[] = [];
  for (const pid of pids) {
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      continue;
    }
    try {
      process.kill(pid, "SIGKILL");
      killed.push(pid);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ESRCH") {
        throw new Error(`结束占用进程失败(pid=${pid})：${toErrorMessage(error)}`);
      }
    }
  }
  return killed;
}

// 统一封装命令执行和 exit code 兼容策略，调用方只处理成功输出和致命错误。
function runExecFile(
  command: string,
  args: string[],
  options?: { allowExitCode1?: boolean }
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        const err = error as NodeJS.ErrnoException;
        const codeText = String(err.code ?? "");
        // 端口未被占用时部分命令返回 1，不应当按异常中断重启流程。
        if (options?.allowExitCode1 && codeText === "1") {
          resolve("");
          return;
        }
        reject(error);
        return;
      }
      resolve(`${stdout}${stderr ? `\n${stderr}` : ""}`);
    });
  });
}

function isCommandNotFound(error: unknown): boolean {
  const err = error as NodeJS.ErrnoException | undefined;
  return err?.code === "ENOENT";
}
