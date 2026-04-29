import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type React from "react";

import type { Client } from "../domain/types";
import ClientDetailScreen from "./ClientDetailScreen";

const mockFindById = jest.fn<(id: string) => Promise<Client | null>>();

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

jest.mock("../../../data/local/ClientRepositoryImpl", () => {
  return {
    ClientRepositoryImpl: jest.fn().mockImplementation(() => ({
      findById: (id: string) => mockFindById(id),
    })),
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
    mockFindById.mockReset();
  });

  it("renders loading state while repository request is pending", () => {
    mockFindById.mockImplementation(
      () => new Promise<Client | null>(() => undefined),
    );

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Cargando detalle...")).toBeTruthy();
  });

  it("renders error state when repository fails", async () => {
    mockFindById.mockRejectedValueOnce(new Error("db failure"));

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn())} />,
    );

    await waitFor(() => {
      expect(
        getByText("No se pudo cargar el detalle del cliente."),
      ).toBeTruthy();
    });

    expect(getByText("Reintentar")).toBeTruthy();
  });

  it("treats missing client as UI error", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const { getByText } = render(
      <ClientDetailScreen {...buildProps(jest.fn())} />,
    );

    await waitFor(() => {
      expect(getByText("El cliente no existe o fue eliminado.")).toBeTruthy();
    });

    fireEvent.press(getByText("Reintentar"));
    expect(mockFindById).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
