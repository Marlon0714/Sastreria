import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type React from "react";
import { Alert } from "react-native";

import { clientFactory } from "../../../__tests__/factories";
import type { Client } from "../domain/types";
import ClientDetailScreen from "./ClientDetailScreen";

interface UseClientDetailResult {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

interface UseDeleteClientResult {
  deleteClient: (id: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

const mockUseClientDetail = jest.fn<() => UseClientDetailResult>();
const mockDeleteClient = jest.fn<(id: string) => Promise<boolean>>();
const mockUseDeleteClient = jest.fn<() => UseDeleteClientResult>();

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

jest.mock("../hooks/useClientDetail", () => {
  return {
    useClientDetail: () => mockUseClientDetail(),
  };
});

jest.mock("../hooks/useDeleteClient", () => {
  return {
    useDeleteClient: () => mockUseDeleteClient(),
  };
});

type ScreenProps = React.ComponentProps<typeof ClientDetailScreen>;

function buildProps(navigate: jest.Mock, popToTop: jest.Mock): ScreenProps {
  return {
    navigation: {
      navigate,
      popToTop,
    } as unknown as ScreenProps["navigation"],
    route: {
      key: "ClientDetail-test",
      name: "ClientDetail",
      params: {
        clientId: "11111111-1111-4111-8111-111111111111",
      },
    } as unknown as ScreenProps["route"],
  };
}

describe("ClientDetailScreen", () => {
  beforeEach(() => {
    mockUseClientDetail.mockReset();
    mockDeleteClient.mockReset();
    mockUseDeleteClient.mockReset();
    mockUseDeleteClient.mockReturnValue({
      deleteClient: (id: string) => mockDeleteClient(id),
      isDeleting: false,
      error: null,
    });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders loading state", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientDetail.mockReturnValue({
      client: null,
      isLoading: true,
      error: null,
      reload,
    });

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(getByText("Cargando detalle...")).toBeTruthy();
  });

  it("renders error state and retries", async () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientDetail.mockReturnValue({
      client: null,
      isLoading: false,
      error: "No se pudo cargar el detalle del cliente.",
      reload,
    });

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(getByText("No se pudo cargar el detalle del cliente.")).toBeTruthy();

    const callsBefore = reload.mock.calls.length;
    fireEvent.press(getByText("Reintentar"));

    await waitFor(() => {
      expect(reload.mock.calls.length).toBe(callsBefore + 1);
    });
  });

  it("renders client data without exposing syncStatus to the user", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
      notes: "Cliente frecuente",
      syncStatus: "pending",
    });
    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });

    const { getByText, queryByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("3001234567")).toBeTruthy();
    expect(getByText("Notas: Cliente frecuente")).toBeTruthy();
    // Bug fix N-026: syncStatus is internal metadata, must not be visible.
    expect(queryByText(/syncStatus/i)).toBeNull();
    expect(queryByText(/pending/i)).toBeNull();
  });

  it("navigates to MeasurementTypeSelect when pressing Medidas button", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
    });
    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });

    const navigate = jest.fn();
    const popToTop = jest.fn();
    const { getByText } = render(
      <ClientDetailScreen {...buildProps(navigate, popToTop)} />,
    );

    fireEvent.press(getByText("Medidas"));
    expect(navigate).toHaveBeenCalledWith("MeasurementTypeSelect", {
      clientId: client.id,
      mode: "create",
    });
  });

  it("navega a editar cuando se presiona Editar datos", () => {
    // Arrange
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
    });
    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });

    const navigate = jest.fn();
    const popToTop = jest.fn();
    const { getByText } = render(
      <ClientDetailScreen {...buildProps(navigate, popToTop)} />,
    );

    // Act
    fireEvent.press(getByText("Editar datos"));

    // Assert
    expect(navigate).toHaveBeenCalledWith("ClientEdit", {
      clientId: client.id,
    });
  });

  it("muestra confirmación y elimina cliente al confirmar", async () => {
    // Arrange
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
    });
    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });
    mockDeleteClient.mockResolvedValueOnce(true);

    const navigate = jest.fn();
    const popToTop = jest.fn();
    const { getByText } = render(
      <ClientDetailScreen {...buildProps(navigate, popToTop)} />,
    );

    // Act
    fireEvent.press(getByText("Eliminar"));

    // Assert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    expect(alertCall?.[0]).toBe("Eliminar cliente");

    const buttons = (alertCall?.[2] ?? []) as {
      text?: string;
      onPress?: () => void;
    }[];
    const confirmButton = buttons.find((button) => button.text === "Eliminar");
    expect(confirmButton).toBeDefined();

    if (confirmButton?.onPress) {
      confirmButton.onPress();
    }

    await waitFor(() => {
      expect(mockDeleteClient).toHaveBeenCalledWith(client.id);
      expect(popToTop).toHaveBeenCalledTimes(1);
    });
  });

  it("deshabilita botón eliminar y muestra texto de progreso mientras elimina", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
    });
    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });
    mockUseDeleteClient.mockReturnValue({
      deleteClient: (id: string) => mockDeleteClient(id),
      isDeleting: true,
      error: null,
    });

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(getByText("Eliminando...")).toBeTruthy();

    fireEvent.press(getByText("Eliminando..."));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("muestra error visible cuando falla la eliminación", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "11111111-1111-4111-8111-111111111111",
    });
    mockUseClientDetail.mockReturnValue({
      client,
      isLoading: false,
      error: null,
      reload,
    });
    mockUseDeleteClient.mockReturnValue({
      deleteClient: (id: string) => mockDeleteClient(id),
      isDeleting: false,
      error: "No se pudo eliminar el cliente. Intenta nuevamente.",
    });

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn(), jest.fn())} />,
    );

    expect(
      getByText("No se pudo eliminar el cliente. Intenta nuevamente."),
    ).toBeTruthy();
  });
});
