/**
 * Copies the built frontend (artifacts/bradlyn-theatre/dist/public)
 * into the API server's dist folder (artifacts/api-server/dist/public)
 * so Express can serve it as static files in production.
 */
import { cp, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src  = path.join(root, "artifacts/bradlyn-theatre/dist/public");
const dest = path.join(root, "artifacts/api-server/dist/public");

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`✓ Copied frontend build → ${dest}`);
