import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type React from "react";

import type { Client } from "../../clients/domain/types";
import type { Schedule } from "../domain/types";
import ScheduleDayViewScreen from "./ScheduleDayViewScreen";

interface UseScheduleDayViewResult {
  dateSchedules: Schedule[];
  pendingSchedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const mockUseScheduleDayView = jest.fn<(date: string) => UseScheduleDayViewResult>();
const mockFindAll = jest.fn<() => Promise<Client[]>>();

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

jest.mock("../hooks/useScheduleDayView", () => ({
  useScheduleDayView: (date: string) => mockUseScheduleDayView(date),
}));

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({
    findAll: () => mockFindAll(),
  }),
}));

// "Hoy" fijo en 2026-08-15 sin usar fake timers globales (chocan con
// findBy*/waitFor de @testing-library, que dependen de setTimeout real).
jest.mock("../domain/dateUtils", () => {
  const actual = jest.requireActual(
    "../domain/dateUtils",
  ) as typeof import("../domain/dateUtils");
  return {
    ...actual,
    todayDateString: () => "2026-08-15",
  };
});

jest.mock("../components/ScheduleDateTimePickerField", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Pressable, Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return {
    ScheduleDateTimePickerField: ({
      value,
      onChange,
      accessibilityLabel,
    }: {
      value?: string;
      onChange: (value: string | undefined) => void;
      accessibilityLabel: string;
    }) =>
      ReactModule.createElement(
        Pressable,
        {
          accessibilityLabel,
          onPress: () => onChange("2026-08-20"),
        },
        ReactModule.createElement(Text, null, value ?? ""),
      ),
  };
});

const mockMarkReady = jest.fn<() => Promise<Schedule | null>>();
const mockMarkDelivered = jest.fn<() => Promise<Schedule | null>>();
const mockAssignOperario =
  jest.fn<(operarioId: string | undefined) => Promise<Schedule | null>>();
const mockReleaseIdentity = jest.fn();

const mockGetOperarios = jest.fn(async () => Promise.resolve<
  { id: string; displayName: string; role: string; isSharedDevice: boolean }[]
>([]));

jest.mock("../../../data/local/profilesCacheDependencies", () => ({
  getDefaultProfilesCacheRepository: () => ({
    getOperarios: () => mockGetOperarios(),
  }),
}));

jest.mock("../../auth/hooks/useIdentityGate", () => ({
  useIdentityGate: () => ({
    requireIdentity: jest.fn(async () => ({
      profile: { id: "user-1", displayName: "Ana", role: "operario" },
      verified: true,
    })),
    releaseIdentity: mockReleaseIdentity,
    isPinPromptVisible: false,
    pinError: null,
    submitPin: jest.fn(),
    cancelPinPrompt: jest.fn(),
    isOfflineActorPickerVisible: false,
    offlineOperarios: [],
    isLoadingOfflineOperarios: false,
    submitOfflineActor: jest.fn(),
    cancelOfflineActorPicker: jest.fn(),
  }),
}));

jest.mock("../hooks/useScheduleStatusActions", () => ({
  useScheduleStatusActions: () => ({
    isProcessing: false,
    error: null,
    markReady: () => mockMarkReady(),
    markDelivered: () => mockMarkDelivered(),
    applyCorrection: jest.fn(async () => Promise.resolve(null)),
    assignOperario: (operarioId: string | undefined) =>
      mockAssignOperario(operarioId),
  }),
}));

type ScreenProps = React.ComponentProps<typeof ScheduleDayViewScreen>;

function buildProps(navigate: jest.Mock): ScreenProps {
  return {
    navigation: { navigate } as unknown as ScreenProps["navigation"],
    route: {
      key: "ScheduleDayView-test",
      name: "ScheduleDayView",
      params: undefined,
    } as unknown as ScreenProps["route"],
  };
}

const client: Client = {
  id: "client-1",
  firstName: "Ana",
  lastName: "Torres",
  phone: "3001234567",
  notes: null,
  measurements: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncStatus: "pending",
};

const secondClient: Client = {
  id: "client-2",
  firstName: "Luis",
  lastName: "Gómez",
  phone: "3009876543",
  notes: null,
  measurements: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncStatus: "pending",
};

const scheduledOne: Schedule = {
  id: "schedule-1",
  clientId: client.id,
  date: "2026-08-15",
  time: "14:30",
  isPriority: false,
  category: "arreglo",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

const pendingOne: Schedule = {
  id: "schedule-2",
  clientId: client.id,
  isPriority: false,
  category: "arreglo",
  status: "pendiente",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

const confeccionOne: Schedule = {
  id: "schedule-3",
  clientId: client.id,
  date: "2026-08-15",
  time: "09:00",
  isPriority: false,
  category: "confeccion",
  status: "agendado",
  statusLocked: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ScheduleDayViewScreen", () => {
  beforeEach(() => {
    mockUseScheduleDayView.mockReset();
    mockFindAll.mockReset();
    mockFindAll.mockResolvedValue([client]);
    mockMarkReady.mockReset();
    mockMarkDelivered.mockReset();
    mockAssignOperario.mockReset();
    mockGetOperarios.mockReset();
    mockGetOperarios.mockResolvedValue([]);
    mockReleaseIdentity.mockClear();
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
  });

  it("muestra estado de carga", () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: true,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("Cargando agenda...")).toBeTruthy();
  });

  it("muestra error y permite reintentar", () => {
    const reload = jest.fn(async () => Promise.resolve());
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: false,
      error: "No se pudo cargar la agenda.",
      reload,
    });

    const { getByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("No se pudo cargar la agenda.")).toBeTruthy();
    fireEvent.press(getByText("Reintentar"));
    expect(reload).toHaveBeenCalled();
  });

  it("empieza en el día de hoy y no muestra 'Ir a hoy'", () => {
    const { getByText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(mockUseScheduleDayView).toHaveBeenCalledWith("2026-08-15");
    expect(getByText("No hay turnos para este día.")).toBeTruthy();
    expect(queryByLabelText("Ir a hoy")).toBeNull();
  });

  it("no muestra el badge de pendientes cuando no hay turnos sin fecha", () => {
    const { queryByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(queryByText("📋 Pendientes")).toBeTruthy();
    // El badge numérico solo aparece si pendingSchedules.length > 0.
    expect(queryByText("0")).toBeNull();
  });

  it("muestra el badge de pendientes y permite cambiar a esa vista desde el segmentado", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [pendingOne],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText, findByLabelText, queryByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("1")).toBeTruthy();

    fireEvent.press(getByText("📋 Pendientes"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (Sin fecha, schedule-2)"),
    ).toBeTruthy();
    // Al cambiar de vista, la agenda del día deja de mostrarse.
    expect(queryByText("No hay turnos para este día.")).toBeNull();
  });

  it("muestra un estado vacío propio en la vista de pendientes", () => {
    const { getByText, findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByText("📋 Pendientes"));

    expect(findByText("No hay turnos pendientes sin fecha.")).toBeTruthy();
  });

  it("marca los turnos prioritarios con una insignia", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [{ ...scheduledOne, isPriority: true }],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(await findByText("⭐ Prioritario")).toBeTruthy();
  });

  it("navega al día anterior y siguiente con las flechas", () => {
    const { getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Día anterior"));
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-14");

    fireEvent.press(getByLabelText("Día siguiente"));
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("muestra 'Ir a hoy' tras navegar a otro día, y vuelve a hoy al presionarlo", () => {
    const { getByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Día siguiente"));
    expect(getByLabelText("Ir a hoy")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir a hoy"));
    expect(queryByLabelText("Ir a hoy")).toBeNull();
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("salta a la fecha elegida en el selector", () => {
    const { getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Elegir fecha"));

    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-20");
  });

  it("filtra los turnos por categoría y el FAB crea uno con la categoría activa", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne, confeccionOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    const navigate = jest.fn();

    const { getByText, queryByText, findByLabelText, getByLabelText } =
      render(<ScheduleDayViewScreen {...buildProps(navigate)} />);

    // Por defecto (Arreglo) solo se ve el turno de arreglo.
    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();
    expect(
      queryByText("Ver turno de Ana Torres (09:00, schedule-3)"),
    ).toBeNull();

    fireEvent.press(getByText("🧵 Confección"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (09:00, schedule-3)"),
    ).toBeTruthy();

    fireEvent.press(getByLabelText("Nuevo turno"));
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {
      category: "confeccion",
    });
  });

  it("abre el panel rápido al presionar un turno, y navega al formulario completo desde ahí", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    const navigate = jest.fn();

    const { getByLabelText, findByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(navigate)} />,
    );

    fireEvent.press(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    );
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.press(await findByLabelText("Ver turno completo"));
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {
      scheduleId: scheduledOne.id,
    });

    fireEvent.press(getByLabelText("Nuevo turno"));
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {
      category: "arreglo",
    });
  });

  describe("panel rápido de acciones", () => {
    it("muestra las acciones según el estado del turno y marca listo sin salir de la Agenda", async () => {
      const reload = jest.fn(async () => Promise.resolve());
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [{ ...scheduledOne, operarioId: "op-1" }],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload,
      });
      mockMarkReady.mockResolvedValueOnce({
        ...scheduledOne,
        operarioId: "op-1",
        status: "listo_para_entregar",
      });

      const { findByLabelText, getByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );

      expect(getByLabelText("Marcar listo para entregar")).toBeTruthy();
      expect(getByLabelText("Marcar entregado")).toBeTruthy();

      fireEvent.press(getByLabelText("Marcar listo para entregar"));

      await waitFor(() => {
        expect(mockMarkReady).toHaveBeenCalledTimes(1);
      });
      // `reload` ya se llama una vez al enfocar la pantalla (useFocusEffect);
      // la acción rápida debe disparar una segunda corrida para refrescar
      // el estado de la tarjeta sin salir de la Agenda.
      await waitFor(() => {
        expect(reload).toHaveBeenCalledTimes(2);
      });
    });

    it("solo ofrece 'Marcar entregado' cuando el turno ya está listo para entregar", async () => {
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [
          { ...scheduledOne, status: "listo_para_entregar", operarioId: "op-1" },
        ],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });

      const { findByLabelText, queryByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );

      expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
      expect(await findByLabelText("Marcar entregado")).toBeTruthy();
    });

    it("permite asignar un operario desde el panel sin entrar al turno completo", async () => {
      mockGetOperarios.mockResolvedValue([
        {
          id: "operario-1",
          displayName: "Luis Gómez",
          role: "operario",
          isSharedDevice: false,
        },
      ]);
      const reload = jest.fn(async () => Promise.resolve());
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [scheduledOne],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload,
      });
      mockAssignOperario.mockResolvedValueOnce({
        ...scheduledOne,
        operarioId: "operario-1",
        status: "en_proceso",
      });

      const { findByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );
      fireEvent.press(await findByLabelText("Seleccionar operario"));
      fireEvent.press(await findByLabelText("Elegir a Luis Gómez"));

      await waitFor(() => {
        expect(mockAssignOperario).toHaveBeenCalledWith("operario-1");
      });
      await waitFor(() => {
        expect(reload).toHaveBeenCalledTimes(2);
      });
    });

    it("cierra el panel al presionar Cerrar", async () => {
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [scheduledOne],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });

      const { findByLabelText, getByLabelText, queryByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );
      expect(getByLabelText("Cerrar")).toBeTruthy();

      fireEvent.press(getByLabelText("Cerrar"));

      expect(queryByLabelText("Marcar listo para entregar")).toBeNull();
    });

  });

  it("muestra el precio en la card del turno cuando tiene precio", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [{ ...scheduledOne, price: 25000 }],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(await findByText("$25.000")).toBeTruthy();
  });

  it("no muestra precio en la card cuando el turno no tiene precio", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByLabelText, queryByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();
    expect(queryByText(/^\$/)).toBeNull();
  });

  it("muestra el contador de turnos del día en el segmentado", () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne, { ...scheduledOne, id: "schedule-4" }],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByText("2")).toBeTruthy();
  });

  it("no muestra el contador del día cuando no hay turnos", () => {
    const { queryByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(queryByText("0")).toBeNull();
  });

  it("filtra los turnos del día por nombre de cliente al buscar", async () => {
    mockFindAll.mockResolvedValue([client, secondClient]);
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [
        scheduledOne,
        { ...scheduledOne, id: "schedule-5", clientId: secondClient.id },
      ],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByLabelText, getByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();
    expect(
      getByLabelText("Ver turno de Luis Gómez (14:30, schedule-5)"),
    ).toBeTruthy();

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "luis",
    );

    expect(
      await findByLabelText("Ver turno de Luis Gómez (14:30, schedule-5)"),
    ).toBeTruthy();
    expect(
      queryByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeNull();
  });

  it("limpia la búsqueda al presionar el botón de limpiar", async () => {
    mockFindAll.mockResolvedValue([client, secondClient]);
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [
        scheduledOne,
        { ...scheduledOne, id: "schedule-5", clientId: secondClient.id },
      ],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByLabelText, getByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "luis",
    );
    expect(
      await findByLabelText("Ver turno de Luis Gómez (14:30, schedule-5)"),
    ).toBeTruthy();

    fireEvent.press(getByLabelText("Limpiar búsqueda"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();
    expect(
      queryByLabelText("Limpiar búsqueda"),
    ).toBeNull();
  });

  it("muestra un mensaje distinto cuando la búsqueda no tiene resultados", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByLabelText, getByLabelText, findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "nadie",
    );

    expect(
      await findByText("No hay turnos que coincidan con la búsqueda."),
    ).toBeTruthy();
  });

  it("muestra 'Cliente eliminado' cuando el clientId del turno ya no existe", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [{ ...scheduledOne, clientId: "client-borrado" }],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(
      await findByLabelText(
        "Ver turno de Cliente eliminado (14:30, schedule-1)",
      ),
    ).toBeTruthy();
  });

  it("muestra el nombre sin registrar cuando el turno no tiene clientId", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [
        {
          ...scheduledOne,
          clientId: undefined,
          unregisteredClientName: "Pedro Ramírez",
        },
      ],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(
      await findByLabelText(
        "Ver turno de Pedro Ramírez (14:30, schedule-1)",
      ),
    ).toBeTruthy();
  });
});
