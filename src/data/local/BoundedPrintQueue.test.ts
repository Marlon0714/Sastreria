import { describe, expect, it } from "@jest/globals";

import { BoundedPrintQueue } from "./BoundedPrintQueue";

describe("BoundedPrintQueue", () => {
  it("rechaza rápidamente otro arreglo mientras hay uno en curso", async () => {
    const queue = new BoundedPrintQueue();
    let finish: (() => void) | undefined;
    const first = queue.run(
      "arreglo-1",
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    await expect(queue.run("arreglo-2", async () => {})).rejects.toThrow(
      /otra etiqueta/,
    );
    finish?.();
    await first;
  });

  it("comparte el trabajo activo con una solicitud duplicada del mismo arreglo", async () => {
    const queue = new BoundedPrintQueue();
    let finish: (() => void) | undefined;
    let sends = 0;
    const send = (): Promise<void> =>
      new Promise((resolve) => {
        sends += 1;
        finish = resolve;
      });
    const first = queue.run("arreglo-1", send);
    const duplicate = queue.run("arreglo-1", send);

    expect(duplicate).toBe(first);
    await Promise.resolve();
    expect(sends).toBe(1);
    finish?.();
    await Promise.all([first, duplicate]);
  });
});
