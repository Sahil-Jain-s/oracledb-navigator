import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import { normalizeQueryId, readQueryFile, extractSchemaFromQueryFile } from "./query-store-utils.js";

export async function getQuery(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-query <idOrPath> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <idOrPath>           Query id/path",
      "",
      "Options:",
      "  --format             json | yaml | yml  (default: json)",
      "  --out                Output file path",
      "",
      "Example:",
      "  odb get-query customer/active-orders",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [rawId] = positional;

  if (!rawId) {
    throw new Error("Missing required arg: <idOrPath>. Run 'odb get-query --help'");
  }

  const format = namedFormat ?? "json";
  const queryId = normalizeQueryId(rawId);
  const sqlContent = readQueryFile(queryId);
  const schema = extractSchemaFromQueryFile(queryId);

  emitOutput(
    {
      id: queryId,
      schema: schema || "unknown",
      sql: sqlContent,
    },
    outFile,
    format
  );
}
