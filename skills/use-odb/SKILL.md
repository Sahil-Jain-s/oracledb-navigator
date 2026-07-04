---
name: use-odb
description: Use oracledb-navigator's odb command for Oracle database navigation, metadata lookup, safe read-only SQL, saved queries, file output, and command-level troubleshooting. Use when an agent needs to run odb commands, inspect configured connections, search tables or columns, describe tables, fetch query plans, run SELECT/WITH SQL, manage saved queries, or save command output for later analysis.
---

# Use ODB

Use `odb` as the low-level interface to Oracle metadata and guarded read-only SQL.

## Command Rules

- Always name the connection explicitly.
- Prefer `--format yaml` for human review and `--format json` for machine reuse.
- Use `--out <file>` for large results or durable context.
- Keep exploration queries small with `rownum <= N`, `fetch first N rows only`, or selective filters.
- Use bind values for user input: `--bind '{"id":123}'`.
- Treat CLI read-only validation as a guard, not a permission model. Prefer read-only database users.

## Discovery Commands

```bash
odb list-connections --format yaml
odb ping app
odb search app table customer --format yaml
odb search app column "created|updated" --regex --format yaml
odb search all table customer --format yaml --out out/search/customer-tables.yaml
odb list-tables app --format yaml --out out/schema/app-tables.yaml
```

Use `all` only for commands that support multi-connection search.

## Table Context Commands

Fetch the broad table packet first, then narrow if needed:

```bash
odb get-table-context app CUSTOMER ORDER_HEADER ORDER_LINE --format yaml --out out/context/customer-orders.yaml
```

Use narrower commands for focused follow-up:

```bash
odb get-table-columns app CUSTOMER --format yaml
odb get-table-fks app ORDER_HEADER --format yaml
odb get-table-constraints app ORDER_HEADER --format yaml
odb get-table-indexes app ORDER_HEADER --format yaml
```

## SQL Commands

Run only read-only SQL:

```bash
odb query app "select * from CUSTOMER where rownum <= 20" --format yaml
odb query app "select * from CUSTOMER where ID=:id" --bind '{"id":123}' --format json
```

Inspect plans before heavier queries:

```bash
odb get-query-plan app "select * from ORDER_HEADER where CUSTOMER_ID=:id" --format yaml --out out/plans/order-header.yaml
```

Never run or suggest DML/DDL through `odb`: `insert`, `update`, `delete`, `merge`, `truncate`, `create`, `alter`, `drop`.

## Query Store Commands

Use saved queries when SQL should be reused by agents:

```bash
odb save-query app queries/customer/orders.sql customer/orders
odb get-query customer/orders --format yaml
odb run-query customer/orders --schema app --bind '{"customerId":123}' --format csv --out out/results/customer-orders.csv
```

`run-query` returns `success`, `rows`, `elapsed_ms`, and `output_file` when file output is used.

## Output Convention

Write durable outputs under `out/` unless the user requests another location:

```text
out/search/
out/context/
out/plans/
out/results/
```

Summarize saved file paths in the final answer.
