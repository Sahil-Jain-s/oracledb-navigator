import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("../../src/commands/utils.js", () => ({
  emitOutput: vi.fn(),
  hasHelpFlag: vi.fn(),
  parseNamedArgs: vi.fn(),
  printHelp: vi.fn(),
}));

vi.mock("../../src/commands/kb/kb-utils.js", () => ({
  parseFrontmatter: vi.fn(),
  validateFrontmatter: vi.fn(),
  normalizeKbId: vi.fn(),
  getDateStamp: vi.fn(),
  readKb: vi.fn(),
  writeKb: vi.fn(),
  rebuildKbIndex: vi.fn(),
}));

import { existsSync, readFileSync } from "node:fs";
import { emitOutput, hasHelpFlag, parseNamedArgs } from "../../src/commands/utils.js";
import {
  parseFrontmatter,
  validateFrontmatter,
  normalizeKbId,
  getDateStamp,
  readKb,
  writeKb,
  rebuildKbIndex,
} from "../../src/commands/kb/kb-utils.js";
import { saveKb } from "../../src/commands/kb/save-kb.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedEmitOutput = vi.mocked(emitOutput);
const mockedHasHelpFlag = vi.mocked(hasHelpFlag);
const mockedParseNamedArgs = vi.mocked(parseNamedArgs);
const mockedParseFrontmatter = vi.mocked(parseFrontmatter);
const mockedValidateFrontmatter = vi.mocked(validateFrontmatter);
const mockedNormalizeKbId = vi.mocked(normalizeKbId);
const mockedGetDateStamp = vi.mocked(getDateStamp);
const mockedReadKb = vi.mocked(readKb);
const mockedWriteKb = vi.mocked(writeKb);
const mockedRebuildKbIndex = vi.mocked(rebuildKbIndex);

const baseFrontmatter = {
  name: "customer-orders",
  description: "How customer orders are modeled",
  queries: ["app/customer/customer-orders"],
  tables: ["customer", "order_header"],
  tags: ["customer", "orders"],
};

describe("saveKb", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedHasHelpFlag.mockReturnValue(false);
    mockedParseNamedArgs.mockReturnValue({
      positional: ["customer/orders", "docs/customer-orders.md"],
      regex: false,
    });
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue("--- raw markdown ---");
    mockedParseFrontmatter.mockReturnValue({ frontmatter: baseFrontmatter, content: "# Customer Orders\nBody text." });
    mockedValidateFrontmatter.mockReturnValue([]);
    mockedNormalizeKbId.mockImplementation((v) => v);
    mockedGetDateStamp.mockReturnValue("2026-06-15");
    mockedReadKb.mockImplementation(() => { throw new Error("not found"); });
    mockedWriteKb.mockReturnValue("catalog/kb/customer/orders.md");
    mockedRebuildKbIndex.mockReturnValue({ generatedAt: "2026-06-15T00:00:00Z", count: 1, entries: [] });
  });

  it("creates new KB and emits created payload", async () => {
    await saveKb(["customer/orders", "docs/customer-orders.md"]);

    expect(mockedWriteKb).toHaveBeenCalledWith(
      "customer/orders",
      baseFrontmatter,
      "# Customer Orders\nBody text.",
      "2026-06-15",
      "2026-06-15"
    );

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        action: "created",
        id: "customer/orders",
        name: "customer-orders",
      }),
      undefined,
      "json"
    );
  });

  it("updates existing KB and preserves createdAt", async () => {
    mockedReadKb.mockReturnValue({
      ...baseFrontmatter,
      content: "old content",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });

    await saveKb(["customer/orders", "docs/customer-orders.md"]);

    expect(mockedWriteKb).toHaveBeenCalledWith(
      "customer/orders",
      baseFrontmatter,
      "# Customer Orders\nBody text.",
      "2026-01-01",
      "2026-06-15"
    );

    expect(mockedEmitOutput).toHaveBeenCalledWith(
      expect.objectContaining({ action: "updated" }),
      undefined,
      "json"
    );
  });

  it("throws when markdown file not found", async () => {
    mockedParseNamedArgs.mockReturnValue({
      positional: ["customer/orders", "docs/missing.md"],
      regex: false,
    });
    mockedExistsSync.mockReturnValue(false);

    await expect(saveKb(["customer/orders", "docs/missing.md"])).rejects.toThrow(
      "Markdown file not found: docs/missing.md"
    );
  });

  it("throws when frontmatter validation fails", async () => {
    mockedValidateFrontmatter.mockReturnValue(["Missing required field: name"]);

    await expect(saveKb(["customer/orders", "docs/customer-orders.md"])).rejects.toThrow(
      "KB validation failed"
    );
  });

  it("throws when id or markdownFile missing", async () => {
    mockedParseNamedArgs.mockReturnValue({ positional: [], regex: false });

    await expect(saveKb([])).rejects.toThrow("Missing required args");
  });
});
