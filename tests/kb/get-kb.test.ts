import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/commands/utils.js", () => ({
  emitOutput: vi.fn(),
  hasHelpFlag: vi.fn(),
  parseNamedArgs: vi.fn(),
  printHelp: vi.fn(),
}));

vi.mock("../../src/commands/kb/kb-utils.js", () => ({
  normalizeKbId: vi.fn(),
  readKb: vi.fn(),
}));

import { emitOutput, hasHelpFlag, parseNamedArgs } from "../../src/commands/utils.js";
import { normalizeKbId, readKb } from "../../src/commands/kb/kb-utils.js";
import { getKb } from "../../src/commands/kb/get-kb.js";

const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);
const mockedNormalizeKbId = vi.mocked(normalizeKbId);
const mockedReadKb = vi.mocked(readKb);

const baseKb = {
  name: "customer-orders",
  description: "How customer orders are modeled",
  queries: ["app/customer/customer-orders"],
  tables: ["customer", "order_header"],
  tags: ["customer", "orders"],
  content: "# Customer Orders",
  createdAt: "2026-01-01",
  updatedAt: "2026-06-15",
};

describe("getKb", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedHasHelpFlag.mockReturnValue(false);
    mockedParseNamedArgs.mockReturnValue({
      positional: ["customer/orders"],
      format: "json",
      regex: false,
    });
    mockedNormalizeKbId.mockImplementation((v) => v);
    mockedReadKb.mockReturnValue(baseKb);
  });

  it("returns KB payload", async () => {
    await getKb(["customer/orders"]);

    expect(mockedReadKb).toHaveBeenCalledWith("customer/orders");
    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({ id: "customer/orders", name: "customer-orders" }),
      undefined,
      "json"
    );
  });

  it("defaults format to json", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: ["customer/orders"], regex: false });

    await getKb(["customer/orders"]);

    expect(mockedEmitOutput).toHaveBeenCalledWith(expect.any(Object), undefined, "json");
  });

  it("throws when id missing", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: [], regex: false });

    await expect(getKb([])).rejects.toThrow("Missing required arg: <idOrPath>. Run 'odb get-kb --help'");
  });
});
