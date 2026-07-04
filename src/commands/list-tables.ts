import oracledb from "oracledb";
import { getConnection, resolveSchemaOwner } from "../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "./utils.js";

const LIST_TABLES_SQL_WITH_OWNER = `SELECT
  owner,
  table_name
FROM all_tables
WHERE owner = :owner
ORDER BY table_name
`;

const LIST_TABLES_SQL = `SELECT
  table_name
FROM all_tables
WHERE owner = :owner
ORDER BY table_name
`;

export async function listTables(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb list-tables <connection> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>            Connection profile name",
      "",
      "Options:",
      "  --format             json | yaml | yml | csv  (default: yaml)",
      "  --out                Output file path",
      "",
      "Examples:",
      "  odb list-tables app",
      "  odb list-tables app --out out/tables.yaml --format yaml",
    ]);
    return;
  }

  const { positional: normalizedArgs, out: outFile, format: namedFormat } = parseNamedArgs(
    args[0]?.toLowerCase() === "tables" ? args.slice(1) : args
  );
  const [schemaArg] = normalizedArgs;

  if (!schemaArg) {
    throw new Error("Missing required args: <connection>. Run 'odb list-tables --help'");
  }

  if (schemaArg.toLowerCase() === "both") {
    throw new Error("'both' is not supported for list-tables. Use a single connection profile.");
  }

  const format = namedFormat ?? "yaml";
  const owner = resolveSchemaOwner(schemaArg);
  const conn = await getConnection(schemaArg);

  let result;
  try {
    result = await conn.execute(LIST_TABLES_SQL, { owner }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
  } finally {
    await conn.close();
  }

  const results = [
    {
      schema: schemaArg,
      owner,
      rowCount: result.rows?.length ?? 0,
      rows: result.rows,
    },
  ];

  emitOutput(
    {
      success: true,
      results,
    },
    outFile,
    format
  );
}
