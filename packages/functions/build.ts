import { rm } from "node:fs/promises";
import { dependencies, engines } from "./package.json";

const outdir = "./dist";

console.log(`🧹 Cleaning existing ${outdir}/ directory`);
await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir,
  target: "node",
  format: "cjs",
  external: ["firebase-admin", "firebase-functions"],
  sourcemap: "linked",
  minify: true,
});

if (!result.success) {
  console.error("❌ Build failed");
  for (const message of result.logs) {
    console.error(message.message);
  }
  process.exit(1);
}

console.log("📦 Writing package.json to output directory");
await Bun.write(
  `${outdir}/package.json`,
  JSON.stringify(
    {
      main: "./index.js",
      engines,
      dependencies: {
        "firebase-admin": dependencies["firebase-admin"],
        "firebase-functions": dependencies["firebase-functions"],
      },
    },
    null,
    2,
  ),
);

console.log("✅ Build complete");
