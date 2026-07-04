import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitOutput, validateReadOnlySql } from "../../src/commands/utils.js";

describe("validateReadOnlySql", () => {
  it("allows select statements", () => {
    expect(() => validateReadOnlySql("select * from dual")).not.toThrow();
  });

  it("allows read-only CTE queries", () => {
    expect(() =>
      validateReadOnlySql(`
        with recent_rows as (
          select * from dual
        )
        select * from recent_rows
      `)
    ).not.toThrow();
  });

  it("rejects write statements", () => {
    expect(() => validateReadOnlySql("update users set name = 'x'"))
      .toThrow("Read-only mode: 'update' statements are not allowed");
  });

  it("writes output files and creates parent directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "odb-output-"));
    const outFile = join(dir, "nested", "result.json");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    emitOutput({ success: true, rows: [{ id: 1 }] }, outFile, "json");

    expect(JSON.parse(readFileSync(outFile, "utf8"))).toEqual({
      success: true,
      rows: [{ id: 1 }],
    });
    expect(errorSpy).toHaveBeenCalledWith(`Wrote output to ${outFile}`);
    errorSpy.mockRestore();
  });
});
