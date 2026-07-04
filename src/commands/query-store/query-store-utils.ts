import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { resolveCatalogPath } from "../../path-utils.js";

const QUERY_CATALOG_DIR = resolveCatalogPath("queries");

export function normalizeQueryId(rawId: string): string {
  return rawId.toLowerCase().replace(/^\/+|\/+$/g, "");
}

export function getQueryFilePath(queryId: string): string {
  const normalized = normalizeQueryId(queryId);
  return join(QUERY_CATALOG_DIR, `${normalized}.sql`);
}

export function readQueryFile(queryId: string): string {
  const filePath = getQueryFilePath(queryId);
  if (!existsSync(filePath)) {
    throw new Error(`Query not found: ${queryId} (${filePath})`);
  }
  return readFileSync(filePath, "utf8");
}

export function writeQueryFile(queryId: string, sqlContent: string, schema: string): string {
  const filePath = getQueryFilePath(queryId);
  const dir = dirname(filePath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const withSchemaComment = `-- schema:${schema}\n${sqlContent}`;
  writeFileSync(filePath, withSchemaComment, "utf8");
  return filePath;
}

export function extractSchemaFromQueryFile(queryId: string): string | null {
  const content = readQueryFile(queryId);
  const lines = content.split("\n");
  const firstLine = lines[0] || "";
  
  const match = firstLine.match(/--\s*schema:(\w+)/i);
  return match ? match[1] : null;
}
