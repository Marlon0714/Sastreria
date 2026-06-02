import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Alert, Text } from "react-native";
import { act, render } from "@testing-library/react-native";

import PricingFormScreen from "./PricingFormScreen";
import { pricingStrings } from "../domain/strings";
import { usePricingForm } from "../hooks/usePricingForm";
import type { CreatePricingServiceInput } from "../domain/pricingService";

type PricingFormComponentProps = {
  initialValues?: Partial<CreatePricingServiceInput>;
  onSubmit: (data: CreatePricingServiceInput) => void;
  submitting: boolean;
  error?: string | null;
};

const mockPricingForm = jest.fn((props: PricingFormComponentProps) => (
  <Text testID="pricing-form-props">{JSON.stringify(props.initialValues)}</Text>
));

jest.mock("../components/PricingForm", () => {
  return {
    __esModule: true,
    default: (props: PricingFormComponentProps) => mockPricingForm(props),
  };
});

jest.mock("../hooks/usePricingForm", () => ({
  usePricingForm: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

type RouteParams = { id?: string; category?: "arreglo" | "confeccion" };
let mockRouteParams: RouteParams = {};

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: mockRouteParams }),
  useNavigation: () => ({ goBack: mockGoBack, setOptions: mockSetOptions }),
}));

type UsePricingFormOptions = {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
};

type UsePricingFormReturn = ReturnType<typeof usePricingForm>;
const mockedUsePricingForm = jest.mocked(usePricingForm);

function mockUsePricingFormReturn(
  overrides: Partial<UsePricingFormReturn> = {},
): UsePricingFormReturn {
  return {
    loading: false,
    error: null,
    initialValues: {},
    onSubmit: jest.fn(async () => undefined),
    submitting: false,
    syncStatus: "synced",
    isOffline: false,
    ...overrides,
  };
}

describe("PricingFormScreen", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it("muestra loading cuando el hook esta cargando", () => {
    // Arrange
    mockedUsePricingForm.mockReturnValue(
      mockUsePricingFormReturn({ loading: true }),
    );

    // Act
    const { getByText } = render(<PricingFormScreen />);

    // Assert
    expect(getByText("Cargando servicio...")).toBeTruthy();
  });

  it("preselecciona categoria desde route params en modo creacion", () => {
    // Arrange
    mockRouteParams = { category: "confeccion" };
    mockedUsePricingForm.mockReturnValue(
      mockUsePricingFormReturn({
        initialValues: { name: "Nuevo servicio" },
      }),
    );

    // Act
    const { getByText } = render(<PricingFormScreen />);

    // Assert
    expect(getByText("Categoría: Confecciones")).toBeTruthy();
    expect(mockPricingForm).toHaveBeenCalledTimes(1);
    expect(mockPricingForm.mock.calls[0][0].initialValues?.category).toBe(
      "confeccion",
    );
    expect(mockSetOptions).toHaveBeenCalledWith({
      title: pricingStrings.addPricing,
    });
  });

  it("con id usa titulo de edicion y conserva initialValues del hook", () => {
    // Arrange
    mockRouteParams = { id: "service-1", category: "confeccion" };
    mockedUsePricingForm.mockReturnValue(
      mockUsePricingFormReturn({
        initialValues: {
          name: "Dobladillo",
          category: "arreglo",
        },
      }),
    );

    // Act
    render(<PricingFormScreen />);

    // Assert
    expect(mockSetOptions).toHaveBeenCalledWith({
      title: pricingStrings.editPricing,
    });
    expect(mockPricingForm.mock.calls[0][0].initialValues?.category).toBe(
      "arreglo",
    );
  });

  it("ejecuta callback de exito y navega hacia atras", () => {
    // Arrange
    let capturedOptions: UsePricingFormOptions | undefined;
    mockedUsePricingForm.mockImplementation((_, options) => {
      capturedOptions = options;
      return mockUsePricingFormReturn();
    });
    render(<PricingFormScreen />);

    // Act
    act(() => {
      capturedOptions?.onSuccess?.();
    });

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("ejecuta callback de error y muestra alerta", () => {
    // Arrange
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    let capturedOptions: UsePricingFormOptions | undefined;
    mockedUsePricingForm.mockImplementation((_, options) => {
      capturedOptions = options;
      return mockUsePricingFormReturn();
    });
    render(<PricingFormScreen />);

    // Act
    act(() => {
      capturedOptions?.onError?.("No fue posible guardar");
    });

    // Assert
    expect(alertSpy).toHaveBeenCalledWith(
      pricingStrings.saveError,
      "No fue posible guardar",
    );
  });
});
