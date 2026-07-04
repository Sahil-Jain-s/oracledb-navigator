import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/commands/utils.js", () => ({
  emitOutput: vi.fn(),
  hasHelpFlag: vi.fn(),
  parseNamedArgs: vi.fn(),
  printHelp: vi.fn(),
}));

vi.mock("../../src/commands/kb/kb-utils.js", () => ({
  loadKbIndex: vi.fn(),
}));

import { emitOutput, hasHelpFlag, parseNamedArgs } from "../../src/commands/utils.js";
import { loadKbIndex } from "../../src/commands/kb/kb-utils.js";
import { searchKbs } from "../../src/commands/kb/search-kbs.js";

const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);
const mockedLoadKbIndex = vi.mocked(loadKbIndex);

const baseIndex = {
  generatedAt: "2026-06-15T00:00:00Z",
  count: 2,
  entries: [
    {
      id: "customer/orders",
      filePath: "customer/orders.md",
      name: "customer-orders",
      description: "How customer orders are modeled",
      tags: ["customer", "orders"],
      tables: ["customer", "order_header"],
      queries: ["app/customer/customer-orders"],
      updatedAt: "2026-06-15",
    },
    {
      id: "analytics/revenue",
      filePath: "analytics/revenue.md",
      name: "revenue",
      description: "Revenue reporting concepts",
      tags: ["analytics", "revenue"],
      tables: ["order_header", "payment"],
      queries: ["analytics/revenue/monthly"],
      updatedAt: "2026-06-15",
    },
  ],
};

describe("searchKbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasHelpFlag.mockReturnValue(false);
    mockedParseNamedArgs.mockReturnValue({ positional: ["customer"], regex: false });
    mockedLoadKbIndex.mockReturnValue(baseIndex);
  });

  it("finds text match by name", async () => {
    await searchKbs(["customer"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        term: "customer",
        regex: false,
        rowCount: 1,
      }),
      undefined,
      "json"
    );
  });

  it("finds match by table name", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: ["payment"], regex: false });

    await searchKbs(["payment"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({ rowCount: 1 }),
      undefined,
      "json"
    );
  });

  it("finds regex match across multiple entries", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: ["customer|revenue"], regex: true });

    await searchKbs(["customer|revenue", "--regex"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        rowCount: 2,
        regex: true,
      }),
      undefined,
      "json"
    );
  });

  it("returns empty when no match", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: ["xyzzy"], regex: false });

    await searchKbs(["xyzzy"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({ rowCount: 0 }),
      undefined,
      "json"
    );
  });

  it("throws when term missing", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: [], regex: false });

    await expect(searchKbs([])).rejects.toThrow("Missing required arg: <term>. Run 'odb search-kbs --help'");
  });
});
