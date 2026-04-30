import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type React from "react";

import { clientFactory } from "../../../__tests__/factories";
import type { Client } from "../domain/types";
import ClientDetailScreen from "./ClientDetailScreen";

interface UseClientDetailResult {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseClientDetail = jest.fn<() => UseClientDetailResult>();

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

type ScreenProps = React.ComponentProps<typeof ClientDetailScreen>;

function buildProps(navigate: jest.Mock): ScreenProps {
  return {
    navigation: {
      navigate,
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
      <ClientDetailScreen {...buildProps(jest.fn())} />,
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
      <ClientDetailScreen {...buildProps(jest.fn())} />,
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
      <ClientDetailScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("3001234567")).toBeTruthy();
    expect(getByText("Notas: Cliente frecuente")).toBeTruthy();
    // Bug fix N-026: syncStatus is internal metadata, must not be visible.
    expect(queryByText(/syncStatus/i)).toBeNull();
    expect(queryByText(/pending/i)).toBeNull();
  });

  it("navigates to MeasurementCreate and MeasurementHistory", () => {
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
    const { getByText } = render(
      <ClientDetailScreen {...buildProps(navigate)} />,
    );

    fireEvent.press(getByText("Nueva medida"));
    expect(navigate).toHaveBeenCalledWith("MeasurementCreate", {
      clientId: client.id,
    });

    fireEvent.press(getByText("Ver historial"));
    expect(navigate).toHaveBeenCalledWith("MeasurementHistory", {
      clientId: client.id,
    });
  });
});
