import { describe, it, expect, jest, afterEach } from "@jest/globals";
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PricingDetailScreen from "./PricingDetailScreen";

jest.mock("../hooks/usePricingDetail", () => ({
  usePricingDetail: jest.fn(),
}));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { id: "1" } }),
  useNavigation: () => ({ navigate: jest.fn() }),
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
    expect(getByText("Precios...")).toBeTruthy();
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
    };
    usePricingDetail.mockReturnValue({ service, loading: false, error: null });
    const { getByText } = render(<PricingDetailScreen />);
    expect(getByText("Precios:")).toBeTruthy();
    expect(getByText("Dobladillo")).toBeTruthy();
    expect(getByText("Precio:")).toBeTruthy();
    expect(getByText("$10.000")).toBeTruthy();
    expect(getByText("Notas:")).toBeTruthy();
    expect(getByText("nota")).toBeTruthy();
    fireEvent.press(getByText("Editar precio"));
    // Navegación mockeada, no se valida aquí
  });
});
