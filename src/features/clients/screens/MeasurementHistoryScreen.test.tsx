import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import type { Measurement } from "../domain/types";
import MeasurementHistoryScreen from "./MeasurementHistoryScreen";

interface UseClientMeasurementHistoryResult {
  measurements: Measurement[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseClientMeasurementHistory =
  jest.fn<(clientId: string) => UseClientMeasurementHistoryResult>();

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

jest.mock("../hooks/useClientMeasurementHistory", () => {
  return {
    useClientMeasurementHistory: (clientId: string) =>
      mockUseClientMeasurementHistory(clientId),
  };
});

type ScreenProps = React.ComponentProps<typeof MeasurementHistoryScreen>;

function buildProps(): ScreenProps {
  return {
    navigation: {} as ScreenProps["navigation"],
    route: {
      key: "MeasurementHistory-test",
      name: "MeasurementHistory",
      params: {
        clientId: "11111111-1111-4111-8111-111111111111",
      },
    } as unknown as ScreenProps["route"],
  };
}

describe("MeasurementHistoryScreen", () => {
  beforeEach(() => {
    mockUseClientMeasurementHistory.mockReset();
  });

  it("renders loading state", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientMeasurementHistory.mockReturnValue({
      measurements: [],
      isLoading: true,
      error: null,
      reload,
    });

    const { getByText } = render(
      <MeasurementHistoryScreen {...buildProps()} />,
    );

    expect(getByText("Cargando historial...")).toBeTruthy();
  });

  it("renders error state and retries", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientMeasurementHistory.mockReturnValue({
      measurements: [],
      isLoading: false,
      error: "No se pudo cargar el historial de medidas.",
      reload,
    });

    const { getByText } = render(
      <MeasurementHistoryScreen {...buildProps()} />,
    );

    expect(
      getByText("No se pudo cargar el historial de medidas."),
    ).toBeTruthy();

    const callsBeforePress = reload.mock.calls.length;
    fireEvent.press(getByText("Reintentar"));
    expect(reload.mock.calls.length).toBe(callsBeforePress + 1);
  });

  it("renders empty state", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientMeasurementHistory.mockReturnValue({
      measurements: [],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByText } = render(
      <MeasurementHistoryScreen {...buildProps()} />,
    );

    expect(
      getByText("Este cliente no tiene medidas registradas."),
    ).toBeTruthy();
  });
});
