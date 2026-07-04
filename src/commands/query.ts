import oracledb from "oracledb";
import { getConnection } from "../connection.js";
import {
  emitOutput,
  hasHelpFlag,
  parseNamedArgs,
  printHelp,
  validateReadOnlySql,
} from "./utils.js";

export async function query(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb query <connection> <sql> [--bind <json>] [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>            Connection profile name",
      "  <sql>                   Read-only SQL statement",
      "",
      "Options:",
      "  --bind               JSON object for bind values",
      "  --format             json | yaml | yml | csv  (default: json)",
      "  --out                Output file path",
      "",
      "Examples:",
      "  odb query app \"select * from dual\"",
      "  odb query app \"select * from CUSTOMER where ID=:id\" --bind '{\"id\":1}'",
      "  odb query app \"select * from dual\" --out result.yaml --format yaml",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat, bind: bindJson } = parseNamedArgs(args);
  const [schema, sql] = positional;

  if (!schema || !sql) {
    throw new Error("Missing required args: <connection> <sql>. Run 'odb query --help'");
  }

  const format = namedFormat ?? "json";
  const binds = bindJson ? JSON.parse(bindJson) : {};

  const conn = await getConnection(schema);
  validateReadOnlySql(sql);
  const cleanedSql = sql.trim().replace(/;$/, "");
  try {
    const result = await conn.execute(
      cleanedSql,
      binds,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    emitOutput({
      success: true,
      rowCount: result.rows?.length ?? 0,
      rows: result.rows
    }, outFile, format);
  } finally {
    await conn.close();
  }
}
