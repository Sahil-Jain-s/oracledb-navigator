import * as dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const configHome =
  process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.length > 0
    ? process.env.XDG_CONFIG_HOME
    : path.join(os.homedir(), ".config");

const defaultConfigDir = path.join(configHome, "oracledb-navigator");
const legacyConfigDir = path.join(os.homedir(), ".oracledb-navigator");
const defaultEnvPathCandidates = [
  path.join(defaultConfigDir, ".env"),
  path.join(legacyConfigDir, ".env"),
];
const defaultConfigPathCandidates = [
  path.join(defaultConfigDir, "odb.config.json"),
  path.join(legacyConfigDir, "odb.config.json"),
];

function firstExistingPath(paths: string[]): string | undefined {
  return paths.find((candidate) => existsSync(candidate));
}

function resolveExplicitPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function resolveEnvPath(): string | undefined {
  const explicit = process.env.ODB_ENV;

  if (explicit && explicit.length > 0) {
    return resolveExplicitPath(explicit);
  }

  return firstExistingPath(defaultEnvPathCandidates);
}

const envPath = resolveEnvPath();

if (envPath) {
  dotenv.config({ path: envPath, quiet: true });
}

export interface ConnectionConfig {
  user: string;
  password: string;
  schemaName: string;
  connectString: string;
}

interface RawConnectionConfig {
  user?: string;
  userEnv?: string;
  password?: string;
  passwordEnv?: string;
  schema?: string;
  schemaName?: string;
  schemaEnv?: string;
  connectString?: string;
  connectStringEnv?: string;
}

interface RawConfigFile {
  connections?: Record<string, RawConnectionConfig>;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function requireEnv(name: string, connectionName: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(
      `Connection '${connectionName}' references missing environment variable ${name}`
    );
  }

  return value;
}

function resolveField(
  raw: RawConnectionConfig,
  connectionName: string,
  directKey: keyof RawConnectionConfig,
  envKey: keyof RawConnectionConfig,
  label: string
): string {
  const direct = raw[directKey];
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const envName = raw[envKey];
  if (typeof envName === "string" && envName.length > 0) {
    return requireEnv(envName, connectionName);
  }

  throw new Error(`Connection '${connectionName}' is missing ${label}`);
}

function normalizeConnection(
  name: string,
  raw: RawConnectionConfig
): ConnectionConfig {
  const schemaName =
    typeof raw.schemaName === "string" && raw.schemaName.length > 0
      ? raw.schemaName
      : typeof raw.schema === "string" && raw.schema.length > 0
      ? raw.schema
      : raw.schemaEnv
      ? requireEnv(raw.schemaEnv, name)
      : undefined;

  if (!schemaName) {
    throw new Error(`Connection '${name}' is missing schema`);
  }

  return {
    user: resolveField(raw, name, "user", "userEnv", "user"),
    password: resolveField(raw, name, "password", "passwordEnv", "password"),
    schemaName,
    connectString: resolveField(
      raw,
      name,
      "connectString",
      "connectStringEnv",
      "connectString"
    ),
  };
}

function loadConfigFile(): RawConfigFile {
  const explicitConfig = readEnv("ODB_CONFIG");
  const configPath = explicitConfig
    ? resolveExplicitPath(explicitConfig)
    : firstExistingPath(defaultConfigPathCandidates);

  if (!configPath || !existsSync(configPath)) {
    return {};
  }

  return JSON.parse(readFileSync(configPath, "utf8")) as RawConfigFile;
}

function loadEnvJsonConfig(): RawConfigFile {
  const rawJson = readEnv("ORACLEDB_NAVIGATOR_CONNECTIONS");

  if (!rawJson) {
    return {};
  }

  const parsed = JSON.parse(rawJson) as
    | RawConfigFile
    | Record<string, RawConnectionConfig>;

  if ("connections" in parsed) {
    return parsed as RawConfigFile;
  }

  return {
    connections: parsed as Record<string, RawConnectionConfig>,
  };
}

function normalizeConnections(
  rawConnections: Record<string, RawConnectionConfig> | undefined
): Record<string, ConnectionConfig> {
  const connections: Record<string, ConnectionConfig> = {};

  for (const [name, raw] of Object.entries(rawConnections ?? {})) {
    connections[name.toLowerCase()] = normalizeConnection(name, raw);
  }

  return connections;
}

const fileConfig = loadConfigFile();
const envJsonConfig = loadEnvJsonConfig();

export const connections: Record<string, ConnectionConfig> = {
  ...normalizeConnections(fileConfig.connections),
  ...normalizeConnections(envJsonConfig.connections),
};

export function listConnectionNames(): string[] {
  return Object.keys(connections).sort();
}

export function configHelpText(): string {
  return [
    `Create ${defaultConfigPathCandidates[0]} and ${defaultEnvPathCandidates[0]}`,
    "or set ODB_CONFIG and ODB_ENV to explicit file paths.",
  ].join(" ");
}
