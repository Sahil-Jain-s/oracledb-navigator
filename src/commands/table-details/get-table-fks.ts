
export const OUTGOING_FKS = 
`SELECT
    acc.column_name,
    r.table_name AS referenced_table,
    rcc.column_name AS referenced_column
FROM all_constraints c
JOIN all_cons_columns acc
    ON c.owner = acc.owner
   AND c.constraint_name = acc.constraint_name
JOIN all_constraints r
    ON c.r_owner = r.owner
   AND c.r_constraint_name = r.constraint_name
JOIN all_cons_columns rcc
    ON r.owner = rcc.owner
   AND r.constraint_name = rcc.constraint_name
   AND acc.position = rcc.position
WHERE c.constraint_type = 'R'
  AND c.owner = :schema
  AND c.table_name = :tableName
ORDER BY acc.position
`;

export const INCOMING_FKS = 
`SELECT
    child.table_name,
    child_cols.column_name,
    parent_cols.column_name AS referenced_column
FROM all_constraints child
JOIN all_constraints parent
    ON child.r_owner = parent.owner
   AND child.r_constraint_name = parent.constraint_name
JOIN all_cons_columns child_cols
    ON child.owner = child_cols.owner
   AND child.constraint_name = child_cols.constraint_name
JOIN all_cons_columns parent_cols
    ON parent.owner = parent_cols.owner
   AND parent.constraint_name = parent_cols.constraint_name
   AND child_cols.position = parent_cols.position
WHERE child.constraint_type = 'R'
  AND parent.owner = :schema
  AND parent.table_name = :tableName
ORDER BY child.table_name
`;

import oracledb from "oracledb";
import { getConnection, resolveSchemaOwner } from "../../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";

export async function getTableFKs(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-table-fks <connection> <tableName> [--format <fmt>] [--out <file>]",
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
    throw new Error("Missing required args: <connection> <tableName>. Run 'odb get-table-fks --help'");
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

    const [ incomingFks, outgoingFks] = await Promise.all([
      conn.execute(INCOMING_FKS, binds, opts),
      conn.execute(OUTGOING_FKS, binds, opts),
    ]);

    emitOutput({
      success: true,
      table: tableName,
      incomingFks: incomingFks.rows,
      outgoingFks: outgoingFks.rows,
    }, outFile, format);
  } finally {
    await conn.close();
  }
}
