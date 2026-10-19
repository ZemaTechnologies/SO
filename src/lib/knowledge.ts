import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

let cache: string | null = null;

/** Base de connaissance ZEMA (knowledge/zema.md), lue une fois puis gardée en mémoire. */
export async function knowledge(): Promise<string> {
  if (cache) return cache;
  cache = await readFile(path.join(process.cwd(), "knowledge", "zema.md"), "utf8");
  return cache;
}
