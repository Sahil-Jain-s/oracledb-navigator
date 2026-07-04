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
import { listKbs } from "../../src/commands/kb/list-kbs.js";

const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);
const mockedLoadKbIndex = vi.mocked(loadKbIndex);

describe("listKbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasHelpFlag.mockReturnValue(false);
    mockedParseNamedArgs.mockReturnValue({ positional: [], regex: false });
    mockedLoadKbIndex.mockReturnValue({
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
          queries: [],
          updatedAt: "2026-06-15",
        },
      ],
    });
  });

  it("emits list with id, name, description, tags only", async () => {
    await listKbs([]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        rowCount: 2,
        entries: expect.arrayContaining([
          expect.objectContaining({ id: "customer/orders", name: "customer-orders" }),
        ]),
      }),
      undefined,
      "json"
    );
  });

  it("emits entries without tables or queries fields", async () => {
    await listKbs([]);

    const call = mockedEmitOutput.mock.calls[0][0] as { entries: object[] };
    expect(call.entries[0]).not.toHaveProperty("tables");
    expect(call.entries[0]).not.toHaveProperty("queries");
  });
});
