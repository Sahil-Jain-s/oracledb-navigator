import os from "node:os";
import path from "node:path";

function resolveExplicitPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export function resolveCatalogPath(...segments: string[]): string {
  const explicitCatalog = process.env.ODB_CATALOG;
  const configHome =
    process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.length > 0
      ? process.env.XDG_CONFIG_HOME
      : path.join(os.homedir(), ".config");

  const catalogRoot =
    explicitCatalog && explicitCatalog.length > 0
      ? resolveExplicitPath(explicitCatalog)
      : path.join(configHome, "oracledb-navigator", "catalog");

  return path.join(catalogRoot, ...segments);
}
