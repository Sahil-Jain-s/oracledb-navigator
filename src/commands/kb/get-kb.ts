import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";
import { normalizeKbId, readKb } from "./kb-utils.js";

export async function getKb(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-kb <idOrPath> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <idOrPath>           KB id/path",
      "",
      "Options:",
      "  --format             json | yaml | yml  (default: json)",
      "  --out                Output file path",
      "",
      "Example:",
      "  odb get-kb customer/orders",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [rawId] = positional;

  if (!rawId) {
    throw new Error("Missing required arg: <idOrPath>. Run 'odb get-kb --help'");
  }

  const kbId = normalizeKbId(rawId);
  const format = namedFormat ?? "json";
  const kb = readKb(kbId);

  emitOutput({ id: kbId, ...kb }, outFile, format);
}
