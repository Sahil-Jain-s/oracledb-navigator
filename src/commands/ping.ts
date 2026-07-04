import { getConnection } from "../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "./utils.js";

export async function ping(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb ping <connection> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>    Connection profile name",
      "",
      "Options:",
      "  --format        json | yaml | yml | csv  (default: json)",
      "  --out           Output file path",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [schema] = positional;

  if (!schema) {
    throw new Error("Missing required arg: <connection>. Run 'odb ping --help'");
  }

  const format = namedFormat ?? "json";

  const conn = await getConnection(schema);

  try {
    const result = await conn.execute(
      "select sysdate from dual"
    );

    emitOutput(
      {
        success: true,
        schema,
        rows: result.rows
      },
      outFile,
      format
    );
  } finally {
    await conn.close();
  }
}
