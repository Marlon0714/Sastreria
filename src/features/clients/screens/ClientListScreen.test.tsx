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
const mockUnlockDebugMode = jest.fn<() => Promise<void>>();

jest.mock("../../../shared/state/debugModeStore", () => ({
  useDebugModeStore: (selector: (state: { unlock: () => Promise<void> }) => unknown) =>
    selector({ unlock: mockUnlockDebugMode }),
}));

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
    mockUnlockDebugMode.mockReset();
    mockUnlockDebugMode.mockResolvedValue();
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
    expect(getByLabelText("Total de clientes registrados")).toHaveTextContent(
      "2 clientes",
    );
  });

  it("shows the client count in singular when there is only one client", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({ id: "aaaa-1", firstName: "Ana", lastName: "Torres" }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByLabelText("Total de clientes registrados")).toHaveTextContent(
      "1 cliente",
    );
  });

  it("keeps the total client count unchanged while filtering the visible list", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({ id: "aaaa-1", firstName: "María", lastName: "García" }),
        clientFactory({ id: "aaaa-2", firstName: "Juan", lastName: "Pérez" }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente por nombre o telefono"),
      "maria",
    );

    expect(getByLabelText("Total de clientes registrados")).toHaveTextContent(
      "2 clientes",
    );
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

  it("shows sync badges for pending/error without exposing raw syncStatus text", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({
          id: "aaaa-1",
          firstName: "María",
          lastName: "García",
          phone: "3001112233",
          syncStatus: "pending",
        }),
        clientFactory({
          id: "aaaa-2",
          firstName: "Juan",
          lastName: "Pérez",
          phone: "3009998877",
          syncStatus: "error",
        }),
        clientFactory({
          id: "aaaa-3",
          firstName: "Luisa",
          lastName: "Rojas",
          phone: "3005551122",
          syncStatus: "synced",
        }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByText, getByLabelText, queryByText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByLabelText("Badge pendiente de sincronizacion")).toBeTruthy();
    expect(getByLabelText("Badge sincronizacion con error")).toBeTruthy();
    expect(getByText("Pendiente sync")).toBeTruthy();
    expect(getByText("Error sync")).toBeTruthy();
    expect(queryByText(/syncStatus:/i)).toBeNull();
    expect(queryByText("syncStatus: pending")).toBeNull();
    expect(queryByText("syncStatus: error")).toBeNull();
  });

  it("navega a ClientDetail al presionar una tarjeta de cliente", () => {
    // Arrange
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    const client = clientFactory({
      id: "bbbb-1",
      firstName: "Ana",
      lastName: "Torres",
      phone: "3001234567",
    });
    mockUseClientList.mockReturnValue({
      clients: [client],
      isLoading: false,
      error: null,
      reload,
    });

    const navigate = jest.fn();
    const { getByLabelText } = render(
      <ClientListScreen {...buildProps(navigate)} />,
    );

    // Act
    fireEvent.press(getByLabelText("Ver detalle de Ana Torres"));

    // Assert
    expect(navigate).toHaveBeenCalledWith("ClientDetail", {
      clientId: client.id,
    });
  });

  it("unlocks debug mode silently when the exact secret phrase is typed in search", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({ id: "aaaa-1", firstName: "Ana", lastName: "Torres" }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );
    const searchInput = getByLabelText(
      "Buscar cliente por nombre o telefono",
    );

    fireEvent.changeText(searchInput, "Modo Taller Oculto");

    expect(mockUnlockDebugMode).toHaveBeenCalledTimes(1);
    expect(searchInput.props.value).toBe("");
  });

  it("does not unlock debug mode on a normal search", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: [
        clientFactory({ id: "aaaa-1", firstName: "Ana", lastName: "Torres" }),
      ],
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente por nombre o telefono"),
      "ana",
    );

    expect(mockUnlockDebugMode).not.toHaveBeenCalled();
  });

  it("does not show the load more button when there are 20 clients or fewer", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: Array.from({ length: 20 }, (_, i) =>
        clientFactory({ id: `client-${i}`, firstName: `Cliente${i}` }),
      ),
      isLoading: false,
      error: null,
      reload,
    });

    const { queryByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    expect(queryByLabelText("Cargar más clientes")).toBeNull();
  });

  it("shows the load more button and reveals the rest of the clients on press", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: Array.from({ length: 25 }, (_, i) =>
        clientFactory({ id: `client-${i}`, firstName: `Cliente${i}` }),
      ),
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText, getByText, queryByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Mostrando 20 de 25")).toBeTruthy();

    fireEvent.press(getByLabelText("Cargar más clientes"));

    // All 25 now fit within the page size increment (20 + 20), so the
    // "load more" affordance disappears entirely.
    expect(queryByLabelText("Cargar más clientes")).toBeNull();
  });

  it("resets the visible count when the search term changes", () => {
    const reload = jest.fn<() => Promise<void>>().mockResolvedValue();
    mockUseClientList.mockReturnValue({
      clients: Array.from({ length: 25 }, (_, i) =>
        clientFactory({ id: `client-${i}`, firstName: `Cliente${i}` }),
      ),
      isLoading: false,
      error: null,
      reload,
    });

    const { getByLabelText, queryByLabelText } = render(
      <ClientListScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Cargar más clientes"));
    expect(queryByLabelText("Cargar más clientes")).toBeNull();

    fireEvent.changeText(
      getByLabelText("Buscar cliente por nombre o telefono"),
      "Cliente",
    );

    expect(getByLabelText("Cargar más clientes")).toBeTruthy();
  });
});
