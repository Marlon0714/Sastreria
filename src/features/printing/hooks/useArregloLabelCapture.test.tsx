import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import type { LayoutChangeEvent, View } from "react-native";

import { useArregloLabelCapture } from "./useArregloLabelCapture";

const mockCaptureRef = jest.fn<(...args: unknown[]) => Promise<string>>(
  async () => "captured-png",
);

jest.mock(
  "react-native-view-shot",
  () => ({
    captureRef: (...args: unknown[]) => mockCaptureRef(...args),
  }),
  { virtual: true },
);

describe("useArregloLabelCapture", () => {
  it("captura al doble del layout para conservar detalle antes del escalado final", async () => {
    const { result } = renderHook(() => useArregloLabelCapture());
    result.current.viewRef.current = {} as View;
    act(() => {
      result.current.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 384, height: 300 } },
      } as LayoutChangeEvent);
    });

    const captured = await result.current.capture();

    expect(mockCaptureRef).toHaveBeenCalledWith(result.current.viewRef, {
      format: "png",
      quality: 1,
      result: "base64",
      width: 768,
      height: 600,
    });
    expect(captured).toEqual({
      base64Png: "captured-png",
      width: 768,
      height: 600,
    });
  });

  it("rechaza la captura cuando el layout no esta listo", async () => {
    const { result } = renderHook(() => useArregloLabelCapture());

    await expect(result.current.capture()).rejects.toThrow(
      "La etiqueta todavía no está lista",
    );
  });
});
