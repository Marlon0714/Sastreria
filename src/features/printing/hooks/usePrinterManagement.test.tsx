import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { Profile } from "../../auth/domain/profile";
import type { ResolvedIdentity } from "../../auth/hooks/useIdentityGate";
import { useIdentityStore } from "../../../shared/state/identityStore";
import { usePrinterSettingsStore } from "../../../shared/state/printerSettingsStore";
import type { CapturedLabelBitmap, PrinterTarget } from "../domain/types";
import { usePrinterManagement } from "./usePrinterManagement";

const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();
const mockRequireIdentity = jest.fn<() => Promise<ResolvedIdentity | null>>();
const mockReleaseIdentity = jest.fn(() => {
  if (useIdentityStore.getState().ownProfile?.isSharedDevice)
    useIdentityStore.getState().clearResolvedActor();
});
const mockPrint =
  jest.fn<
    (params: {
      capture: () => Promise<CapturedLabelBitmap>;
      target: PrinterTarget;
    }) => Promise<void>
  >();
jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: (key: string, value: string) => mockSetItem(key, value),
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "11111111-1111-4111-8111-111111111111",
}));
jest.mock("./usePrintArregloLabel", () => ({
  usePrintArregloLabel: () => ({ printLabel: mockPrint, isPrinting: false }),
}));
jest.mock("../../auth/hooks/useIdentityGate", () => ({
  useIdentityGate: () => ({
    requireIdentity: mockRequireIdentity,
    releaseIdentity: mockReleaseIdentity,
  }),
}));

const OWNER: Profile = {
  id: "owner-1",
  displayName: "Dueño",
  role: "owner",
  isSharedDevice: false,
};
const WORKER: Profile = {
  id: "worker-1",
  displayName: "Operario",
  role: "operario",
  isSharedDevice: false,
};
const capture = async (): Promise<CapturedLabelBitmap> => ({
  base64Png: "fake",
  width: 8,
  height: 1,
});

describe("usePrinterManagement", () => {
  beforeEach(() => {
    useIdentityStore.getState().setOwnProfile(OWNER);
    usePrinterSettingsStore.setState({ printers: [], defaultPrinterId: null });
    mockSetItem.mockReset().mockResolvedValue();
    mockPrint.mockReset().mockResolvedValue();
    mockRequireIdentity.mockReset().mockImplementation(async () => {
      const profile = useIdentityStore.getState().ownProfile;
      return profile ? { profile, verified: true } : null;
    });
    mockReleaseIdentity.mockClear();
  });

  it("rechaza administración de un operario aunque se invoque la acción directamente", async () => {
    useIdentityStore.getState().setOwnProfile(WORKER);
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(
        await result.current.savePrinter({
          name: "Taller",
          host: "192.168.1.60",
        }),
      ).toBe(false);
    });
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/dueño verificado/);
  });

  it("no concede administración a un dueño elegido sin verificar offline", async () => {
    useIdentityStore
      .getState()
      .setOwnProfile({ ...WORKER, isSharedDevice: true });
    mockRequireIdentity.mockResolvedValue({ profile: OWNER, verified: false });
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(await result.current.authorizeAdministration()).toBe(false);
    });
    expect(result.current.canManage).toBe(false);
    expect(mockReleaseIdentity).toHaveBeenCalled();
  });

  it("libera la autorización temporal del dueño al salir de la pantalla compartida", async () => {
    useIdentityStore
      .getState()
      .setOwnProfile({ ...WORKER, isSharedDevice: true });
    mockRequireIdentity.mockImplementation(async () => {
      useIdentityStore.getState().setResolvedActor(OWNER);
      return { profile: OWNER, verified: true };
    });
    const { result, unmount } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(await result.current.authorizeAdministration()).toBe(true);
    });
    expect(result.current.canManage).toBe(true);
    unmount();
    expect(useIdentityStore.getState().resolvedActor).toBeNull();
  });

  it("la cancelación de identidad no ejecuta ni persiste acciones", async () => {
    mockRequireIdentity.mockResolvedValue(null);
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(
        await result.current.savePrinter({
          name: "Taller",
          host: "192.168.1.60",
        }),
      ).toBe(false);
    });
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(result.current.isBusy).toBe(false);
  });

  it("una verificación tardía no deja al dueño autorizado al salir de la pantalla", async () => {
    useIdentityStore
      .getState()
      .setOwnProfile({ ...WORKER, isSharedDevice: true });
    let finish: (() => void) | undefined;
    mockRequireIdentity.mockImplementation(
      () =>
        new Promise<ResolvedIdentity>((resolve) => {
          finish = () => {
            useIdentityStore.getState().setResolvedActor(OWNER);
            resolve({ profile: OWNER, verified: true });
          };
        }),
    );
    const { result, unmount } = renderHook(() => usePrinterManagement(capture));
    let request: Promise<boolean> | undefined;
    act(() => {
      request = result.current.authorizeAdministration();
    });
    unmount();
    await act(async () => {
      finish?.();
      expect(await request).toBe(false);
    });
    expect(useIdentityStore.getState().resolvedActor).toBeNull();
  });

  it("un operario cambia solo la IP después de prueba y confirmación", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    mockSetItem.mockClear();
    useIdentityStore.getState().setOwnProfile(WORKER);
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(await result.current.testConnection(printer, "192.168.1.77")).toBe(
        true,
      );
    });
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockPrint).toHaveBeenCalledWith({
      capture,
      target: { ...printer, host: "192.168.1.77" },
    });
    await act(async () => {
      expect(await result.current.confirmConnection()).toBe(true);
    });
    expect(usePrinterSettingsStore.getState().printers[0]).toEqual({
      ...printer,
      host: "192.168.1.77",
    });
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it("una prueba fallida no habilita confirmación ni actualiza la IP", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    mockSetItem.mockClear();
    mockPrint.mockRejectedValue(new Error("socket"));
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(await result.current.testConnection(printer, "192.168.1.77")).toBe(
        false,
      );
    });
    expect(result.current.pendingRecovery).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it("impide probar direcciones externas a la red local", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(await result.current.testConnection(printer, "8.8.8.8")).toBe(
        false,
      );
    });
    expect(mockPrint).not.toHaveBeenCalled();
  });

  it("invalida la confirmación si cambia la sesión", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      await result.current.testConnection(printer, "192.168.1.77");
    });
    act(() => useIdentityStore.getState().setOwnProfile(WORKER));
    mockSetItem.mockClear();
    await act(async () => {
      expect(await result.current.confirmConnection()).toBe(false);
    });
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(result.current.pendingRecovery).toBeNull();
  });

  it("invalida la prueba si se editó la configuración mientras esperaba confirmación", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      await result.current.testConnection(printer, "192.168.1.77");
    });
    act(() =>
      usePrinterSettingsStore.setState({
        printers: [{ ...printer, protocol: "escpos-raster" }],
      }),
    );
    await act(async () => {
      expect(await result.current.confirmConnection()).toBe(false);
    });
    expect(usePrinterSettingsStore.getState().printers[0]?.host).toBe(
      "192.168.1.60",
    );
  });

  it("bloquea dobles envíos mientras una prueba está en curso", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    let finish: (() => void) | undefined;
    mockPrint.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => usePrinterManagement(capture));
    let first: Promise<boolean> | undefined;
    await act(async () => {
      first = result.current.sendTest(printer);
      expect(await result.current.sendTest(printer)).toBe(false);
    });
    expect(mockPrint).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish?.();
      await first;
    });
    expect(result.current.isBusy).toBe(false);
  });

  it("permite recuperar IP offline en tablet compartida sin habilitar administración", async () => {
    const printer = await usePrinterSettingsStore
      .getState()
      .addPrinter({ name: "Taller", host: "192.168.1.60" });
    useIdentityStore
      .getState()
      .setOwnProfile({ ...WORKER, isSharedDevice: true });
    mockRequireIdentity.mockResolvedValue({ profile: WORKER, verified: false });
    const { result } = renderHook(() => usePrinterManagement(capture));
    await act(async () => {
      expect(await result.current.testConnection(printer, "192.168.1.77")).toBe(
        true,
      );
    });
    await act(async () => {
      expect(await result.current.confirmConnection()).toBe(true);
    });
    expect(usePrinterSettingsStore.getState().printers[0]?.host).toBe(
      "192.168.1.77",
    );
    expect(result.current.canManage).toBe(false);
    await act(async () => {
      expect(await result.current.authorizeAdministration()).toBe(false);
    });
  });

  it("solicita contraseña para administrar en tablet con sesión del dueño y libera el permiso al guardar", async () => {
    useIdentityStore
      .getState()
      .setOwnProfile({ ...OWNER, isSharedDevice: true });
    const { result } = renderHook(() => usePrinterManagement(capture));
    let request: Promise<boolean> | undefined;
    act(() => {
      request = result.current.authorizeAdministration();
    });
    expect(result.current.isOwnerVerificationVisible).toBe(true);
    expect(mockRequireIdentity).not.toHaveBeenCalled();
    await act(async () => {
      result.current.completeOwnerVerification();
      expect(await request).toBe(true);
    });
    expect(result.current.canManage).toBe(true);
    await act(async () => {
      expect(
        await result.current.savePrinter({
          name: "Taller",
          host: "192.168.1.60",
        }),
      ).toBe(true);
    });
    expect(useIdentityStore.getState().resolvedActor).toBeNull();
    expect(result.current.canManage).toBe(false);
  });

  it("cancelar la contraseña del dueño no concede permisos", async () => {
    useIdentityStore
      .getState()
      .setOwnProfile({ ...OWNER, isSharedDevice: true });
    const { result } = renderHook(() => usePrinterManagement(capture));
    let request: Promise<boolean> | undefined;
    act(() => {
      request = result.current.authorizeAdministration();
    });
    await act(async () => {
      result.current.cancelOwnerVerification();
      expect(await request).toBe(false);
    });
    expect(useIdentityStore.getState().resolvedActor).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
