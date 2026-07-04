import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../../src/commands/utils.js", () => ({
  emitOutput: vi.fn(),
  hasHelpFlag: vi.fn(),
  parseNamedArgs: vi.fn(),
  printHelp: vi.fn(),
}));

vi.mock("../../src/commands/kb/kb-utils.js", () => ({
  normalizeKbId: vi.fn(),
  getKbFilePath: vi.fn(),
  readKb: vi.fn(),
}));

vi.mock("../../src/commands/query-store/query-store-utils.js", () => ({
  getQueryFilePath: vi.fn(),
}));

import { existsSync } from "node:fs";
import { emitOutput, hasHelpFlag, parseNamedArgs } from "../../src/commands/utils.js";
import { normalizeKbId, getKbFilePath, readKb } from "../../src/commands/kb/kb-utils.js";
import { getQueryFilePath } from "../../src/commands/query-store/query-store-utils.js";
import { validateKb } from "../../src/commands/kb/validate-kb.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);
const mockedNormalizeKbId = vi.mocked(normalizeKbId);
const mockedGetKbFilePath = vi.mocked(getKbFilePath);
const mockedReadKb = vi.mocked(readKb);
const mockedGetQueryFilePath = vi.mocked(getQueryFilePath);

const validKb = {
  name: "customer-orders",
  description: "How customer orders are modeled",
  queries: ["app/customer/customer-orders"],
  tables: ["customer", "order_header"],
  tags: ["customer", "orders"],
  content: "# Customer Orders\n\nSome content.",
  createdAt: "2026-01-01",
  updatedAt: "2026-06-15",
};

describe("validateKb", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedHasHelpFlag.mockReturnValue(false);
    mockedParseNamedArgs.mockReturnValue({ positional: ["customer/orders"], regex: false });
    mockedNormalizeKbId.mockImplementation((v) => v);
    mockedGetKbFilePath.mockReturnValue("catalog/kb/customer/orders.md");
    mockedExistsSync.mockImplementation((p) => {
      if (String(p).endsWith("orders.md")) return true;
      if (String(p).endsWith(".json")) return true;
      return false;
    });
    mockedReadKb.mockReturnValue(validKb);
    mockedGetQueryFilePath.mockReturnValue("catalog/app/customer/customer-orders.json");
  });

  it("passes valid KB with no errors or warnings", async () => {
    await validateKb(["customer/orders"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        id: "customer/orders",
        errors: [],
        warnings: [],
      }),
      undefined,
      "json"
    );
  });

  it("warns when referenced query not in catalog", async () => {
    mockedExistsSync.mockImplementation((p) => {
      if (String(p).endsWith("orders.md")) return true;
      return false; // query file not found
    });

    await validateKb(["customer/orders"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        warnings: expect.arrayContaining([
          expect.stringContaining("app/customer/customer-orders"),
        ]),
      }),
      undefined,
      "json"
    );
  });

  it("warns when content body is empty", async () => {
    mockedReadKb.mockReturnValue({ ...validKb, content: "" });

    await validateKb(["customer/orders"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        warnings: expect.arrayContaining([expect.stringContaining("no markdown content")]),
      }),
      undefined,
      "json"
    );
  });

  it("throws when KB file not found", async () => {
    mockedExistsSync.mockReturnValue(false);

    await expect(validateKb(["customer/orders"])).rejects.toThrow("KB not found: customer/orders");
  });

  it("emits failure when readKb throws", async () => {
    mockedReadKb.mockImplementation(() => { throw new Error("parse error"); });

    await validateKb(["customer/orders"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: expect.arrayContaining([expect.stringContaining("parse error")]),
      }),
      undefined,
      "json"
    );
  });

  it("throws when id missing", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: [], regex: false });

    await expect(validateKb([])).rejects.toThrow("Missing required arg: <idOrPath>. Run 'odb validate-kb --help'");
  });
});
