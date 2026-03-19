# Zhiaiwan Template VSCE Server

[中文](./README.md)

`zhiaiwan-template-vsce-server` is a VSCode/Cursor extension starter with an embedded Node worker.

## Features

- Starts a local Node service when extension activates
- Includes one base endpoint: `GET /api/health`
- Supports restart / probe-check / open-log commands
- Reuses one service instance across multiple editor windows

## Configuration

- `nodeServerExtension.port`: extension setting for service port (default `3510`)
- Optional environment variables:
  - `TEMPLATE_SERVER_LOG_LEVEL`: `info` / `warn` / `error`
  - `TEMPLATE_SERVER_STARTUP_TIMEOUT_MS`
  - `TEMPLATE_SERVER_STARTUP_INTERVAL_MS`

## Development

```bash
npm install
npm run lint
npm run format:check
npm run test:run
npm run compile
```

## Quick Validation

```bash
npm run lint
npm run format:check
npm run test:run
npm run compile
npm run example:health
```

## Scripts

- `npm run example:health`: run minimal health check example
- `npm run bootstrap -- --name ... --display-name ... --command-prefix ... --port ...`
- `npm run package:vsix`: package extension
- `npm run changeset`: create release change records
- `npm run commit`: interactive commit with Commitizen + cz-git

## Testing

Vitest includes baseline cases:

- `/api/health` returns 200
- error middleware fallback returns 500 payload

## Add New Route

1. Create a new route file under `src/server/routes`
2. Register it in `src/server/routes/index.ts`
3. Keep health check endpoint unchanged for extension-side readiness checks
