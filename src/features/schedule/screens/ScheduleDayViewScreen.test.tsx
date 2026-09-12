import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type React from "react";

import type { Client } from "../../clients/domain/types";
import { useIdentityStore } from "../../../shared/state/identityStore";
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
const mockScheduleGetAll = jest.fn<() => Promise<Schedule[]>>();
const mockScheduleUpdate =
  jest.fn<(id: string, data: Partial<Schedule>) => Promise<Schedule>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    getAll: () => mockScheduleGetAll(),
    update: (id: string, data: Partial<Schedule>) =>
      mockScheduleUpdate(id, data),
  }),
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

jest.mock("../../../shared/components/ScheduleDateTimePickerField", () => {
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
const mockRequireIdentity = jest.fn(async () => ({
  profile: { id: "user-1", displayName: "Ana", role: "operario" },
  verified: true,
}));

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
    requireIdentity: mockRequireIdentity,
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
  isOwnerFlagged: false,
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
  isOwnerFlagged: false,
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
  isOwnerFlagged: false,
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
    mockScheduleGetAll.mockReset();
    mockScheduleGetAll.mockResolvedValue([]);
    mockScheduleUpdate.mockReset();
    useIdentityStore.getState().reset();
    mockMarkReady.mockReset();
    mockMarkDelivered.mockReset();
    mockAssignOperario.mockReset();
    mockGetOperarios.mockReset();
    mockGetOperarios.mockResolvedValue([]);
    mockReleaseIdentity.mockClear();
    mockRequireIdentity.mockClear();
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

  it("muestra el buscador antes que el filtro de categoría/vista", () => {
    const { toJSON } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    const serialized = JSON.stringify(toJSON());
    const searchIndex = serialized.indexOf("Buscar por cliente");
    const filterIndex = serialized.indexOf("✂️ Arreglos");

    expect(searchIndex).toBeGreaterThan(-1);
    expect(filterIndex).toBeGreaterThan(-1);
    expect(searchIndex).toBeLessThan(filterIndex);
  });

  it("el chip colapsado muestra siempre el conteo de la opción activa (N-109: un solo número, no un bloque fijo aparte)", () => {
    const { getByText, getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    // Por defecto (Arreglo activo), sin nada agendado.
    expect(getByText("✂️ Arreglos (0)")).toBeTruthy();

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver confecciones"));

    expect(getByText("🧵 Confecciones (0)")).toBeTruthy();

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver turnos pendientes"));

    expect(getByText(/📋 Pendientes \(\d+\)/)).toBeTruthy();
  });

  it("permite cambiar a la vista de pendientes desde el desplegable de filtro", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [pendingOne],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByText, getByLabelText, findByLabelText, queryByText } =
      render(<ScheduleDayViewScreen {...buildProps(jest.fn())} />);

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver turnos pendientes"));

    expect(getByText("📋 Pendientes (1)")).toBeTruthy();
    expect(
      await findByLabelText("Ver turno de Ana Torres (Sin fecha, schedule-2)"),
    ).toBeTruthy();
    // Al cambiar de vista, la agenda del día deja de mostrarse.
    expect(queryByText("No hay turnos para este día.")).toBeNull();
  });

  it("muestra un estado vacío propio en la vista de pendientes", async () => {
    const { getByLabelText, findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver turnos pendientes"));

    expect(
      await findByText("No hay turnos pendientes sin fecha."),
    ).toBeTruthy();
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

  it("muestra 'Ir a hoy' tras navegar a otro día, y vuelve a hoy al presionarlo", () => {
    const { getByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Ir al Dom 16"));
    expect(getByLabelText("Ir a hoy")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir a hoy"));
    expect(queryByLabelText("Ir a hoy")).toBeNull();
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-15");
  });

  it("muestra la tira de la semana y permite saltar a un día tocándolo", () => {
    const { getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(getByLabelText("Ir al Lun 10")).toBeTruthy();
    expect(getByLabelText("Ir al Dom 16")).toBeTruthy();

    fireEvent.press(getByLabelText("Ir al Jue 13"));

    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-13");
  });

  it("navega a la semana anterior/siguiente con las flechas de la tira", () => {
    const { getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Semana anterior"));
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-08");

    fireEvent.press(getByLabelText("Semana siguiente"));
    fireEvent.press(getByLabelText("Semana siguiente"));
    expect(mockUseScheduleDayView).toHaveBeenLastCalledWith("2026-08-22");
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

    const { queryByText, findByLabelText, getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(navigate)} />,
    );

    // Por defecto (Arreglo) solo se ve el turno de arreglo.
    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();
    expect(
      queryByText("Ver turno de Ana Torres (09:00, schedule-3)"),
    ).toBeNull();

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver confecciones"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (09:00, schedule-3)"),
    ).toBeTruthy();

    fireEvent.press(getByLabelText("Nuevo turno"));
    expect(navigate).toHaveBeenCalledWith("ScheduleForm", {
      category: "confeccion",
    });
  });

  it("regresión: en la opción Día solo se ve la categoría activa por defecto, y cambia al elegir la otra en el desplegable", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne, confeccionOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { queryByLabelText, findByLabelText, getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(
      await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeTruthy();
    expect(
      queryByLabelText("Ver turno de Ana Torres (09:00, schedule-3)"),
    ).toBeNull();

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver confecciones"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (09:00, schedule-3)"),
    ).toBeTruthy();
    expect(
      queryByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeNull();
  });

  it("al elegir 'Ver turnos pendientes' se ven los pendientes de ambas categorías, sin importar cuál estaba activa", async () => {
    const pendingConfeccion: Schedule = {
      ...pendingOne,
      id: "schedule-pendiente-confeccion",
      category: "confeccion",
    };
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [pendingOne, pendingConfeccion],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    // Categoría activa por defecto es "arreglo": antes de este cambio,
    // "Pendientes" solo mostraba los pendientes de esa categoría.
    const { getByLabelText, findByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver turnos pendientes"));

    expect(
      await findByLabelText("Ver turno de Ana Torres (Sin fecha, schedule-2)"),
    ).toBeTruthy();
    expect(
      await findByLabelText(
        "Ver turno de Ana Torres (Sin fecha, schedule-pendiente-confeccion)",
      ),
    ).toBeTruthy();
  });

  it("con 'Pendientes' activo, el desplegable muestra las 3 opciones con sus conteos y marca 'Pendientes' como seleccionada", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne, confeccionOne],
      pendingSchedules: [pendingOne],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getByLabelText, getAllByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver turnos pendientes"));

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));

    // Con "Pendientes" activo, ninguna de las otras 2 opciones está también
    // en el chip colapsado: estos 2 conteos solo viven acá, dentro del
    // desplegable.
    expect(getAllByText("✂️ Arreglos (1)")).toHaveLength(1);
    expect(getAllByText("🧵 Confecciones (1)")).toHaveLength(1);
    // "📋 Pendientes (1)" aparece 2 veces: una en el chip colapsado (siempre
    // visible cuando "Pendientes" es la opción activa) y otra en su fila
    // dentro del desplegable — redundancia visual esperada mientras está
    // abierto, no un error.
    expect(getAllByText("📋 Pendientes (1)")).toHaveLength(2);
    expect(
      getByLabelText("Ver turnos pendientes").props.accessibilityState
        ?.checked,
    ).toBe(true);
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

    it("al marcar un turno como entregado con una búsqueda activa, desaparece de los resultados de búsqueda sin salir de la pantalla", async () => {
      const searchedSchedule: Schedule = {
        ...scheduledOne,
        id: "schedule-buscado",
        operarioId: "op-1",
        date: "2026-08-20",
        time: "10:00",
        // Precio ya saldado (price === abono): este test cubre el refresco
        // de resultados de búsqueda al entregar, no el aviso de precio
        // faltante/saldo pendiente (ver deliveryGuard.test.ts y los casos
        // dedicados en ScheduleQuickActionSheet.test.tsx) — sin esto,
        // "Marcar entregado" dispararía el Alert de "Precio no registrado"
        // en vez de llamar directo a markDelivered.
        price: 100000,
        abono: 100000,
      };
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });
      // Primera llamada (al enfocar la pantalla): el turno todavía no está
      // entregado, aparece en los resultados. Segunda llamada (tras marcar
      // entregado desde el panel rápido): `allSchedules` debe refrescarse
      // para que `searchResults` deje de incluirlo de inmediato.
      mockScheduleGetAll
        .mockResolvedValueOnce([searchedSchedule])
        .mockResolvedValueOnce([{ ...searchedSchedule, status: "entregado" }]);
      mockMarkDelivered.mockResolvedValueOnce({
        ...searchedSchedule,
        status: "entregado",
      });

      const { getByLabelText, findByLabelText, queryByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.changeText(
        getByLabelText("Buscar cliente en la agenda"),
        "ana",
      );

      fireEvent.press(
        await findByLabelText(
          "Ver turno de Ana Torres (Jueves 20 de agosto · 10:00, schedule-buscado)",
        ),
      );

      fireEvent.press(await findByLabelText("Marcar entregado"));

      await waitFor(() => {
        expect(mockMarkDelivered).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(
          queryByLabelText(
            "Ver turno de Ana Torres (Jueves 20 de agosto · 10:00, schedule-buscado)",
          ),
        ).toBeNull();
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

  it("muestra el saldo pendiente (no el precio total) cuando el turno tiene abono", async () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [{ ...scheduledOne, price: 100000, abono: 30000 }],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    expect(await findByText("Saldo $70.000")).toBeTruthy();
    expect(
      await findByText("Precio $100.000 · Abono $30.000"),
    ).toBeTruthy();
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

  it("el desplegable de filtro muestra a la vez el conteo de Arreglos y de Confecciones del día", () => {
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [
        scheduledOne,
        { ...scheduledOne, id: "schedule-4" },
        confeccionOne,
      ],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });

    const { getAllByText, getByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));

    // "Arreglos" es la opción activa por defecto: su conteo aparece 2 veces
    // (chip colapsado + su fila en el desplegable). "Confecciones" no es la
    // activa, así que solo aparece 1 vez, dentro del desplegable — ya no
    // existe el bloque fijo junto al header de fecha que antes la repetía.
    expect(getAllByText("✂️ Arreglos (2)")).toHaveLength(2);
    expect(getAllByText("🧵 Confecciones (1)")).toHaveLength(1);
  });

  it("al buscar, muestra todas las coincidencias no entregadas sin importar la fecha", async () => {
    mockFindAll.mockResolvedValue([client, secondClient]);
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    mockScheduleGetAll.mockResolvedValue([
      scheduledOne,
      {
        ...scheduledOne,
        id: "schedule-luis-otro-dia",
        clientId: secondClient.id,
        date: "2026-08-20",
        time: "10:00",
      },
    ]);

    const { getByLabelText, findByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)");

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "luis",
    );

    expect(
      await findByLabelText(
        "Ver turno de Luis Gómez (Jueves 20 de agosto · 10:00, schedule-luis-otro-dia)",
      ),
    ).toBeTruthy();
    // El turno de Ana ya no aparece: dejó de mostrar "el día seleccionado"
    // para mostrar únicamente las coincidencias de la búsqueda.
    expect(
      queryByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
    ).toBeNull();
    // No saltó de fecha — la Agenda se quedó en el día que estaba (2026-08-15).
    expect(mockUseScheduleDayView).not.toHaveBeenCalledWith("2026-08-20");
  });

  it("el conteo de 'Arreglos' del desplegable cuenta cruzando fechas cuando hay búsqueda activa, aun estando en 'Pendientes'", async () => {
    const arregloMatch1: Schedule = {
      ...scheduledOne,
      id: "schedule-a1",
      date: "2026-08-20",
      status: "agendado",
    };
    const arregloMatch2: Schedule = {
      ...scheduledOne,
      id: "schedule-a2",
      date: "2026-08-21",
      status: "en_proceso",
    };
    const arregloEntregado: Schedule = {
      ...scheduledOne,
      id: "schedule-a3",
      date: "2026-08-22",
      status: "entregado",
    };
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    mockScheduleGetAll.mockResolvedValue([
      arregloMatch1,
      arregloMatch2,
      arregloEntregado,
    ]);

    const { getByLabelText, findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));
    fireEvent.press(getByLabelText("Ver turnos pendientes"));

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "ana",
    );

    fireEvent.press(getByLabelText("Cambiar filtro de agenda"));

    // 2, no 0: si el conteo dependiera de `isSearchingDia` (que exige
    // `activeView === "dia"`) daría 0 acá, porque `activeView` sigue siendo
    // "pendientes" en este punto.
    expect(await findByText("✂️ Arreglos (2)")).toBeTruthy();
  });

  it("al buscar, un resultado con fecha pero sin hora no muestra el separador de hora", async () => {
    mockFindAll.mockResolvedValue([client, secondClient]);
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [scheduledOne],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    mockScheduleGetAll.mockResolvedValue([
      scheduledOne,
      {
        ...scheduledOne,
        id: "schedule-luis-sin-hora",
        clientId: secondClient.id,
        date: "2026-08-20",
        time: undefined,
      },
    ]);

    const { getByLabelText, findByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)");

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "luis",
    );

    expect(
      await findByLabelText(
        "Ver turno de Luis Gómez (Jueves 20 de agosto, schedule-luis-sin-hora)",
      ),
    ).toBeTruthy();
  });

  it("no muestra turnos ya entregados entre las coincidencias de búsqueda", async () => {
    mockFindAll.mockResolvedValue([client, secondClient]);
    mockUseScheduleDayView.mockReturnValue({
      dateSchedules: [],
      pendingSchedules: [],
      isLoading: false,
      error: null,
      reload: jest.fn(async () => Promise.resolve()),
    });
    mockScheduleGetAll.mockResolvedValue([
      {
        ...scheduledOne,
        id: "schedule-luis-entregado",
        clientId: secondClient.id,
        status: "entregado",
      },
    ]);

    const { getByLabelText, findByText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "luis",
    );

    expect(
      await findByText("No hay turnos que coincidan con la búsqueda."),
    ).toBeTruthy();
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
    mockScheduleGetAll.mockResolvedValue([
      scheduledOne,
      { ...scheduledOne, id: "schedule-5", clientId: secondClient.id },
    ]);

    const { findByLabelText, getByLabelText, queryByLabelText } = render(
      <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
    );

    fireEvent.changeText(
      getByLabelText("Buscar cliente en la agenda"),
      "luis",
    );
    expect(
      await findByLabelText(
        "Ver turno de Luis Gómez (Sábado 15 de agosto · 14:30, schedule-5)",
      ),
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

  describe("marca del dueño (isOwnerFlagged)", () => {
    it("muestra la insignia solo si isOwnerFlagged=true y el rol es dueño", async () => {
      useIdentityStore.getState().setOwnProfile({
        id: "owner-1",
        displayName: "Dueño",
        role: "owner",
        isSharedDevice: false,
      });
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [{ ...scheduledOne, isOwnerFlagged: true }],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });

      const { findByText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      expect(await findByText("🔖 Marcado")).toBeTruthy();
    });

    it("con rol operario, ni el badge ni ningún prop/label relacionado se renderizan", async () => {
      useIdentityStore.getState().setOwnProfile({
        id: "operario-1",
        displayName: "Operario",
        role: "operario",
        isSharedDevice: false,
      });
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [{ ...scheduledOne, isOwnerFlagged: true, operarioId: "op-1" }],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });

      const { findByLabelText, queryByText, queryByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      expect(queryByText("🔖 Marcado")).toBeNull();

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );

      expect(queryByLabelText("Marcado")).toBeNull();
    });

    it("togglear desde el panel actualiza la tarjeta sin pasar por identityGate.requireIdentity", async () => {
      useIdentityStore.getState().setOwnProfile({
        id: "owner-1",
        displayName: "Dueño",
        role: "owner",
        isSharedDevice: false,
      });
      const reload = jest.fn(async () => Promise.resolve());
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [scheduledOne],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload,
      });
      mockScheduleUpdate.mockResolvedValueOnce({
        ...scheduledOne,
        isOwnerFlagged: true,
      });

      const { findByLabelText, getByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );

      fireEvent(getByLabelText("Marcado"), "valueChange", true);

      await waitFor(() => {
        expect(mockScheduleUpdate).toHaveBeenCalledWith(scheduledOne.id, {
          isOwnerFlagged: true,
        });
      });
      await waitFor(() => {
        expect(reload).toHaveBeenCalledTimes(2);
      });
      expect(mockRequireIdentity).not.toHaveBeenCalled();
      expect(mockMarkReady).not.toHaveBeenCalled();
      expect(mockMarkDelivered).not.toHaveBeenCalled();
      expect(mockAssignOperario).not.toHaveBeenCalled();
    });

    it("si falla el toggle, registra el error de forma estructurada y no rompe la pantalla", async () => {
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
      useIdentityStore.getState().setOwnProfile({
        id: "owner-1",
        displayName: "Dueño",
        role: "owner",
        isSharedDevice: false,
      });
      mockUseScheduleDayView.mockReturnValue({
        dateSchedules: [scheduledOne],
        pendingSchedules: [],
        isLoading: false,
        error: null,
        reload: jest.fn(async () => Promise.resolve()),
      });
      mockScheduleUpdate.mockRejectedValueOnce(new Error("boom"));

      const { findByLabelText, getByLabelText } = render(
        <ScheduleDayViewScreen {...buildProps(jest.fn())} />,
      );

      fireEvent.press(
        await findByLabelText("Ver turno de Ana Torres (14:30, schedule-1)"),
      );
      fireEvent(getByLabelText("Marcado"), "valueChange", true);

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining("No se pudo actualizar la marca del dueño"),
        );
      });
    });
  });
});
