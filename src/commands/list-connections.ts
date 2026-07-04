import { configHelpText, connections } from "../env.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "./utils.js";

export async function listConnections(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb list-connections [--format <fmt>] [--out <file>]",
      "",
      "Options:",
      "  --format             json | yaml | yml | csv  (default: yaml)",
      "  --out                Output file path",
    ]);
    return;
  }

  const { out: outFile, format: namedFormat } = parseNamedArgs(args);
  const format = namedFormat ?? "yaml";

  const rows = Object.entries(connections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, cfg]) => ({
      name,
      schema: cfg.schemaName,
      user: cfg.user,
      connectString: cfg.connectString,
    }));

  emitOutput(
    {
      success: true,
      rowCount: rows.length,
      rows,
      ...(rows.length === 0 ? { message: configHelpText() } : {}),
    },
    outFile,
    format
  );
}
