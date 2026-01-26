import { rm } from "node:fs/promises";

const outdir = "./dist";

console.log(`🧹 Cleaning existing ${outdir}/ directory`);
await rm(outdir, { recursive: true, force: true });

console.log("📦 Building web application");
const result = await Bun.build({
  entrypoints: ["src/index.html"],
  outdir,
  target: "browser",
  sourcemap: "linked",
  env: "UNO_PUBLIC_*",
  minify: true,
});

if (!result.success) {
  console.error("❌ Build failed");
  for (const message of result.logs) {
    console.error(message.message);
  }
  process.exit(1);
}

console.log("✅ Build complete");
console.log(`📁 Output: ${outdir}/`);
