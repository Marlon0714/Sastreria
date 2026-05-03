import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import type React from "react";

import { clientFactory } from "../../../__tests__/factories";
import ClientListScreen from "./ClientListScreen";

interface UseClientListResult {
  clients: ReturnType<typeof clientFactory>[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseClientList = jest.fn<() => UseClientListResult>();

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

jest.mock("../hooks/useClientList", () => {
  return {
    useClientList: () => mockUseClientList(),
  };
});

type ScreenProps = React.ComponentProps<typeof ClientListScreen>;

function buildProps(navigate: jest.Mock): ScreenProps {
  return {
    navigation: {
      navigate,
    } as unknown as ScreenProps["navigation"],
    route: {
      key: "ClientList-test",
      name: "ClientList",
      params: undefined,
    } as unknown as ScreenProps["route"],
  };
}

describe("ClientListScreen", () => {
  beforeEach(() => {
    mockUseClientList.mockReset();
  });

  it("renders loading state", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [],
      isLoading: true,
      error: null,
      reload,
    });

    const { getByText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Cargando clientes...")).toBeTruthy();
  });

  it("renders error state and retries", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [],
      isLoading: false,
      error: "No se pudo cargar la lista de clientes.",
      reload,
    });

    const navigationNavigate = jest.fn();
    const { getByText } = render(
      <ClientListScreen {...buildProps(navigationNavigate)} />,
    );

    expect(getByText("No se pudo cargar la lista de clientes.")).toBeTruthy();

    const callsBeforePress = reload.mock.calls.length;
    fireEvent.press(getByText("Reintentar"));
    expect(reload.mock.calls.length).toBe(callsBeforePress + 1);
  });

  it("renders empty state and navigates to create client", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [],
      isLoading: false,
      error: null,
      reload,
    });

    const navigationNavigate = jest.fn();
    const { getByText } = render(
      <ClientListScreen {...buildProps(navigationNavigate)} />,
    );

    expect(getByText("No hay clientes registrados.")).toBeTruthy();

    fireEvent.press(getByText("Crear nuevo cliente"));
    expect(navigationNavigate).toHaveBeenCalledWith("ClientCreate");
  });

  it("renders client list and shows search input with filter buttons", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({
          id: "aaaa-1",
          firstName: "María",
          lastName: "García",
          phone: "3001112233",
        }),
        clientFactory({
          id: "aaaa-2",
          firstName: "Juan",
          lastName: "Pérez",
          phone: "3009998877",
        }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByLabelText("Buscar cliente por nombre o telefono")).toBeTruthy();
    expect(getByLabelText("Filtro todos")).toBeTruthy();
    expect(getByLabelText("Filtro nombre")).toBeTruthy();
    expect(getByLabelText("Filtro telefono")).toBeTruthy();
  });

  it("filters clients by name when searching", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({
          id: "aaaa-1",
          firstName: "María",
          lastName: "García",
          phone: "3001112233",
        }),
        clientFactory({
          id: "aaaa-2",
          firstName: "Juan",
          lastName: "Pérez",
          phone: "3009998877",
        }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText, getByText, queryByText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente por nombre o telefono"),
      "maria",
    );

    expect(getByText("María García")).toBeTruthy();
    expect(queryByText("Juan Pérez")).toBeNull();
  });

  it("filters clients by phone when selecting phone filter", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({
          id: "aaaa-1",
          firstName: "María",
          lastName: "García",
          phone: "3001112233",
        }),
        clientFactory({
          id: "aaaa-2",
          firstName: "Juan",
          lastName: "Pérez",
          phone: "3009998877",
        }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText, getByText, queryByText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Filtro telefono"));
    fireEvent.changeText(
      getByLabelText("Buscar cliente por nombre o telefono"),
      "300999",
    );

    expect(getByText("Juan Pérez")).toBeTruthy();
    expect(queryByText("María García")).toBeNull();
  });

  it("shows no results message when search finds nothing", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({
          id: "aaaa-1",
          firstName: "María",
          lastName: "García",
          phone: "3001112233",
        }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText, getByText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente por nombre o telefono"),
      "zzz no existe",
    );

    expect(
      getByText("No hay clientes que coincidan con la busqueda."),
    ).toBeTruthy();
  });
});
