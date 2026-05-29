import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PricingListScreen from "./PricingListScreen";
import { pricingStrings } from "../domain/strings";
import type { PricingService } from "../domain/pricingService";
import { usePricingServices } from "../hooks/usePricingServices";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

type PricingItemProps = {
  service: PricingService;
  onPress: () => void;
};

jest.mock("../components/PricingItem", () => {
  const ReactNative = jest.requireActual("react-native") as typeof import("react-native");
  return function PricingItemMock({ service, onPress }: PricingItemProps) {
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{service.name}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  };
});

jest.mock("../hooks/usePricingServices", () => ({
  usePricingServices: jest.fn(),
}));

type UsePricingServicesReturn = ReturnType<typeof usePricingServices>;
const mockedUsePricingServices = jest.mocked(usePricingServices);

function buildService(overrides: Partial<PricingService>): PricingService {
  return {
    id: "service-id",
    name: "Servicio",
    price: 10000,
    category: "arreglo",
    notes: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    syncStatus: "synced",
    ...overrides,
  };
}

function mockUsePricingServices(
  overrides: Partial<UsePricingServicesReturn> = {},
): UsePricingServicesReturn {
  const asyncNoop = async () => undefined;
  const asyncNoopWithId = async (_id: string) => undefined;
  const asyncNoopWithUpdate = async (
    _id: string,
    _input: Parameters<UsePricingServicesReturn["update"]>[1],
  ) => undefined;

  return {
    services: [],
    loading: false,
    error: null,
    refresh: jest.fn(asyncNoop),
    create: jest.fn(asyncNoop),
    update: jest.fn(asyncNoopWithUpdate),
    remove: jest.fn(asyncNoopWithId),
    syncStatus: "synced",
    isOffline: false,
    ...overrides,
  };
}

describe("PricingListScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("muestra estado de carga", () => {
    // Arrange
    mockedUsePricingServices.mockReturnValue(
      mockUsePricingServices({ loading: true }),
    );

    // Act
    const { getByText } = render(<PricingListScreen />);

    // Assert
    expect(getByText("Cargando precios...")).toBeTruthy();
  });

  it("muestra error y permite reintentar", () => {
    // Arrange
    const refreshMock = jest.fn(async () => undefined);
    mockedUsePricingServices.mockReturnValue(
      mockUsePricingServices({ error: "Fallo de red", refresh: refreshMock }),
    );

    // Act
    const { getByText } = render(<PricingListScreen />);
    fireEvent.press(getByText("Reintentar"));

    // Assert
    expect(getByText(pricingStrings.fetchError)).toBeTruthy();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("filtra por categoria usando segmented control y limpia la busqueda al cambiar tab", () => {
    // Arrange
    mockedUsePricingServices.mockReturnValue(
      mockUsePricingServices({
        services: [
          buildService({ id: "1", name: "Dobladillo", category: "arreglo" }),
          buildService({ id: "2", name: "Camisa completa", category: "confeccion" }),
        ],
      }),
    );
    const { getByPlaceholderText, getByText, queryByText } = render(
      <PricingListScreen />,
    );

    // Act
    fireEvent.changeText(getByPlaceholderText("Buscar en arreglos..."), "zzzz");
    fireEvent.press(getByText(/Confecciones/i));

    // Assert
    expect(getByPlaceholderText("Buscar en confecciones...")).toBeTruthy();
    expect(getByText("Camisa completa")).toBeTruthy();
    expect(queryByText("Sin resultados")).toBeNull();
  });

  it("navega a formulario con la categoria activa", () => {
    // Arrange
    mockedUsePricingServices.mockReturnValue(
      mockUsePricingServices({
        services: [buildService({ id: "2", category: "confeccion", name: "Camisa" })],
      }),
    );
    const { getByText, getByLabelText } = render(<PricingListScreen />);

    // Act
    fireEvent.press(getByText(/Confecciones/i));
    fireEvent.press(getByLabelText("Agregar confecciones"));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("PricingForm", {
      category: "confeccion",
    });
  });
});
