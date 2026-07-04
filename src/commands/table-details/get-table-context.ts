// table columns and foreign key context

import { COLUMNS_SQL } from "./get-table-columns.js";
import { INCOMING_FKS, OUTGOING_FKS } from "./get-table-fks.js";



// @ts-ignore
import oracledb from "oracledb";
import { getConnection, resolveSchemaOwner } from "../../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";

export async function getTableContext(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-table-context <connection> <tableName...> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>            Connection profile name",
      "  <tableName...>          One or more table names",
      "",
      "Options:",
      "  --format             json | yaml | yml | csv  (default: yaml)",
      "  --out                Output file path",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [schema, ...tableNames] = positional;

  if (!schema || tableNames.length === 0) {
    throw new Error("Missing required args: <connection> <tableName...>. Run 'odb get-table-context --help'");
  }

  const format = namedFormat ?? "yaml";
  const owner = resolveSchemaOwner(schema);

  const conn = await getConnection(schema);

  try {
    const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const tables = await Promise.all(
      tableNames.map(async (tableName) => {
        const binds = {
          schema: owner,
          tableName: tableName.toUpperCase(),
        };

        const columns = await conn.execute(COLUMNS_SQL, binds, opts);
        const found = Array.isArray(columns.rows) && columns.rows.length > 0;

        if (!found) {
          return {
            table: tableName,
            found,
            columns: [],
            incomingFks: [],
            outgoingFks: [],
          };
        }

        const [incomingFks, outgoingFks] = await Promise.all([
          conn.execute(INCOMING_FKS, binds, opts),
          conn.execute(OUTGOING_FKS, binds, opts),
        ]);

        return {
          table: tableName,
          found,
          columns: columns.rows,
          incomingFks: incomingFks.rows,
          outgoingFks: outgoingFks.rows,
        };
      })
    );

    const output =
      tables.length === 1
        ? {
            success: true,
            ...tables[0],
          }
        : {
            success: true,
            connection: schema,
            schema: owner,
            rowCount: tables.length,
            tables,
          };

    emitOutput(output, outFile, format);
  } finally {
    await conn.close();
  }
}
