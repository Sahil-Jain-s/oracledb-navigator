import { existsSync } from "node:fs";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import { KB_REQUIRED_FIELDS } from "./kb-types.js";
import { normalizeKbId, parseFrontmatter, readKb, getKbFilePath } from "./kb-utils.js";
import { getQueryFilePath } from "../query-store/query-store-utils.js";

export async function validateKb(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb validate-kb <idOrPath> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <idOrPath>    KB id/path",
      "",
      "Options:",
      "  --format      json | yaml | yml | csv  (default: json)",
      "  --out         Output file path",
      "",
      "Checks:",
      "  - Required metadata fields present",
      "  - Referenced queries exist in catalog",
      "  - Markdown parses successfully",
      "",
      "Example:",
      "  odb validate-kb customer/orders",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [rawId] = positional;

  if (!rawId) {
    throw new Error("Missing required arg: <idOrPath>. Run 'odb validate-kb --help'");
  }

  const format = namedFormat ?? "json";
  const kbId = normalizeKbId(rawId);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file exists
  const filePath = getKbFilePath(kbId);
  if (!existsSync(filePath)) {
    throw new Error(`KB not found: ${kbId}`);
  }

  // Parse and validate frontmatter
  let kb: ReturnType<typeof readKb> | undefined;
  try {
    kb = readKb(kbId);
  } catch (err) {
    errors.push(`Failed to parse KB: ${(err as Error).message}`);
    emitOutput({ success: false, id: kbId, errors, warnings }, outFile, format);
    return;
  }

  // Required fields
  for (const field of KB_REQUIRED_FIELDS) {
    const value = kb[field as keyof typeof kb];
    if (value === undefined || value === null || value === "") {
      errors.push(`Missing required field: ${field}`);
    } else if ((field === "queries" || field === "tables" || field === "tags") && !Array.isArray(value)) {
      errors.push(`Field '${field}' must be an array`);
    }
  }

  // Content present
  if (!kb.content || kb.content.trim().length === 0) {
    warnings.push("KB has no markdown content body");
  }

  // Referenced queries exist in catalog
  if (Array.isArray(kb.queries)) {
   
    for (const queryRef of kb.queries) {
      const queryFilePath = getQueryFilePath(queryRef);
      if (!existsSync(queryFilePath) ) {
        warnings.push(`Referenced query not found in catalog: ${queryRef}`);
      }
    }
  }

  const success = errors.length === 0;

  emitOutput({ success, id: kbId, errors, warnings }, outFile, format);

  if (!success) {
    process.exitCode = 1;
  }
}
