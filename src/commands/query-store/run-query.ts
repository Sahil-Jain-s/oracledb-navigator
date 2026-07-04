import { getConnection } from "../../connection.js";
import {
  emitOutput,
  hasHelpFlag,
  parseNamedArgs,
  printHelp,
  validateReadOnlySql,
} from "../utils.js";
import { normalizeQueryId, readQueryFile, extractSchemaFromQueryFile } from "./query-store-utils.js";

export async function runQuery(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb run-query <idOrPath> [--schema <connection>] [--bind <json>] [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <idOrPath>           Query id/path",
      "",
      "Options:",
      "  --schema             Connection profile override; uses file default if not specified",
      "  --bind               JSON object for bind values",
      "  --format             json | yaml | csv  (default: json)",
      "  --out                Output file path",
      "",
      "Example:",
      "  odb run-query customer/active-orders",
      "  odb run-query orders/by-date --bind '{\"startDate\":\"2025-01-01\"}' --format csv",
    ]);
    return;
  }

  const { positional, schema: schemaOverride, bind: bindJson, format: namedFormat, out: outFile } =
    parseNamedArgs(args);
  const [rawId] = positional;

  if (!rawId) {
    throw new Error("Missing required arg: <idOrPath>. Run 'odb run-query --help'");
  }

  const queryId = normalizeQueryId(rawId);
  const sql = readQueryFile(queryId);
  const fileSchema = extractSchemaFromQueryFile(queryId);
  const schema = schemaOverride || fileSchema;

  if (!schema) {
    throw new Error(
      `No connection specified. Add '-- schema:app' to query file or use --schema option`
    );
  }

  validateReadOnlySql(sql);

  const format = namedFormat ?? "json";
  const binds = bindJson ? JSON.parse(bindJson) : {};

  const connection = await getConnection(schema);
  try {
    const startedAt = performance.now();
    const result = await connection.execute(sql, binds);
    const elapsedMs = Math.round(performance.now() - startedAt);

    emitOutput(
      {
        success: true,
        rowCount: result.rows?.length ?? 0,
        rows: result.rows ?? [],
        elapsed_ms: elapsedMs,
        output_file: outFile,
      },
      outFile,
      format
    );
  } finally {
    await connection.close();
  }
}
