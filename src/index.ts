import { ping } from "./commands/ping.js";
import { query } from "./commands/query.js";
import { getTableColumns } from "./commands/table-details/get-table-columns.js";
import { getTableFKs } from "./commands/table-details/get-table-fks.js";
import { getTableConstraints } from "./commands/table-details/get-table-constraints.js";
import { getTableIndexes } from "./commands/table-details/get-table-indexes.js";
import { getTableContext } from "./commands/table-details/get-table-context.js";
import { searchMetadata } from "./commands/search/search-metadata.js";
import { listTables } from "./commands/list-tables.js";
import { listConnections } from "./commands/list-connections.js";
import { getQueryPlan } from "./commands/get-query-plan.js";
import { saveKb } from "./commands/kb/save-kb.js";
import { getKb } from "./commands/kb/get-kb.js";
import { searchKbs } from "./commands/kb/search-kbs.js";
import { listKbs } from "./commands/kb/list-kbs.js";
import { validateKb } from "./commands/kb/validate-kb.js";
import { saveQuery } from "./commands/query-store/save-query.js";
import { getQuery } from "./commands/query-store/get-query.js";
import { runQuery } from "./commands/query-store/run-query.js";
import { printHelp } from "./commands/utils.js";
const [, , command, ...args] = process.argv;

const commands: Record<string, (args: string[]) => Promise<void>> = {
  ping,
  query,
  "get-table-columns": getTableColumns,
  "get-table-fks": getTableFKs,
  "get-table-constraints": getTableConstraints,
  "get-table-indexes": getTableIndexes,
  "get-table-context": getTableContext,
  search: searchMetadata,
  "list-tables": listTables,
  list: listTables,
  "list-connections": listConnections,
  "get-query-plan": getQueryPlan,
  "save-kb": saveKb,
  "get-kb": getKb,
  "search-kbs": searchKbs,
  "list-kbs": listKbs,
  "validate-kb": validateKb,
  "save-query": saveQuery,
  "get-query": getQuery,
  "run-query": runQuery,
};

const commandHelp: Array<{ name: string; summary: string }> = [
  { name: "ping", summary: "Test Oracle connectivity" },
  { name: "query", summary: "Run read-only SQL" },
  { name: "get-table-columns", summary: "Show table columns" },
  { name: "get-table-fks", summary: "Show table foreign keys" },
  { name: "get-table-constraints", summary: "Show table constraints" },
  { name: "get-table-indexes", summary: "Show table indexes" },
  { name: "get-table-context", summary: "Show table columns and FKs" },
  { name: "list-tables", summary: "List tables in schema(s)" },
  { name: "list-connections", summary: "List configured connection profiles" },
  { name: "list", summary: "Alias for list-tables (supports 'list tables ...')" },
  { name: "get-query-plan", summary: "Show execution plan for SQL" },
  { name: "search", summary: "Search table/column metadata" },
  { name: "save-kb", summary: "Save a Knowledge Base entry" },
  { name: "get-kb", summary: "Read a KB entry" },
  { name: "search-kbs", summary: "Search KB entries" },
  { name: "list-kbs", summary: "List all KB entries" },
  { name: "validate-kb", summary: "Validate a KB entry" },
  { name: "save-query", summary: "Store SQL file + KB metadata" },
  { name: "get-query", summary: "Read stored query file" },
  { name: "run-query", summary: "Execute stored query with binds" },
];

function showGlobalHelp(): void {
  const commandLines = commandHelp.map(
    (item) => `  ${item.name.padEnd(23)} ${item.summary}`
  );

  printHelp([
    "oracledb-navigator (odb) - Oracle schema navigation and knowledge base",
    "",
    "Usage:",
    "  odb <command> [args]",
    "",
    "Schemas:",
    "  Any configured connection profile. Use 'all' for commands that support it.",
    "",
    "Commands:",
    ...commandLines,
    "",
    "Help:",
    "  odb --help",
    "  odb <command> --help",
  ]);
}

async function main(): Promise<void> {
  if (!command || command === "--help" || command === "-h") {
    showGlobalHelp();
    return;
  }

  const handler = command ? commands[command] : undefined;

  if (!handler) {
    throw new Error(`Unknown command: ${command}. Run 'odb --help'`);
  }

  await handler(args);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      success: false,
      error: err.message,
    })
  );

  process.exit(1);
});
