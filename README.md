# oracledb-navigator

Oracle schema navigation and knowledge base for humans and AI agents.

Large Oracle schemas are hard for humans and agents to navigate. Table names are dense, relationships are scattered across constraints, indexes, and tribal knowledge, and a simple "find the customer orders flow" can turn into a long trail through hundreds or thousands of objects.

`oracledb-navigator` gives you a small, scriptable CLI for exploring Oracle metadata, running guarded read-only SQL, saving reusable queries, and building a Markdown knowledge base that agents can read before they touch the database.

```bash
odb search app table customer
odb get-table-context app CUSTOMER ORDER_HEADER ORDER_LINE
odb query app "select * from CUSTOMER where rownum <= 10"
odb save-kb customer/orders kb/customer-orders.md
odb get-kb customer/orders
```

Most commands can write JSON, YAML, or CSV directly to files:

```bash
odb search app table customer --format yaml --out out/customer-tables.yaml
odb get-table-context app CUSTOMER ORDER_HEADER --format json --out out/customer-context.json
odb run-query customer/orders --schema app --format csv --out out/customer-orders.csv
```

## Why It Exists

Modern AI agents can help with database work, but they need reliable context. Raw schema metadata is useful, yet it rarely explains business meaning, safe join paths, known caveats, or which query has already been validated.

`odb` is built for that gap:

- search tables and columns across one or many Oracle connections
- describe tables with columns and foreign keys
- run small read-only SQL checks with a CLI guard against DML and DDL
- store known-good SQL snippets
- build and read a local Markdown knowledge base for repeatable agent workflows

It is not trying to replace SQL Developer, SQLcl, or your IDE. It is a focused navigation layer for large schemas, automation, and AI-assisted work.

## 60-Second Demo

Copy the shape of the workflow in a terminal:

```bash
# 1. Confirm the connection profile is visible
$ odb list-connections
{
  "success": true,
  "connections": [
    { "name": "app", "schema": "APP_OWNER" }
  ]
}

# 2. Search for likely customer tables
$ odb search app table customer
{
  "success": true,
  "connection": "app",
  "kind": "table",
  "term": "customer",
  "matches": [
    { "table_name": "CUSTOMER" },
    { "table_name": "CUSTOMER_ACCOUNT" }
  ]
}

# 3. Pull context for multiple related tables at once
$ odb get-table-context app CUSTOMER CUSTOMER_ACCOUNT ORDER_HEADER
{
  "success": true,
  "connection": "app",
  "schema": "APP_OWNER",
  "rowCount": 3,
  "tables": [
    { "table": "CUSTOMER", "found": true, "columns": [], "incomingFks": [], "outgoingFks": [] },
    { "table": "CUSTOMER_ACCOUNT", "found": true, "columns": [], "incomingFks": [], "outgoingFks": [] },
    { "table": "ORDER_HEADER", "found": true, "columns": [], "incomingFks": [], "outgoingFks": [] }
  ]
}

# 4. Save that context for an agent or code review
$ odb get-table-context app CUSTOMER CUSTOMER_ACCOUNT ORDER_HEADER --format yaml --out out/customer-orders-context.yaml

# 5. Run a safe read-only check
$ odb query app "select * from CUSTOMER where rownum <= 10"
{
  "success": true,
  "rowCount": 10,
  "rows": []
}

# 6. Save the discovered path as agent-readable knowledge
$ odb save-kb customer/orders kb/customer-orders.md
{
  "success": true,
  "id": "customer/orders"
}
```

## Install

For local development:

```bash
git clone https://github.com/sahiljain/oracledb-navigator.git
cd oracledb-navigator
npm install
npm run build
npm link
odb --help
```

> Package publishing is planned. Until then, install from the repository.

For a step-by-step setup guide, including user-level config and agent skill
installation, see [`skills/installation.md`](skills/installation.md).

## Configure One Connection

`odb` reads user-level config by default, so it works from any project directory after a global install or `npm link`.

Create the config directory:

```bash
mkdir -p ~/.config/oracledb-navigator
```

You can configure a connection in either one file or with a separate `.env` file for secrets.

### Option 1: One JSON File

For a quick local setup, put the connection details directly in `~/.config/oracledb-navigator/odb.config.json`:

```json
{
  "connections": {
    "app": {
      "user": "readonly_user",
      "password": "change-me",
      "connectString": "localhost:1521/FREEPDB1",
      "schema": "APP_OWNER"
    }
  }
}
```

This is the simplest setup, but keep this file private because it contains credentials.

### Option 2: JSON Plus `.env`

For shared or team setups, keep credentials in `~/.config/oracledb-navigator/.env` and reference them from `~/.config/oracledb-navigator/odb.config.json`.

Copy the examples:

```bash
cp .env.example ~/.config/oracledb-navigator/.env
cp odb.config.example.json ~/.config/oracledb-navigator/odb.config.json
```

Add credentials to `~/.config/oracledb-navigator/.env`:

```bash
APP_ORACLE_USER=readonly_user
APP_ORACLE_PASSWORD=change-me
APP_ORACLE_CONNECT_STRING=localhost:1521/FREEPDB1
```

Point a named connection at those environment variables in `~/.config/oracledb-navigator/odb.config.json`:

```json
{
  "connections": {
    "app": {
      "userEnv": "APP_ORACLE_USER",
      "passwordEnv": "APP_ORACLE_PASSWORD",
      "connectStringEnv": "APP_ORACLE_CONNECT_STRING",
      "schema": "APP_OWNER"
    }
  }
}
```

This keeps the connection structure readable while keeping secrets in a local `.env` file.

Test it:

```bash
odb ping app
odb list-connections
```

You can add as many connection profiles as you need:

```json
{
  "connections": {
    "app": {
      "userEnv": "APP_ORACLE_USER",
      "passwordEnv": "APP_ORACLE_PASSWORD",
      "connectStringEnv": "APP_ORACLE_CONNECT_STRING",
      "schema": "APP_OWNER"
    },
    "warehouse": {
      "userEnv": "WH_ORACLE_USER",
      "passwordEnv": "WH_ORACLE_PASSWORD",
      "connectStringEnv": "WH_ORACLE_CONNECT_STRING",
      "schema": "WH_OWNER"
    }
  }
}
```

Config lookup order:

- `ODB_CONFIG` and `ODB_ENV` when set
- `~/.config/oracledb-navigator/odb.config.json` and `~/.config/oracledb-navigator/.env`
- `~/.oracledb-navigator/odb.config.json` and `~/.oracledb-navigator/.env` for older/manual setups

For CI or one-file setups, define `ORACLEDB_NAVIGATOR_CONNECTIONS` as a JSON object whose keys are connection names.

Saved queries and KB entries are stored under `~/.config/oracledb-navigator/catalog` by default. Set `ODB_CATALOG` to use a project-local or team-managed catalog directory.

## Search Schema

Search table names:

```bash
odb search app table customer
```

Search column names:

```bash
odb search app column created
```

Use a regular expression:

```bash
odb search app column "created|updated" --regex
```

Search every configured connection:

```bash
odb search all table customer
```

Write results to a file:

```bash
odb search app table customer --format yaml --out out/customer-tables.yaml
```

List tables for a connection:

```bash
odb list-tables app
```

## Describe Tables

Inspect one table:

```bash
odb get-table-context app CUSTOMER
```

Fetch multiple table contexts in one call:

```bash
odb get-table-context app CUSTOMER CUSTOMER_ACCOUNT ORDER_HEADER
```

Save table context for later agent use:

```bash
odb get-table-context app CUSTOMER CUSTOMER_ACCOUNT ORDER_HEADER --format json --out out/customer-context.json
```

Use narrower commands when you only need one kind of metadata:

```bash
odb get-table-columns app CUSTOMER
odb get-table-fks app CUSTOMER
odb get-table-constraints app CUSTOMER
odb get-table-indexes app CUSTOMER
```

## Run Safe SQL

Run a small read-only query:

```bash
odb query app "select * from CUSTOMER where rownum <= 10"
```

Write query results to CSV:

```bash
odb query app "select * from CUSTOMER where rownum <= 10" --format csv --out out/customer-sample.csv
```

Preview an execution plan:

```bash
odb get-query-plan app "select * from CUSTOMER where rownum <= 10"
```

`odb query` validates that SQL starts with `SELECT` or `WITH`. DML and DDL statements such as `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `CREATE`, `ALTER`, `DROP`, and `TRUNCATE` are rejected by the CLI guard.

This is a safety layer, not a permissions model. Use read-only Oracle users whenever possible.

## Save And Run Queries

Store reusable SQL files in the local catalog:

```bash
odb save-query app queries/customer-orders.sql customer/orders
```

Read a stored query:

```bash
odb get-query customer/orders
```

Run a stored query with optional bind parameters:

```bash
odb run-query customer/orders --schema app --bind '{"customerId":123}'
```

`run-query` returns an execution envelope with `success`, `rows`, `elapsed_ms`, and `output_file` when output is written to disk.

```bash
odb run-query customer/orders --schema app --bind '{"customerId":123}' --format csv --out out/customer-orders.csv
```

## Build And Read KB

Knowledge base entries are Markdown files with YAML frontmatter. They are meant to capture business concepts, relationship paths, caveats, workflows, and known-good queries.

Example entry:

```md
---
name: customer-orders
description: How customer orders are modeled and queried
queries:
  - customer/orders
tables:
  - CUSTOMER
  - CUSTOMER_ACCOUNT
  - ORDER_HEADER
tags:
  - customer
  - orders
---

# Customer Orders

Customer orders are reached through customer accounts.

Do not join CUSTOMER directly to ORDER_HEADER. Use CUSTOMER_ACCOUNT as the bridge.
```

Save it:

```bash
odb save-kb customer/orders kb/customer-orders.md
```

Search KB entries:

```bash
odb search-kbs customer
```

Read one:

```bash
odb get-kb customer/orders
```

Validate the entry and referenced queries:

```bash
odb validate-kb customer/orders
```

Save KB output to a file:

```bash
odb get-kb customer/orders --format yaml --out out/customer-orders-kb.yaml
```

Recommended agent workflow:

1. Search KB entries first.
2. Read the most relevant KB entries.
3. Use referenced tables and saved queries as starting points.
4. Inspect raw schema metadata only where the KB is incomplete.
5. Run small read-only SQL checks with row limits and bind parameters.
6. Save new discoveries back into KB entries.

## Commands

### Database Exploration

| Command | Description |
| --- | --- |
| `ping` | Test database connectivity |
| `list-connections` | List configured connection profiles |
| `query` | Execute guarded read-only SQL |
| `search` | Search table or column metadata |
| `list-tables` | List tables for a connection profile |
| `get-table-columns` | Show table columns |
| `get-table-fks` | Show foreign key relationships |
| `get-table-constraints` | Show table constraints |
| `get-table-indexes` | Show table indexes |
| `get-table-context` | Show columns and FKs together |
| `get-query-plan` | Generate an execution plan for read-only SQL |

### Query Store

| Command | Description |
| --- | --- |
| `save-query` | Save a `.sql` file to the query catalog |
| `get-query` | Read a stored query |
| `run-query` | Execute a stored query with bind parameters |

### Knowledge Base

| Command | Description |
| --- | --- |
| `save-kb` | Save a KB Markdown file into the local catalog |
| `get-kb` | Read a KB entry |
| `search-kbs` | Search KB entries by metadata or content |
| `list-kbs` | List KB entries |
| `validate-kb` | Validate KB frontmatter and query references |

## Output Files

Commands that print structured output support:

```bash
--format json|yaml|yml|csv
--out path/to/file
```

`odb` creates parent directories for output files automatically. When `--out` is provided, the command writes the full payload to the file and prints a short confirmation to stderr.

## Agent Skills

The repository includes two bundled agent skills under `skills/`:

- [`use-odb`](skills/use-odb/SKILL.md): direct `odb` usage for schema search, metadata lookup, guarded read-only SQL, saved queries, and file output.
- [`use-odb-kb`](skills/use-odb-kb/SKILL.md): KB-first database workflows for documented business context, known join paths, saved query usage, and safe follow-up checks.

These are intentionally plain Markdown so teams can adapt them for their own agent setup.

Install one or both skills from the repository root with the `npx skills`
installer:

```bash
npx skills install ./skills/use-odb
npx skills install ./skills/use-odb-kb
```

If you are setting up `oracledb-navigator` for another user or preparing a
workspace for agents, follow [`skills/installation.md`](skills/installation.md).
That file covers package installation, config creation, connection testing, and
the skill installation flow.

## Status

Early prototype. The current version is Oracle-only and focused on read-only exploration workflows.

The public API and configuration format may change before `1.0.0`.

## Development

```bash
npm install
npm run build
npm test
npm link
odb --help
```

Project layout:

```text
bin/                 CLI entry point
src/                 TypeScript source
src/commands/        Command handlers
skills/              Agent workflow instructions
tests/               Unit tests
```

## Roadmap

- npm package publishing
- public example catalog with synthetic schema examples
- MCP server adapter for direct agent integration
- stronger SQL parsing and configurable safety policy
- richer KB validation against live schema metadata

## License

MIT
