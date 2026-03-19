# Zhiaiwan Template VSCE Server

[English](./README.en.md)

`zhiaiwan-template-vsce-server` 是一个 VSCode/Cursor 扩展基础骨架：

- 扩展激活后启动独立 Node Worker
- 默认提供一个基础接口：`GET /api/health`
- 提供服务重启、探测命令检查、日志打开能力
- 支持多窗口复用同一服务实例

该仓库用于二次开发，你可以在 `src/server/routes/index.ts` 里统一注册业务路由。

## 当前接口

仅保留健康检查接口：

```bash
GET /api/health
```

返回示例：

```json
{
  "status": "成功",
  "timestamp": "2026-03-19T01:00:00.000Z"
}
```

## 命令列表

- `Template Server: 重启服务`
- `Template Server: 探测命令检查`
- `Template Server: 打开服务日志文件`

## 配置项

- `nodeServerExtension.port`：服务端口，默认 `3510`
- `VSCE_SERVER_LOG_LEVEL`：日志级别（`info`/`warn`/`error`）
- `VSCE_SERVER_STARTUP_TIMEOUT_MS`：启动等待超时，默认 `8000`
- `VSCE_SERVER_STARTUP_INTERVAL_MS`：启动轮询间隔，默认 `250`

## 项目结构

```text
src/
  shared/
    config.ts                    # 统一配置与默认值
  extension.ts                  # 扩展入口
  extension/
    commands.ts                 # 命令注册
    constants.ts                # 常量与路径
    health.ts                   # 启动健康检查
    logging.ts                  # 扩展日志写入
    probe.ts                    # 端口探测与重启辅助
    service.ts                  # 服务拉起与复用
    utils.ts                    # 通用工具
  server/
    app.ts                      # Express app 与中间件
    worker.ts                   # 服务进程入口
    middleware/
      errorHandler.ts           # 错误处理
    routes/
      index.ts                  # 路由注册器（统一入口）
      health.ts                 # 健康检查路由
    utils/
      logger.ts                 # 服务日志封装
scripts/
  build.mjs                     # 构建脚本
  bootstrap.mjs                 # 一键初始化模板命名
tests/
  server.app.test.ts            # /health 与错误兜底测试
examples/
  health-check.mjs              # 最小接口调用示例
```

## 本地开发

建议环境：

- Node.js `22.15.0`
- VSCode/Cursor `1.85+`

安装与编译：

```bash
npm install
npm run lint
npm run format:check
npm run test:run
npm run compile
```

启用 Git 提交前检查（仅首次）：

```bash
npm run prepare
```

提交信息会在 `commit-msg` 阶段由 `commitlint` 校验，建议使用 Conventional Commits（如 `feat:`、`fix:`、`chore:`）。
可使用 `npm run commit` 启动交互式提交（Commitizen + cz-git）。
版本管理可使用 `npm run changeset` 生成变更条目。

## 快速验收

```bash
npm run lint
npm run format:check
npm run test:run
npm run compile
npm run example:health
```

调试步骤：

1. 按 `F5` 启动 `Extension Development Host`
2. 在新窗口执行命令：
   - `Template Server: 打开服务日志文件`
   - `Template Server: 重启服务`

接口验证：

```bash
curl -i http://127.0.0.1:3510/api/health
```

## 打包 VSIX

```bash
npm run package:vsix
```

安装方式：

- `Extensions: Install from VSIX...`
- 选择打包产物

## 脚手架初始化

可以通过 bootstrap 快速替换扩展名、命令前缀和默认端口：

```bash
npm run bootstrap -- \
  --name my-vsce-template \
  --display-name "My VSCE Template" \
  --command-prefix myTemplateExtension \
  --port 3610
```

bootstrap 后建议检查：

- `package.json` 的 `name`、`displayName`、`publisher`、`repository`
- 命令前缀与配置前缀是否一致（`<prefix>.xxx`、`<prefix>.port`）
- 文档中的项目名、端口示例、命令展示是否同步
- 调试窗口中命令是否按新前缀正常出现

## 示例调用

```bash
npm run example:health
```

## 依赖更新

项目已提供 `dependabot` 配置：`.github/dependabot.yml`

## 二次开发建议

1. 在 `src/server/routes` 新建业务路由文件
2. 在 `src/server/routes/index.ts` 注册路由，保持单一入口
3. 配置优先写在 `src/shared/config.ts`，避免散落硬编码
4. 保持健康检查接口不变，便于扩展侧判断服务可用性

最小路由接入示例：

```ts
import { Router } from "express";

export const demoRouter = Router();
demoRouter.get("/demo", (_req, res) => {
  res.status(200).json({ status: "成功" });
});
```

然后在 `src/server/routes/index.ts` 注册：

```ts
app.use(API_BASE_PATH, demoRouter);
```
