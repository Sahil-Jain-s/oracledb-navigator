import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import { loadKbIndex } from "./kb-utils.js";

export async function listKbs(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb list-kbs [--format <fmt>] [--out <file>]",
      "",
      "Options:",
      "  --format             json | yaml | yml | csv  (default: json)",
      "  --out                Output file path",
      "",
      "Example:",
      "  odb list-kbs --format yaml",
    ]);
    return;
  }

  const { out: outFile, format: namedFormat } = parseNamedArgs(args);
  const format = namedFormat ?? "json";
  const index = loadKbIndex();

  const entries = index.entries.map(({ id, name, description, tags }) => ({
    id,
    name,
    description,
    tags,
  }));

  emitOutput(
    {
      success: true,
      generatedAt: index.generatedAt,
      rowCount: index.count,
      entries,
    },
    outFile,
    format
  );
}
