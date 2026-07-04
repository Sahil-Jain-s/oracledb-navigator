# KB Doc Format

Create KB source files as Markdown with required YAML frontmatter.

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

Required frontmatter fields:

- `name`: short kebab-case or readable title for the KB entry
- `description`: one sentence describing what the entry explains
- `queries`: array of saved query IDs; use `[]` when none exist yet
- `tables`: array of Oracle table names; use `[]` when none are known yet
- `tags`: array of searchable terms such as business area, workflow, or domain

Body guidance:

- Keep each KB entry as one focused knowledge bite: one business concept, workflow, join path, or reporting question.
- A saved query can have a KB entry that explains how and when to use it; this is useful but not required for every query.
- Use a clear H1 that matches the business concept.
- List the core tables and explain each table's role in one short line.
- Document important joins, including bridge tables, join keys, optional relationships, and relationships that look tempting but should not be used.
- Capture business logic such as statuses, date semantics, ownership rules, filters, exclusions, and edge cases.
- Include query examples or saved query IDs for common lookups, validation checks, and safe samples.
- For query-focused KB entries, document required binds, optional binds, output grain, safe default filters, and when not to use the query.
- Call out caveats, known data quality issues, and unresolved questions.
- Prefer table names, column names, and saved-query IDs over prose-only references.
- Keep it concise enough for an agent to read before querying, but specific enough that it prevents rediscovery.

Recommended sections:

```md
# Customer Orders

## Summary

## Core Tables

## Join Path

## Business Logic

## Query Examples

## Caveats

## Open Questions
```

Save and validate:

```bash
odb save-kb customer/orders kb/customer-orders.md
odb validate-kb customer/orders --format yaml
```
