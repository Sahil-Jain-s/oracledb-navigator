---
name: use-odb-kb
description: Use oracledb-navigator knowledge base commands to search, read, validate, and rely on database KB entries before exploring raw Oracle schema metadata. Use when answering database questions, looking for documented join paths, reading saved business context, running referenced saved queries, or deciding whether KB knowledge is stale or incomplete.
---

# Use ODB KB

Start with the KB when the task is about business meaning, join paths, caveats, or known query patterns.

## KB-First Workflow

1. Search by business term, table, synonym, or regex.

```bash
odb search-kbs customer --format yaml --out out/kb/search-customer.yaml
odb search-kbs "customer|account|order" --regex --format yaml
```

2. Read the most relevant entries.

```bash
odb get-kb customer/orders --format yaml --out out/kb/customer-orders.yaml
```

3. Extract:

- `tables`
- `queries`
- caveats
- business definitions
- unresolved questions

4. Run referenced saved queries only when useful and safe.

```bash
odb run-query customer/orders --schema app --bind '{"customerId":123}' --format yaml --out out/results/customer-orders.yaml
```

5. Fall back to schema exploration only when the KB is missing, stale, or insufficient.

## Query Store Commands

Use saved queries when SQL should be reused by agents:

```bash
odb save-query app queries/customer/orders.sql customer/orders
odb get-query customer/orders --format yaml
odb run-query customer/orders --schema app --bind '{"customerId":123}' --format csv --out out/results/customer-orders.csv
```

`run-query` returns `success`, `rows`, `elapsed_ms`, and `output_file` when file output is used.

Each saved query can have a KB entry that explains how and when to use it, including required binds, safe filters, expected grain, caveats, and related tables.

## Validation

Validate entries before relying on them for durable documentation:

```bash
odb validate-kb customer/orders --format yaml --out out/kb/customer-orders-validate.yaml
```

Warnings are not automatic blockers, but they must be mentioned if they affect confidence.

## KB Document Format

When creating or updating KB docs, read `skills/use-odb-kb/references/kb-doc-format.md` for the required Markdown/frontmatter shape and guidance on writing focused knowledge bites.

## Response Rules

- Cite KB IDs used.
- Cite saved query IDs used.
- Mention if raw schema exploration was needed after KB lookup.
- Do not claim a relationship is certain unless KB, FK metadata, or query validation supports it.

If the KB is incomplete and the user wants durable docs, create or update a KB doc using the format reference.
