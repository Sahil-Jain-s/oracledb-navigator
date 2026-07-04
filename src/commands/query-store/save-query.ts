import { existsSync, readFileSync } from "node:fs";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import {
  normalizeQueryId,
  writeQueryFile,
} from "./query-store-utils.js";

export async function saveQuery(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb save-query <connection> <sqlFile> <idOrPath> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>     Connection profile name",
      "  <sqlFile>        Path to .sql file to copy",
      "  <idOrPath>       Query id/path (example: customer/active-orders)",
      "",
      "Options:",
      "  --format         json | yaml | yml | csv  (default: json)",
      "  --out            Output file path",
      "",
      "Example:",
      "  odb save-query app queries/active.sql customer/active-orders",
      "  odb save-query warehouse orders.sql orders/by-date",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [schema, sqlFile, rawId] = positional;

  if (!schema || !sqlFile || !rawId) {
    throw new Error(
      "Missing required args: <connection> <sqlFile> <idOrPath>. Run 'odb save-query --help'"
    );
  }

  if (!existsSync(sqlFile)) {
    throw new Error(`SQL file not found: ${sqlFile}`);
  }

  const format = namedFormat ?? "json";
  const sqlContent = readFileSync(sqlFile, "utf8");
  const queryId = normalizeQueryId(rawId);

  const filePath = writeQueryFile(queryId, sqlContent, schema);

  emitOutput(
    {
      success: true,
      id: queryId,
      schema,
      saved: filePath,
    },
    outFile,
    format
  );
}
