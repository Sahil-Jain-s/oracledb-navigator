import oracledb from "oracledb";
import {
  getConnection,
  resolveConnectionTargets,
  resolveSchemaOwner,
} from "../../connection.js";
import { emitOutput, hasHelpFlag, parseNamedArgs, printHelp } from "../utils.js";

const TABLE_SEARCH_SQL = `SELECT
    owner,
    table_name
FROM all_tables
WHERE owner = :owner
  AND UPPER(table_name) LIKE '%' || :searchTermUpper || '%'
ORDER BY table_name
`;

const COLUMN_SEARCH_SQL = `SELECT
    owner,
    table_name,
    column_name,
    data_type,
    nullable
FROM all_tab_columns
WHERE owner = :owner
  AND UPPER(column_name) LIKE '%' || :searchTermUpper || '%'
ORDER BY table_name, column_id
`;

const TABLE_SEARCH_REGEX_SQL = `SELECT
    owner,
    table_name
FROM all_tables
WHERE owner = :owner
  AND REGEXP_LIKE(table_name, :searchPattern, 'i')
ORDER BY table_name
`;

const COLUMN_SEARCH_REGEX_SQL = `SELECT
    owner,
    table_name,
    column_name,
    data_type,
    nullable
FROM all_tab_columns
WHERE owner = :owner
  AND REGEXP_LIKE(column_name, :searchPattern, 'i')
ORDER BY table_name, column_id
`;

function resolveSearchSql(entityType: "table" | "column", useRegex: boolean): string {
  if (entityType === "table") {
    return useRegex ? TABLE_SEARCH_REGEX_SQL : TABLE_SEARCH_SQL;
  }

  return useRegex ? COLUMN_SEARCH_REGEX_SQL : COLUMN_SEARCH_SQL;
}

export async function searchMetadata(args: string[]) {
  if (hasHelpFlag(args)) {
    printHelp([
      "Usage:",
      "  odb search <connection|all> <entityType> <searchTerm> [--regex] [--format <fmt>] [--out <file>]",
      "",
      "Args:",
      "  <connection|all>        Connection profile name, all, or both",
      "  <entityType>            table | column",
      "  <searchTerm>            Text or regex pattern",
      "",
      "Options:",
      "  --regex              Treat <searchTerm> as regex",
      "  --format             json | yaml | yml | csv  (default: yaml)",
      "  --out                Output file path",
      "",
      "Examples:",
      "  odb search app table customer",
      "  odb search app column created",
      "  odb search all table '^ORDER' --regex",
    ]);
    return;
  }

  const { positional: cleanedArgs, out: outFile, format: namedFormat, regex: useRegex } = parseNamedArgs(args);
  const [schemaArg, entityTypeArg, searchTerm] = cleanedArgs;

  if (!schemaArg || !entityTypeArg || !searchTerm) {
    throw new Error(
      "Missing required args: <connection|all> <entityType> <searchTerm>. Run 'odb search --help'"
    );
  }

  const entityType = entityTypeArg.toLowerCase();

  if (entityType !== "table" && entityType !== "column") {
    throw new Error("<entityType> must be one of: table, column");
  }

  const format = namedFormat ?? "yaml";
  const schemaTargets = resolveConnectionTargets(schemaArg);
  const sql = resolveSearchSql(entityType, useRegex);

  const results = await Promise.all(
    schemaTargets.map(async (schema) => {
      const owner = resolveSchemaOwner(schema);
      const conn = await getConnection(schema);

      try {
        const binds = useRegex
          ? { owner, searchPattern: searchTerm }
          : { owner, searchTermUpper: searchTerm.toUpperCase() };

        const result = await conn.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        return {
          schema,
          owner,
          rowCount: result.rows?.length ?? 0,
          rows: result.rows,
        };
      } finally {
        await conn.close();
      }
    })
  );

  emitOutput(
    {
      success: true,
      entityType,
      searchTerm,
      regex: useRegex,
      results,
    },
    outFile,
    format
  );
}
