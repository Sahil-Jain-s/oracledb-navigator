
export const COLUMNS_SQL= 
`SELECT
    column_name,
    data_type,
    nullable
FROM all_tab_columns
WHERE owner = :schema
  AND table_name = :tableName
ORDER BY column_id
`;

import oracledb from "oracledb";
import { getConnection, resolveSchemaOwner } from "../../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";

export async function getTableColumns(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-table-columns <connection> <tableName> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>            Connection profile name",
      "  <tableName>             Table name",
      "",
      "Options:",
      "  --format             json | yaml | yml | csv  (default: yaml)",
      "  --out                Output file path",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [schema, tableName] = positional;

  if (!schema || !tableName) {
    throw new Error("Missing required args: <connection> <tableName>. Run 'odb get-table-columns --help'");
  }

  const format = namedFormat ?? "yaml";
  const owner = resolveSchemaOwner(schema);

  const conn = await getConnection(schema);

  try {
    const binds = {
      schema: owner,
      tableName: tableName.toUpperCase()
    };
    const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const [columns] = await Promise.all([
      conn.execute(COLUMNS_SQL, binds, opts),
    ]);

    emitOutput({
      success: true,
      table: tableName,
      columns: columns.rows,
    }, outFile, format);
  } finally {
    await conn.close();
  }
}
