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
});
