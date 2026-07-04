import * as oracledb from 'oracledb';
import {
  configHelpText,
  connections,
  listConnectionNames,
  type ConnectionConfig,
} from "./env.js";

function normalizeConnectString(connectString: string) {
  return connectString.replace(/^jdbc:oracle:thin:@/i, "");
}

function resolveConnectionConfig(connection: string): ConnectionConfig {
  const byKey = connections[connection.toLowerCase()];

  if (byKey) {
    return byKey;
  }

  const bySchemaName = Object.values(connections).find(
    (cfg) => cfg.schemaName.toLowerCase() === connection.toLowerCase()
  );

  if (bySchemaName) {
    return bySchemaName;
  }

  const available = listConnectionNames();
  const suffix =
    available.length > 0
      ? ` Available connections: ${available.join(", ")}`
      : ` No configured connections found. ${configHelpText()}`;

  throw new Error(`Unknown connection: ${connection}.${suffix}`);
}

export function resolveSchemaOwner(connection: string): string {
  return resolveConnectionConfig(connection).schemaName.toUpperCase();
}

export function resolveConnectionTargets(connection: string): string[] {
  if (connection.toLowerCase() === "all" || connection.toLowerCase() === "both") {
    return listConnectionNames();
  }

  return [connection];
}

export async function getConnection(connection: string) {
  const cfg = resolveConnectionConfig(connection);

  return oracledb.getConnection({
    user: cfg.user,
    password: cfg.password,
    connectString: normalizeConnectString(cfg.connectString)
  });
}
