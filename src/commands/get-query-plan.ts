import oracledb from "oracledb";
import { getConnection } from "../connection.js";
import {
  emitOutput,
  hasHelpFlag,
  parseNamedArgs,
  printHelp,
  validateReadOnlySql,
} from "./utils.js";

const PLAN_DISPLAY_SQL = `SELECT plan_table_output
FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC +PREDICATE +ALIAS +NOTE'))
`;

export async function getQueryPlan(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb get-query-plan <connection> <sql> [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection>            Connection profile name",
      "  <sql>                   Read-only SQL statement",
      "",
      "Options:",
      "  --format             json | yaml | yml | csv  (default: yaml)",
      "  --out                Output file path",
      "",
      "Examples:",
      "  odb get-query-plan app \"select * from CUSTOMER where rownum <= 10\"",
      "  odb get-query-plan app \"select * from ORDER_HEADER\" --out plan.yaml --format yaml",
    ]);
    return;
  }

  const { positional, out: outFile, format: namedFormat } = parseNamedArgs(args);
  const [schema, sql] = positional;

  if (!schema || !sql) {
    throw new Error(
      "Missing required args: <connection> <sql>. Run 'odb get-query-plan --help'"
    );
  }

  const format = namedFormat ?? "yaml";
  validateReadOnlySql(sql);

  const cleanedSql = sql.trim().replace(/;$/, "");
  const conn = await getConnection(schema);

  try {
    await conn.execute(`EXPLAIN PLAN FOR ${cleanedSql}`);

    const planResult = await conn.execute(PLAN_DISPLAY_SQL, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const planLines = (planResult.rows ?? [])
      .map((row: unknown) =>
        (row as { PLAN_TABLE_OUTPUT?: string }).PLAN_TABLE_OUTPUT ?? ""
      )
      .filter((line: string) => line.length > 0);

    emitOutput(
      {
        success: true,
        rowCount: planLines.length,
        planLines,
      },
      outFile,
      format
    );
  } finally {
    await conn.close();
  }
}
