import { existsSync, readFileSync } from "node:fs";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import { validateFrontmatter, parseFrontmatter, writeKb, readKb, normalizeKbId, rebuildKbIndex, getDateStamp } from "./kb-utils.js";

export async function saveKb(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb save-kb <idPath> <markdownFile> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <idPath>         KB id/path (example: customer/orders)",
      "  <markdownFile>   Path to a Markdown file with YAML frontmatter",
      "",
      "Options:",
      "  --format         json | yaml | yml | csv  (default: json)",
      "  --out            Output file path",
      "",
      "Example:",
      "  odb save-kb customer/orders kb/customer-orders.md",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [rawId, markdownFile] = positional;

  if (!rawId || !markdownFile) {
    throw new Error("Missing required args: <idPath> <markdownFile>. Run 'odb save-kb --help'");
  }

  if (!existsSync(markdownFile)) {
    throw new Error(`Markdown file not found: ${markdownFile}`);
  }

  const format = namedFormat ?? "json";
  const raw = readFileSync(markdownFile, "utf8");
  const { frontmatter, content } = parseFrontmatter(raw);

  const errors = validateFrontmatter(frontmatter);
  if (errors.length > 0) {
    throw new Error(`KB validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  const kbId = normalizeKbId(rawId);
  const now = getDateStamp();

  let createdAt = now;
  try {
    const existing = readKb(kbId);
    createdAt = existing.createdAt;
  } catch {
    // new KB
  }

  const action = (() => {
    try { readKb(kbId); return "updated"; } catch { return "created"; }
  })();

  const filePath = writeKb(kbId, frontmatter, content, createdAt, now);
  const index = rebuildKbIndex();

  emitOutput(
    {
      success: true,
      action,
      id: kbId,
      filePath,
      name: frontmatter.name,
      tables: frontmatter.tables,
      queries: frontmatter.queries,
      tags: frontmatter.tags,
      indexCount: index.count,
    },
    outFile,
    format
  );
}
