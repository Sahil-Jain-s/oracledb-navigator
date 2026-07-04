# Install oracledb-navigator

Use this guide when installing `oracledb-navigator` for a user or preparing a workspace so AI agents can use the `odb` CLI.

## Install the Package

Run these commands from the `oracledb-navigator` repository root:

```bash
npm install
npm test
npm link
```

Confirm the global link works:

```bash
odb --help
```

The package exposes one global command name: `odb`.

## Create User Config

`odb` reads user-level config by default from:

```text
~/.config/oracledb-navigator/odb.config.json
~/.config/oracledb-navigator/.env
```

Create the config directory:

```bash
mkdir -p ~/.config/oracledb-navigator
```

Ask the user which config style they want:

- One JSON file: simplest local setup, but credentials are stored in `odb.config.json`.
- JSON plus `.env`: recommended for shared/team setups because secrets stay in `.env`.

## Option 1: One JSON File

Create `~/.config/oracledb-navigator/odb.config.json`:

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

Guide the user to replace:

- `readonly_user`
- `change-me`
- `localhost:1521/FREEPDB1`
- `APP_OWNER`
- `app`, if they want a different connection name

Keep this file private because it contains credentials.

## Option 2: JSON Plus `.env`

Create `~/.config/oracledb-navigator/.env`:

```bash
APP_ORACLE_USER=readonly_user
APP_ORACLE_PASSWORD=change-me
APP_ORACLE_CONNECT_STRING=localhost:1521/FREEPDB1
```

Create `~/.config/oracledb-navigator/odb.config.json`:

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

Guide the user to fill in the `.env` values. Do not invent real credentials. If the user does not know the values, stop after creating placeholders and tell them exactly which fields need real values.

## Test the Config

After the user fills in real connection details, test the connection:

```bash
odb list-connections
odb ping app
```

Replace `app` with the configured connection name.

If the database is unavailable, still verify that the CLI can read config:

```bash
odb list-connections
```

## Test the Global Link from Another Workspace

Verify that `npm link` made `odb` available outside the repository. Change into another workspace folder and run the tool there:

```bash
cd /path/to/another/workspace
odb --help
odb list-connections
```

This confirms the global command works and that user-level config is not tied to the repo directory.

## Install Agent Skills

Ask the user which bundled skills they want to install for AI agents:

- `use-odb`: direct `odb` usage for schema search, metadata, read-only SQL, and output files.
- `use-odb-kb`: KB-first database workflow for documented business context and saved query usage.

Use the user's selected skills with the `npx skills` installer. For example:

```bash
npx skills install ./skills/use-odb
npx skills install ./skills/use-odb-kb
```

If the installer asks for confirmation, let the user approve it. If the user is unsure, recommend installing both skills.
