import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.join(process.cwd(), "data", "raw");

function cachePath(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 24);
  return path.join(RAW_DIR, `${hash}.json`);
}

export async function readCachedJson<T>(
  key: string,
  ttlMs: number,
): Promise<T | null> {
  const file = cachePath(key);
  try {
    const info = await stat(file);
    if (Date.now() - info.mtimeMs > ttlMs) return null;
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCachedJson(key: string, value: unknown): Promise<void> {
  await mkdir(RAW_DIR, { recursive: true });
  await writeFile(cachePath(key), JSON.stringify(value), "utf8");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
