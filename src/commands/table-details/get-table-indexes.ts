
export const INDEXES_SQL= 
`SELECT
    ic.index_name,
    ic.column_position,
    ic.column_name,
    i.uniqueness,
    i.index_type
FROM all_ind_columns ic
JOIN all_indexes i
    ON ic.index_owner = i.owner
   AND ic.index_name = i.index_name
WHERE ic.table_owner = :schema
  AND ic.table_name = :tableName
ORDER BY ic.index_name, ic.column_position
`;

import oracledb from "oracledb";
import { getConnection, resolveSchemaOwner } from "../../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";

export async function getTableIndexes(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-table-indexes <connection> <tableName> [--format <fmt>] [--out <file>]",
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
    throw new Error("Missing required args: <connection> <tableName>. Run 'odb get-table-indexes --help'");
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

    const [indexes] = await Promise.all([
      conn.execute(INDEXES_SQL, binds, opts),
    ]);

    emitOutput({
      success: true,
      table: tableName,
      indexes: indexes.rows,
    }, outFile, format);
  } finally {
    await conn.close();
  }
}
