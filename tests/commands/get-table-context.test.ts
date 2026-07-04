import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("oracledb", () => ({
  default: {
    OUT_FORMAT_OBJECT: 4002,
  },
}));

vi.mock("../../src/connection.js", () => ({
  getConnection: vi.fn(),
  resolveSchemaOwner: vi.fn(),
}));

vi.mock("../../src/commands/utils.js", () => ({
  emitOutput: vi.fn(),
  hasHelpFlag: vi.fn(),
  parseNamedArgs: vi.fn(),
  printHelp: vi.fn(),
}));

import { getConnection, resolveSchemaOwner } from "../../src/connection.js";
import {
  emitOutput,
  hasHelpFlag,
  parseNamedArgs,
} from "../../src/commands/utils.js";
import { getTableContext } from "../../src/commands/table-details/get-table-context.js";

const mockedGetConnection = vi.mocked(getConnection);
const mockedResolveSchemaOwner = vi.mocked(resolveSchemaOwner);
const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);

describe("getTableContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasHelpFlag.mockReturnValue(false);
    mockedResolveSchemaOwner.mockReturnValue("APP");
  });

  it("returns success with found false for missing tables", async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });
    const close = vi.fn().mockResolvedValue(undefined);
    mockedGetConnection.mockResolvedValue({ execute, close } as any);
    mockedParseNamedArgs.mockReturnValue({
      positional: ["app", "DOES_NOT_EXIST"],
      regex: false,
    });

    await getTableContext(["app", "DOES_NOT_EXIST"]);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(mockedEmitOutput).toHaveBeenCalledWith(
      {
        success: true,
        table: "DOES_NOT_EXIST",
        found: false,
        columns: [],
        incomingFks: [],
        outgoingFks: [],
      },
      undefined,
      "yaml"
    );
    expect(close).toHaveBeenCalled();
  });

  it("omits constraints and indexes from table context", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ COLUMN_NAME: "ID" }] })
      .mockResolvedValueOnce({ rows: [{ CHILD_TABLE: "ORDER_LINE" }] })
      .mockResolvedValueOnce({ rows: [{ PARENT_TABLE: "CUSTOMER" }] });
    const close = vi.fn().mockResolvedValue(undefined);
    mockedGetConnection.mockResolvedValue({ execute, close } as any);
    mockedParseNamedArgs.mockReturnValue({
      positional: ["app", "ORDER_HEADER"],
      regex: false,
    });

    await getTableContext(["app", "ORDER_HEADER"]);

    const payload = mockedEmitOutput.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      success: true,
      table: "ORDER_HEADER",
      found: true,
      columns: [{ COLUMN_NAME: "ID" }],
      incomingFks: [{ CHILD_TABLE: "ORDER_LINE" }],
      outgoingFks: [{ PARENT_TABLE: "CUSTOMER" }],
    });
    expect(payload).not.toHaveProperty("constraints");
    expect(payload).not.toHaveProperty("indexes");
  });
});
