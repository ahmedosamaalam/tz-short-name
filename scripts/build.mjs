import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
const common = { entryPoints: ["src/index.mjs"], bundle: true, minify: true, target: "es2019", platform: "neutral" };

await build({ ...common, format: "esm", outfile: "dist/index.mjs" });
await build({ ...common, format: "cjs", outfile: "dist/index.cjs" });
await build({ ...common, format: "iife", globalName: "TzShortName", outfile: "dist/tz-short-name.min.js" });
copyFileSync("src/index.d.ts", "dist/index.d.ts");
copyFileSync("src/index.d.ts", "dist/index.d.cts");
console.log("Built dist/");
