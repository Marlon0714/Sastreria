import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import type React from "react";

import { clientFactory } from "../../../__tests__/factories";
import type {
  ClientRepository,
  ClientsDependencies,
  MeasurementRepository,
  TallaRepository,
} from "../domain/repository";
import type { Client, CreateClientDTO } from "../domain/types";
import { ClientsDependenciesProvider } from "../hooks/ClientsDependenciesProvider";
import ClientCreateScreen from "./ClientCreateScreen";

const mockFindAll = jest.fn<() => Promise<Client[]>>();
const mockCreate = jest.fn<(input: CreateClientDTO) => Promise<Client>>();

const mockClientRepository: ClientRepository = {
  create: (input: CreateClientDTO) => mockCreate(input),
  findAll: () => mockFindAll(),
  findById: jest.fn(async () => Promise.resolve(null)),
  update: jest.fn(async () => Promise.reject(new Error("unused"))),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

const noopMeasurementRepository: MeasurementRepository = {
  upsertCamisa: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertPantalon: jest.fn(async () => Promise.reject(new Error("unused"))),
  findCamisaByClientId: jest.fn(async () => Promise.resolve(null)),
  findPantalonByClientId: jest.fn(async () => Promise.resolve(null)),
  upsertSaco: jest.fn(async () => Promise.reject(new Error("unused"))),
  upsertChaleco: jest.fn(async () => Promise.reject(new Error("unused"))),
  findSacoByClientId: jest.fn(async () => Promise.resolve(null)),
  findChalecoByClientId: jest.fn(async () => Promise.resolve(null)),
};

const noopTallaRepository: TallaRepository = {
  upsert: jest.fn(async () => Promise.reject(new Error("unused"))),
  findByClientId: jest.fn(async () => Promise.resolve([])),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

const dependencies: ClientsDependencies = {
  clientRepository: mockClientRepository,
  measurementRepository: noopMeasurementRepository,
  tallaRepository: noopTallaRepository,
};

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(ClientsDependenciesProvider, { dependencies }, children);
}

type ScreenProps = React.ComponentProps<typeof ClientCreateScreen>;

function buildProps(replace: jest.Mock): ScreenProps {
  return {
    navigation: { replace } as unknown as ScreenProps["navigation"],
    route: {
      key: "ClientCreate-test",
      name: "ClientCreate",
      params: undefined,
    } as unknown as ScreenProps["route"],
  };
}

const existingClient = clientFactory({
  id: "existing-1",
  firstName: "Ana",
  lastName: "Torres",
  phone: "3001234567",
});

describe("ClientCreateScreen", () => {
  beforeEach(() => {
    mockFindAll.mockReset();
    mockCreate.mockReset();
    mockFindAll.mockResolvedValue([existingClient]);
  });

  it("crea un cliente nuevo cuando el nombre no coincide con ninguno existente", async () => {
    const created = clientFactory({ id: "new-1", firstName: "Juan", lastName: "Pérez" });
    mockCreate.mockResolvedValueOnce(created);
    const replace = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientCreateScreen {...buildProps(replace)} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText("Ej. Ana"), "Juan");
    fireEvent.changeText(getByPlaceholderText("Ej. Torres"), "Pérez");
    fireEvent.press(getByLabelText("Guardar cliente"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
    expect(replace).toHaveBeenCalledWith("ClientDetail", {
      clientId: created.id,
    });
  });

  it("advierte si el nombre ya existe y navega al cliente existente en vez de crear uno nuevo", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const viewExisting = buttons?.find(
        (b) => b.text === "Ver cliente existente",
      );
      void viewExisting?.onPress?.();
    });
    const replace = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientCreateScreen {...buildProps(replace)} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText("Ej. Ana"), "ana");
    fireEvent.changeText(getByPlaceholderText("Ej. Torres"), "torres");
    fireEvent.press(getByLabelText("Guardar cliente"));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("ClientDetail", {
        clientId: existingClient.id,
      });
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("permite crear de todos modos aunque el nombre coincida con un cliente existente", async () => {
    const created = clientFactory({ id: "new-2", firstName: "Ana", lastName: "Torres" });
    mockCreate.mockResolvedValueOnce(created);
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const createAnyway = buttons?.find(
        (b) => b.text === "Crear de todos modos",
      );
      void createAnyway?.onPress?.();
    });
    const replace = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientCreateScreen {...buildProps(replace)} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText("Ej. Ana"), "Ana");
    fireEvent.changeText(getByPlaceholderText("Ej. Torres"), "Torres");
    fireEvent.press(getByLabelText("Guardar cliente"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
    expect(replace).toHaveBeenCalledWith("ClientDetail", {
      clientId: created.id,
    });
  });

  it("advierte si el teléfono ya existe en otro cliente y permite guardar de todos modos", async () => {
    const created = clientFactory({
      id: "new-3",
      firstName: "Luis",
      lastName: "Gómez",
      phone: existingClient.phone,
    });
    mockCreate.mockResolvedValueOnce(created);
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const saveAnyway = buttons?.find(
        (b) => b.text === "Guardar de todos modos",
      );
      void saveAnyway?.onPress?.();
    });
    const replace = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientCreateScreen {...buildProps(replace)} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText("Ej. Ana"), "Luis");
    fireEvent.changeText(getByPlaceholderText("Ej. Torres"), "Gómez");
    fireEvent.changeText(
      getByPlaceholderText("Ej. 3001234567"),
      existingClient.phone,
    );
    fireEvent.press(getByLabelText("Guardar cliente"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
    expect(replace).toHaveBeenCalledWith("ClientDetail", {
      clientId: created.id,
    });
  });

  it("no destapa Teléfono 3 si Teléfono 2 sigue vacío, para no correr los teléfonos al guardar", async () => {
    const { getByLabelText, queryByLabelText } = render(
      <ClientCreateScreen {...buildProps(jest.fn())} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    expect(getByLabelText("Eliminar teléfono 2")).toBeTruthy();

    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    expect(queryByLabelText("Eliminar teléfono 3")).toBeNull();
  });

  it("detecta como duplicado un teléfono ya registrado como principal de otro cliente cuando se escribe en Teléfono 2", async () => {
    const created = clientFactory({
      id: "new-4",
      firstName: "Marta",
      lastName: "Ruiz",
    });
    mockCreate.mockResolvedValueOnce(created);
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const saveAnyway = buttons?.find(
        (b) => b.text === "Guardar de todos modos",
      );
      void saveAnyway?.onPress?.();
    });
    const replace = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientCreateScreen {...buildProps(replace)} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText("Ej. Ana"), "Marta");
    fireEvent.changeText(getByPlaceholderText("Ej. Torres"), "Ruiz");
    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    fireEvent.changeText(
      getByPlaceholderText("Ej. 3101234567"),
      existingClient.phone,
    );
    fireEvent.press(getByLabelText("Guardar cliente"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Teléfono ya registrado",
        expect.stringContaining(existingClient.firstName),
        expect.anything(),
      );
    });
    expect(mockCreate).toHaveBeenCalled();
  });

  it("al borrar manualmente Teléfono 2 dejando Teléfono 3 con valor, guarda ese número como Teléfono 2 (sin intercambio silencioso)", async () => {
    const created = clientFactory({ id: "new-5", firstName: "Pedro", lastName: "Lara" });
    mockCreate.mockResolvedValueOnce(created);
    const replace = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ClientCreateScreen {...buildProps(replace)} />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText("Ej. Ana"), "Pedro");
    fireEvent.changeText(getByPlaceholderText("Ej. Torres"), "Lara");
    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    fireEvent.changeText(getByPlaceholderText("Ej. 3101234567"), "3202223344");
    fireEvent.press(getByLabelText("Agregar teléfono adicional"));
    fireEvent.changeText(getByPlaceholderText("Ej. 6011234567"), "3505556677");

    // Borra manualmente el texto de Teléfono 2 (sin usar el ícono "x")
    fireEvent.changeText(getByPlaceholderText("Ej. 3101234567"), "");
    fireEvent.press(getByLabelText("Guardar cliente"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ phones: ["3505556677"] }),
      );
    });
  });
});
