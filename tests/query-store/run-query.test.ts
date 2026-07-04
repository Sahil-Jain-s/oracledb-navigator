import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/connection.js", () => ({
  getConnection: vi.fn(),
}));

vi.mock("../../src/commands/utils.js", () => ({
  emitOutput: vi.fn(),
  hasHelpFlag: vi.fn(),
  parseNamedArgs: vi.fn(),
  printHelp: vi.fn(),
  validateReadOnlySql: vi.fn(),
}));

vi.mock("../../src/commands/query-store/query-store-utils.js", () => ({
  normalizeQueryId: vi.fn(),
  readQueryFile: vi.fn(),
  extractSchemaFromQueryFile: vi.fn(),
}));

import { getConnection } from "../../src/connection.js";
import {
  emitOutput,
  hasHelpFlag,
  parseNamedArgs,
  validateReadOnlySql,
} from "../../src/commands/utils.js";
import {
  extractSchemaFromQueryFile,
  normalizeQueryId,
  readQueryFile,
} from "../../src/commands/query-store/query-store-utils.js";
import { runQuery } from "../../src/commands/query-store/run-query.js";

const mockedGetConnection = vi.mocked(getConnection);
const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);
const mockedValidateReadOnlySql = vi.mocked(validateReadOnlySql);
const mockedNormalizeQueryId = vi.mocked(normalizeQueryId);
const mockedReadQueryFile = vi.mocked(readQueryFile);
const mockedExtractSchemaFromQueryFile = vi.mocked(extractSchemaFromQueryFile);

describe("runQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedHasHelpFlag.mockReturnValue(false);
    mockedParseNamedArgs.mockReturnValue({
      positional: ["customer/active"],
      schema: "app",
      bind: "{\"status\":\"ACTIVE\"}",
      format: "json",
      out: "/tmp/active-customers.json",
      regex: false,
    });
    mockedNormalizeQueryId.mockImplementation((v) => v);
    mockedReadQueryFile.mockReturnValue("select * from customer where status = :status");
    mockedExtractSchemaFromQueryFile.mockReturnValue(undefined);
    mockedGetConnection.mockResolvedValue({
      execute: vi.fn().mockResolvedValue({
        rows: [{ ID: 1, STATUS: "ACTIVE" }],
      }),
      close: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it("emits an agent-friendly result envelope", async () => {
    await runQuery(["customer/active"]);

    expect(mockedValidateReadOnlySql).toHaveBeenCalledWith(
      "select * from customer where status = :status"
    );
    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        rowCount: 1,
        rows: [{ ID: 1, STATUS: "ACTIVE" }],
        elapsed_ms: expect.any(Number),
        output_file: "/tmp/active-customers.json",
      }),
      "/tmp/active-customers.json",
      "json"
    );
  });
});
