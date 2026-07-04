
export const CONSTRAINTS_SQL= 
`SELECT
    c.constraint_name,
    c.constraint_type,
    cc.column_name,
    cc.position,
    c.search_condition,
    c.status
FROM all_constraints c
LEFT JOIN all_cons_columns cc
    ON c.owner = cc.owner
   AND c.constraint_name = cc.constraint_name
WHERE c.owner = :schema
  AND c.table_name = :tableName
  AND c.constraint_type IN ('P', 'U', 'C')
ORDER BY c.constraint_name, cc.position
`;

import oracledb from "oracledb";
import { getConnection, resolveSchemaOwner } from "../../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";

export async function getTableConstraints(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-table-constraints <connection> <tableName> [--format <fmt>] [--out <file>]",
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
    throw new Error("Missing required args: <connection> <tableName>. Run 'odb get-table-constraints --help'");
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
      conn.execute(CONSTRAINTS_SQL, binds, opts),
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
