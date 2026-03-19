# Zhiaiwan Template VSCE Server

轻量 VSCode/Cursor 扩展模板，内置可复用的本地 Node 服务。

## Features

- 启动本地 Node 服务（默认端口 `3510`）
- 仅内置一个基础接口：`GET /api/health`
- 支持服务重启、探测命令检查、日志查看
- 支持多窗口复用同一服务实例

## Commands

- `Template Server: 重启服务`
- `Template Server: 探测命令检查`
- `Template Server: 打开服务日志文件`

## Quick Start

```bash
curl -i http://127.0.0.1:3510/api/health
```

## Troubleshooting

- 端口冲突：修改 `nodeServerExtension.port` 后执行 `Developer: Reload Window`
- 看不到日志：执行 `Template Server: 打开服务日志文件`
- 重启降级：执行 `Template Server: 探测命令检查` 查看本机端口探测能力

## Package VSIX

```bash
npm run package:vsix
```

更多信息：`README.md`（开发文档） / `README.en.md`（English）
