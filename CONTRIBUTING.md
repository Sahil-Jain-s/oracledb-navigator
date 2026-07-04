# Contributing

Thanks for helping improve `oracledb-navigator`.

## Development

```bash
npm install
npm test
npm link
odb --help
```

## Pull Requests

- Keep changes focused.
- Add or update tests for behavior changes.
- Do not commit real credentials, connection strings, schema exports, query results, or proprietary database knowledge.
- Prefer synthetic examples in docs and tests.
- Keep query execution read-only unless a future feature explicitly changes the safety model.

## Good First Areas

- Improve Oracle metadata discovery.
- Add synthetic example KB entries.
- Strengthen SQL safety validation.
- Improve docs for AI agent workflows.
- Add named connection profile support.
