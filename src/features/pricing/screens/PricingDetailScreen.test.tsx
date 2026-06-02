import { describe, it, expect, jest, afterEach } from "@jest/globals";
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PricingDetailScreen from "./PricingDetailScreen";

jest.mock("../hooks/usePricingDetail", () => ({
  usePricingDetail: jest.fn(),
}));
jest.mock("../../../data/local/PricingServiceRepositoryImpl", () => ({
  PricingServiceRepositoryImpl: jest.fn().mockImplementation(() => ({
    delete: jest.fn().mockImplementation(() => Promise.resolve()),
  })),
}));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { id: "1" } }),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn() }),
}));
const { usePricingDetail } = require("../hooks/usePricingDetail");

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
});
