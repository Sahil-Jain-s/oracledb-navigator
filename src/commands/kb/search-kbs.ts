import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import { KbIndexEntry } from "./kb-types.js";
import { loadKbIndex } from "./kb-utils.js";

function toHaystack(entry: KbIndexEntry): string[] {
  return [
    entry.id,
    entry.name,
    entry.description,
    ...(entry.tags ?? []),
    ...(entry.tables ?? []),
    ...(entry.queries ?? []),
  ];
}

export async function searchKbs(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb search-kbs <term> [--regex] [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <term>               Search text or regex pattern",
      "",
      "Options:",
      "  --regex              Treat term as case-insensitive regex",
      "  --format             json | yaml | yml | csv  (default: json)",
      "  --out                Output file path",
      "",
      "Examples:",
      "  odb search-kbs customer",
      "  odb search-kbs 'customer|orders' --regex",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat, regex: regexFlag } = parseNamedArgs(args);
  const [term] = positional;

  if (!term) {
    throw new Error("Missing required arg: <term>. Run 'odb search-kbs --help'");
  }

  const format = namedFormat ?? "json";
  const index = loadKbIndex();

  const matcher = regexFlag
    ? new RegExp(term, "i")
    : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const entries = index.entries.filter((entry) =>
    toHaystack(entry).some((field) => matcher.test(field))
  );

  emitOutput(
    {
      success: true,
      term,
      regex: regexFlag,
      rowCount: entries.length,
      entries,
    },
    outFile,
    format
  );
}
