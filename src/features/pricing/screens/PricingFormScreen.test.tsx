import { describe, it, expect, jest, afterEach } from "@jest/globals";
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import PricingFormScreen from "./PricingFormScreen";
import { pricingStrings } from "../domain/strings";

jest.mock("../hooks/usePricingForm", () => ({
  usePricingForm: jest.fn(),
}));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { id: "1" } }),
  useNavigation: () => ({ goBack: jest.fn() }),
}));
const { usePricingForm } = require("../hooks/usePricingForm");

describe("PricingFormScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("muestra loading", () => {
    usePricingForm.mockReturnValue({
      loading: true,
      error: null,
      initialValues: {},
      onSubmit: jest.fn(),
      submitting: false,
    });
    const { getByText } = render(<PricingFormScreen />);
    expect(getByText(pricingStrings.title + "...")).toBeTruthy();
  });

  it("renderiza formulario y pasa props correctos", () => {
    const onSubmit = jest.fn();
    usePricingForm.mockReturnValue({
      loading: false,
      error: null,
      initialValues: { name: "Dobladillo", price: 10000 },
      onSubmit,
      submitting: false,
    });
    const { getByText } = render(<PricingFormScreen />);
    expect(getByText(pricingStrings.addPricing)).toBeTruthy();
    expect(getByText(pricingStrings.save)).toBeTruthy();
  });

  it("muestra error si lo hay", () => {
    usePricingForm.mockReturnValue({
      loading: false,
      error: "fail",
      initialValues: {},
      onSubmit: jest.fn(),
      submitting: false,
    });
    const { getByText } = render(<PricingFormScreen />);
    expect(getByText("fail")).toBeTruthy();
  });
});
