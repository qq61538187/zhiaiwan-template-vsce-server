import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  sourcemap: isWatch,
  minify: !isWatch,
  define: {
    "process.env.NODE_ENV": '"production"'
  },
  legalComments: "none"
};

const jobs = [
  {
    ...shared,
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    external: ["vscode"]
  },
  {
    ...shared,
    entryPoints: ["src/server/worker.ts"],
    outfile: "dist/server/worker.js"
  }
];

if (isWatch) {
  const contexts = await Promise.all(jobs.map((options) => context(options)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("[构建] 正在监听 extension 与 worker 的打包任务...");
} else {
  await Promise.all(jobs.map((options) => build(options)));
  console.log("[构建] 打包完成。");
}
