import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { resolveCatalogPath } from "../../path-utils.js";
import { KbFile, KbFrontmatter, KbIndexEntry, KbSearchIndex, KB_REQUIRED_FIELDS } from "./kb-types.js";

const KB_DIR = resolveCatalogPath("kb");
const KB_INDEX_FILE = path.join(KB_DIR, ".search-index.json");

function ensureKbDir(): void {
  if (!existsSync(KB_DIR)) {
    mkdirSync(KB_DIR, { recursive: true });
  }
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeKbId(id: string): string {
  const normalized = id.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    throw new Error("KB id cannot be empty");
  }

  if (normalized.includes("..")) {
    throw new Error("KB id cannot contain '..'");
  }

  return normalized;
}

function getKbFilePath(kbId: string): string {
  return path.join(KB_DIR, `${normalizeKbId(kbId)}.md`);
}

function getKbIdFromFilePath(filePath: string): string {
  const rel = path.relative(KB_DIR, filePath);
  return rel.replace(/\\/g, "/").replace(/\.md$/i, "");
}

function parseFrontmatter(raw: string): { frontmatter: KbFrontmatter; content: string } {
  const fencePattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = fencePattern.exec(raw.trim());

  if (!match) {
    throw new Error("KB file must start with YAML frontmatter (--- ... ---)");
  }

  const frontmatter = parseYaml(match[1]) as KbFrontmatter;
  const content = match[2].trim();

  return { frontmatter, content };
}

function validateFrontmatter(frontmatter: KbFrontmatter): string[] {
  const errors: string[] = [];

  for (const field of KB_REQUIRED_FIELDS) {
    const value = frontmatter[field];

    if (value === undefined || value === null || value === "") {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (field === "queries" || field === "tables" || field === "tags") {
      if (!Array.isArray(value)) {
        errors.push(`Field '${field}' must be an array`);
      }
    }
  }

  return errors;
}

function listKbFiles(dirPath: string = KB_DIR): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const results: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const nextPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...listKbFiles(nextPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(nextPath);
    }
  }

  return results;
}

function readKb(kbId: string): KbFile {
  const filePath = getKbFilePath(kbId);

  if (!existsSync(filePath)) {
    throw new Error(`KB not found: ${normalizeKbId(kbId)}`);
  }

  const raw = readFileSync(filePath, "utf8");
  return parseKbFile(raw);
}

function parseKbFile(raw: string): KbFile {
  const { frontmatter, content } = parseFrontmatter(raw);

  return {
    name: frontmatter.name ?? "",
    description: frontmatter.description ?? "",
    queries: frontmatter.queries ?? [],
    tables: frontmatter.tables ?? [],
    tags: frontmatter.tags ?? [],
    content,
    createdAt: (frontmatter as unknown as Record<string, string>).createdAt ?? getDateStamp(),
    updatedAt: (frontmatter as unknown as Record<string, string>).updatedAt ?? getDateStamp(),
  };
}

function writeKb(kbId: string, frontmatter: KbFrontmatter, content: string, createdAt: string, updatedAt: string): string {
  ensureKbDir();

  const filePath = getKbFilePath(kbId);
  mkdirSync(path.dirname(filePath), { recursive: true });

  const fm = {
    name: frontmatter.name,
    description: frontmatter.description,
    queries: frontmatter.queries,
    tables: frontmatter.tables,
    tags: frontmatter.tags,
    createdAt,
    updatedAt,
  };

  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "", content, "");

  writeFileSync(filePath, lines.join("\n"), "utf8");

  return filePath;
}

function toKbIndexEntry(filePath: string, kb: KbFile): KbIndexEntry {
  return {
    id: getKbIdFromFilePath(filePath),
    filePath: path.relative(KB_DIR, filePath).replace(/\\/g, "/"),
    name: kb.name,
    description: kb.description,
    tags: kb.tags,
    tables: kb.tables,
    queries: kb.queries,
    updatedAt: kb.updatedAt,
  };
}

function rebuildKbIndex(): KbSearchIndex {
  ensureKbDir();

  const files = listKbFiles();
  const entries = files
    .map((filePath) => {
      const raw = readFileSync(filePath, "utf8");
      const kb = parseKbFile(raw);
      return toKbIndexEntry(filePath, kb);
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const index: KbSearchIndex = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };

  writeFileSync(KB_INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  return index;
}

function loadKbIndex(): KbSearchIndex {
  if (!existsSync(KB_INDEX_FILE)) {
    return rebuildKbIndex();
  }

  return JSON.parse(readFileSync(KB_INDEX_FILE, "utf8")) as KbSearchIndex;
}

export {
  KB_DIR,
  KB_INDEX_FILE,
  ensureKbDir,
  getDateStamp,
  getKbFilePath,
  getKbIdFromFilePath,
  listKbFiles,
  loadKbIndex,
  normalizeKbId,
  parseFrontmatter,
  parseKbFile,
  readKb,
  rebuildKbIndex,
  validateFrontmatter,
  writeKb,
};
