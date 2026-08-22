import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import { noopDependencies } from "../hooks/ClientsDependenciesProvider.test-utils";
import type { ClientTalla } from "../domain/types";
import TallasScreen from "./TallasScreen";

import { useTallas } from "../hooks/useTallas";

const mockUpsertTalla = jest.fn<(input: unknown) => Promise<ClientTalla | null>>();
const mockDeleteTalla = jest.fn();
const mockReload = jest.fn();
const mockValidate = jest.fn(() => ({}) as Record<string, unknown>);

jest.mock("@react-navigation/native", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");

  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      }, [effect]);
    },
  };
});

jest.mock("../hooks/useTallas", () => ({
  useTallas: jest.fn(),
}));
const mockUseTallas = useTallas as jest.Mock;

function buildProps(clientId = "client-1") {
  return {
    navigation: {} as never,
    route: { params: { clientId } } as never,
  };
}

describe("TallasScreen", () => {
  beforeEach(() => {
    mockUpsertTalla.mockReset();
    mockDeleteTalla.mockReset();
    mockReload.mockReset();
    mockValidate.mockReset();
    mockValidate.mockReturnValue({});
    mockUseTallas.mockReturnValue({
      tallas: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      upsertTalla: mockUpsertTalla,
      validate: mockValidate,
      deleteTalla: mockDeleteTalla,
      reload: mockReload,
    });
  });

  it("muestra el error de campo y no guarda cuando el valor de la talla está vacío", async () => {
    mockValidate.mockReturnValue({
      value: { type: "zod", message: "La talla es obligatoria" },
    });

    const { getByLabelText, getByText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <TallasScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );

    fireEvent.press(getByLabelText("Añadir talla de camisa"));
    fireEvent.press(getByLabelText("Guardar talla"));

    await waitFor(() => {
      expect(getByText("La talla es obligatoria")).toBeTruthy();
    });
    expect(mockUpsertTalla).not.toHaveBeenCalled();
  });

  it("guarda la talla cuando el valor es válido", async () => {
    mockUpsertTalla.mockResolvedValueOnce({
      id: "t-1",
      clientId: "client-1",
      type: "camisa",
      value: "M",
      notes: null,
    } as ClientTalla);

    const { getByLabelText } = render(
      <ClientsDependenciesProvider dependencies={noopDependencies}>
        <TallasScreen {...buildProps()} />
      </ClientsDependenciesProvider>,
    );

    fireEvent.press(getByLabelText("Añadir talla de camisa"));
    fireEvent.changeText(getByLabelText("Valor de talla"), "M");
    fireEvent.press(getByLabelText("Guardar talla"));

    await waitFor(() => {
      expect(mockUpsertTalla).toHaveBeenCalled();
    });
  });
});
