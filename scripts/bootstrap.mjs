import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  const oldCommandPrefix = findCommandPrefix(packageJson);
  const nextCommandPrefix = args.commandPrefix ?? oldCommandPrefix;

  if (args.name) {
    packageJson.name = args.name;
  }
  if (args.displayName) {
    packageJson.displayName = args.displayName;
  }
  if (args.port) {
    const nextPort = Number(args.port);
    if (!Number.isInteger(nextPort) || nextPort <= 0) {
      throw new Error(`--port 必须是正整数，当前收到: ${args.port}`);
    }
    packageJson.contributes.configuration.properties[`${nextCommandPrefix}.port`].default =
      nextPort;
  }

  rewriteCommandPrefix(packageJson, oldCommandPrefix, nextCommandPrefix);
  if (args.publisher) {
    packageJson.publisher = args.publisher;
  }

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  console.log("已完成模板初始化：");
  console.log(`- name: ${packageJson.name}`);
  console.log(`- displayName: ${packageJson.displayName}`);
  console.log(`- commandPrefix: ${nextCommandPrefix}`);
  console.log(
    `- port: ${packageJson.contributes.configuration.properties[`${nextCommandPrefix}.port`].default}`
  );
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      result.help = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`不支持的参数: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`参数 ${token} 缺少值`);
    }
    result[toCamelCase(key)] = value;
    index += 1;
  }
  return result;
}

function toCamelCase(raw) {
  return raw.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function findCommandPrefix(packageJson) {
  const firstCommand = packageJson?.contributes?.commands?.[0]?.command;
  if (!firstCommand || !firstCommand.includes(".")) {
    throw new Error("无法从 package.json 推导 commandPrefix，请先检查 contributes.commands");
  }
  return firstCommand.split(".")[0];
}

function rewriteCommandPrefix(packageJson, oldPrefix, newPrefix) {
  if (oldPrefix === newPrefix) {
    return;
  }
  for (const command of packageJson.contributes.commands) {
    command.command = command.command.replace(`${oldPrefix}.`, `${newPrefix}.`);
  }

  const oldPortKey = `${oldPrefix}.port`;
  const newPortKey = `${newPrefix}.port`;
  const properties = packageJson.contributes.configuration.properties;
  properties[newPortKey] = {
    ...properties[oldPortKey]
  };
  delete properties[oldPortKey];
}

function printHelp() {
  console.log(`用法:
node ./scripts/bootstrap.mjs \\
  --name my-template-extension \\
  --display-name "My Template Extension" \\
  --command-prefix myTemplateExtension \\
  --port 3610 \\
  --publisher local

说明:
- --name: package.json name
- --display-name: package.json displayName
- --command-prefix: VSCode command 前缀与配置前缀
- --port: 默认服务端口
- --publisher: 发布者
`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[bootstrap] 失败: ${message}`);
  process.exit(1);
});
