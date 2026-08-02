import { describe, expect, it } from "@jest/globals";

import { normalizePhone, normalizeText } from "./textSearch";

describe("textSearch", () => {
  describe("normalizeText", () => {
    it("lowercases, strips accents and trims", () => {
      expect(normalizeText("  José María  ")).toBe("jose maria");
    });

    it("handles strings with no accents", () => {
      expect(normalizeText("Ana Torres")).toBe("ana torres");
    });
  });

  describe("normalizePhone", () => {
    it("keeps only digits", () => {
      expect(normalizePhone("300 123-4567")).toBe("3001234567");
    });

    it("returns empty string when there are no digits", () => {
      expect(normalizePhone("abc")).toBe("");
    });
  });
});
