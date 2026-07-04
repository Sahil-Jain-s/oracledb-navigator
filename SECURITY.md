# Security Policy

## Supported Versions

`oracledb-navigator` is pre-1.0. Security fixes target the latest published version.

## Reporting a Vulnerability

Please report security issues privately by opening a GitHub security advisory when available, or by contacting the maintainer directly.

Do not include real database credentials, connection strings, schema exports, query results, or proprietary schema details in public issues.

## Credential Handling

Credentials are read from local environment variables. The project does not need credentials committed to the repository.

Keep `.env` local. Use read-only Oracle users whenever possible.

## SQL Safety

The CLI includes a read-only guard for query execution and rejects SQL that does not start with `SELECT` or `WITH`.

This guard is defense-in-depth. It is not a substitute for least-privilege database accounts, Oracle grants, network controls, or review of queries before execution.
