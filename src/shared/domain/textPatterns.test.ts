import { describe, expect, it } from "@jest/globals";

import { capitalizeWords } from "./textPatterns";

describe("capitalizeWords", () => {
  it("pone en mayúscula la primera letra y el resto en minúscula", () => {
    expect(capitalizeWords("juan PEREZ")).toBe("Juan Perez");
  });

  it("capitaliza cada palabra por separado", () => {
    expect(capitalizeWords("MARÍA jose gómez")).toBe("María Jose Gómez");
  });

  it("capitaliza cada parte de un nombre compuesto con guion", () => {
    expect(capitalizeWords("maría-josé")).toBe("María-José");
  });

  it("deja igual un nombre ya bien formateado", () => {
    expect(capitalizeWords("Ana Torres")).toBe("Ana Torres");
  });
});
