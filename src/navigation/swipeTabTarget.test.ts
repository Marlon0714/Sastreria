import { describe, expect, it } from "@jest/globals";

import { resolveSwipeTargetIndex } from "./swipeTabTarget";

describe("resolveSwipeTargetIndex", () => {
  it("avanza al siguiente tab con un swipe a la izquierda suficiente", () => {
    expect(resolveSwipeTargetIndex(-60, 0, 4)).toBe(1);
  });

  it("retrocede al tab anterior con un swipe a la derecha suficiente", () => {
    expect(resolveSwipeTargetIndex(60, 1, 4)).toBe(0);
  });

  it("no hace nada si el swipe no alcanza el umbral", () => {
    expect(resolveSwipeTargetIndex(-30, 0, 4)).toBeNull();
    expect(resolveSwipeTargetIndex(30, 1, 4)).toBeNull();
  });

  it("no avanza más allá del último tab", () => {
    expect(resolveSwipeTargetIndex(-60, 3, 4)).toBeNull();
  });

  it("no retrocede antes del primer tab", () => {
    expect(resolveSwipeTargetIndex(60, 0, 4)).toBeNull();
  });

  it("respeta un umbral personalizado", () => {
    expect(resolveSwipeTargetIndex(-80, 0, 4, 100)).toBeNull();
    expect(resolveSwipeTargetIndex(-120, 0, 4, 100)).toBe(1);
  });
});
