import { describe, expect, it } from "@jest/globals";

import { findDuplicateByName, normalizePhone, normalizeText } from "./textSearch";

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

  describe("findDuplicateByName", () => {
    const contacts = [
      { firstName: "José", lastName: "María" },
      { firstName: "Ana", lastName: "Torres" },
    ];

    it("finds a match ignoring accents and case", () => {
      expect(findDuplicateByName(contacts, "jose", "maria")).toEqual(
        contacts[0],
      );
    });

    it("returns null when there is no match", () => {
      expect(findDuplicateByName(contacts, "Juan", "Pérez")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(findDuplicateByName(contacts, "", "")).toBeNull();
    });
  });
});
