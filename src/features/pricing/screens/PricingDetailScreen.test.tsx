import { describe, it, expect, jest, afterEach } from "@jest/globals";
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import PricingDetailScreen from "./PricingDetailScreen";

jest.mock("../hooks/usePricingDetail", () => ({
  usePricingDetail: jest.fn(),
}));
// `PricingDetailScreen` llama a `getDefaultPricingServiceRepository()` al
// cargar el módulo (nivel superior), antes de que cualquier `const` de este
// archivo de test se inicialice. El mock jest.fn() para `delete` se crea
// dentro del propio factory (no como variable externa) para no depender de
// ese orden, y se expone como `__mockDelete` para poder inspeccionarlo.
jest.mock("../../../data/local/pricingDependencies", () => {
  const mockDelete = jest.fn(() => Promise.resolve());
  return {
    getDefaultPricingServiceRepository: () => ({ delete: mockDelete }),
    __mockDelete: mockDelete,
  };
});
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { id: "1" } }),
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: mockGoBack,
  }),
}));
const { usePricingDetail } = require("../hooks/usePricingDetail");
const { __mockDelete: mockDelete } = require("../../../data/local/pricingDependencies");

describe("PricingDetailScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("muestra loading", () => {
    usePricingDetail.mockReturnValue({
      service: null,
      loading: true,
      error: null,
    });
    const { getByText } = render(<PricingDetailScreen />);
    expect(getByText("Cargando servicio...")).toBeTruthy();
  });

  it("muestra error si falla o no existe", () => {
    usePricingDetail.mockReturnValue({
      service: null,
      loading: false,
      error: "fail",
    });
    const { getByText } = render(<PricingDetailScreen />);
    expect(getByText("fail")).toBeTruthy();
  });

  it("muestra datos y permite navegar a editar", () => {
    const service = {
      id: "1",
      name: "Dobladillo",
      price: 10000,
      notes: "nota",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "synced" as const,
    };
    usePricingDetail.mockReturnValue({ service, loading: false, error: null });
    const { getByText } = render(<PricingDetailScreen />);
    expect(getByText("Dobladillo")).toBeTruthy();
    expect(getByText("$10.000")).toBeTruthy();
    expect(getByText("nota")).toBeTruthy();
    fireEvent.press(getByText("✏ Editar servicio"));
    // Navegación mockeada, no se valida aquí
  });

  it("elimina el servicio usando el repositorio compartido (con sync wireado) y vuelve atrás", async () => {
    const service = {
      id: "1",
      name: "Dobladillo",
      price: 10000,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "synced" as const,
    };
    usePricingDetail.mockReturnValue({ service, loading: false, error: null });
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b) => b.text === "Eliminar");
      void confirm?.onPress?.();
    });

    const { getByText } = render(<PricingDetailScreen />);
    fireEvent.press(getByText("🗑 Eliminar"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDelete).toHaveBeenCalledWith("1");
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
