import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import { stringify as toYaml } from "yaml";

type OutputFormat = "json" | "yaml" | "csv";

function hasHelpFlag(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

function printHelp(lines: string[]): void {
  console.log(lines.join("\n"));
}

function normalizeOutputFormat(value: string): OutputFormat | undefined {
  const lower = value.toLowerCase();

  if (lower === "json") {
    return "json";
  }

  if (lower === "yaml" || lower === "yml") {
    return "yaml";
  }

  if (lower === "csv") {
    return "csv";
  }

  return undefined;
}

interface ParsedNamedArgs {
  positional: string[];
  out?: string;
  format?: OutputFormat;
  bind?: string;
  meta?: string;
  schema?: string;
  regex: boolean;
}

function parseNamedArgs(args: string[]): ParsedNamedArgs {
  const positional: string[] = [];
  let out: string | undefined;
  let format: OutputFormat | undefined;
  let bind: string | undefined;
  let meta: string | undefined;
  let schema: string | undefined;
  let regex = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--out" || arg === "-o") && i + 1 < args.length) {
      out = args[++i];
    } else if ((arg === "--format" || arg === "-f") && i + 1 < args.length) {
      const f = normalizeOutputFormat(args[++i]);
      if (!f) throw new Error("--format / -f must be one of: json, yaml, yml, csv");
      format = f;
    } else if (arg === "--bind" && i + 1 < args.length) {
      bind = args[++i];
    } else if (arg === "--meta" && i + 1 < args.length) {
      meta = args[++i];
    } else if (arg === "--schema" && i + 1 < args.length) {
      schema = args[++i];
    } else if (arg === "--regex") {
      regex = true;
    } else {
      positional.push(arg);
    }
  }

  return { positional, out, format, bind, meta, schema, regex };
}

function toCsv(payload: unknown): string {
  const rows = extractRowsForCsv(payload);

  if (rows.length === 0) {
    return "";
  }

  const headers = rows.reduce<string[]>((acc, row) => {
    for (const key of Object.keys(row)) {
      if (!acc.includes(key)) {
        acc.push(key);
      }
    }

    return acc;
  }, []);

  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((header) => escapeCsvValue(row[header]))
      .join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

function extractRowsForCsv(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map(wrapRow);
  }

  if (!payload || typeof payload !== "object") {
    return [wrapRow(payload)];
  }

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.rows)) {
    return obj.rows.map(wrapRow);
  }

  if (Array.isArray(obj.columns)) {
    return obj.columns.map(wrapRow);
  }

  return [obj];
}

function wrapRow(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return { value };
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);

  if (!/[",\n\r]/.test(raw)) {
    return raw;
  }

  return `"${raw.replace(/"/g, '""')}"`;
}

function stripLeadingSqlNoise(sql: string): string {
  let remaining = sql.trimStart();

  while (remaining.startsWith("--") || remaining.startsWith("/*")) {
    if (remaining.startsWith("--")) {
      const newlineIndex = remaining.indexOf("\n");
      remaining = newlineIndex === -1 ? "" : remaining.slice(newlineIndex + 1);
    } else {
      const commentEnd = remaining.indexOf("*/");
      remaining = commentEnd === -1 ? "" : remaining.slice(commentEnd + 2);
    }

    remaining = remaining.trimStart();
  }

  return remaining;
}

function validateReadOnlySql(sql: string): void {
  const normalized = stripLeadingSqlNoise(sql).toLowerCase();
  const leadingKeyword = normalized.match(/^([a-z_]+)/)?.[1];

  if (!leadingKeyword) {
    return;
  }

  if (leadingKeyword === "select" || leadingKeyword === "with") {
    return;
  }

  throw new Error(
    `Read-only mode: '${leadingKeyword}' statements are not allowed`
  );
}

function emitJsonOutput(payload: unknown, outFile?: string): void {
  emitOutput(payload, outFile, "json");
}

function emitOutput(
  payload: unknown,
  outFile?: string,
  format: OutputFormat = "json"
): void {
  const output =
    format === "yaml"
      ? toYaml(payload)
      : format === "csv"
      ? toCsv(payload)
      : JSON.stringify(payload);

  if (outFile) {
    const outDir = dirname(outFile);
    if (outDir !== ".") {
      mkdirSync(outDir, { recursive: true });
    }

    writeFileSync(outFile, output, "utf8");
    console.error(`Wrote output to ${outFile}`);
    return;
  }

  console.log(output);
}

export {
  validateReadOnlySql,
  emitJsonOutput,
  emitOutput,
  parseNamedArgs,
  ParsedNamedArgs,
  OutputFormat,
  hasHelpFlag,
  printHelp
};
