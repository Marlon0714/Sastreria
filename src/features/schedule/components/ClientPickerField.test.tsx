import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Alert } from "react-native";

import type { Client, CreateClientDTO } from "../../clients/domain/types";
import { ClientPickerField } from "./ClientPickerField";

function ControlledHarness({ initialClientId }: { initialClientId?: string }) {
  const [clientId, setClientId] = useState<string | undefined>(
    initialClientId,
  );
  return (
    <ClientPickerField
      clientId={clientId}
      onChangeClientId={setClientId}
      onChangeUnregisteredName={jest.fn()}
    />
  );
}

const mockFindAll = jest.fn<() => Promise<Client[]>>();
const mockCreate = jest.fn<(dto: CreateClientDTO) => Promise<Client>>();

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({
    findAll: () => mockFindAll(),
    create: (dto: CreateClientDTO) => mockCreate(dto),
  }),
}));

const clients: Client[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Ana",
    lastName: "Torres",
    phone: "3001234567",
    notes: null,
    measurements: [],
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    syncStatus: "pending",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    firstName: "Juan",
    lastName: "Pérez",
    phone: "3009998877",
    notes: null,
    measurements: [],
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    syncStatus: "pending",
  },
];

const newClient: Client = {
  id: "33333333-3333-4333-8333-333333333333",
  firstName: "María",
  lastName: "Gómez",
  phone: "3005554433",
  notes: null,
  measurements: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncStatus: "pending",
};

describe("ClientPickerField", () => {
  beforeEach(() => {
    mockFindAll.mockReset();
    mockCreate.mockReset();
    mockFindAll.mockResolvedValue(clients);
  });

  it("muestra un campo de nombre vacío cuando no hay cliente ni nombre", async () => {
    const { findByLabelText } = render(
      <ClientPickerField
        onChangeClientId={jest.fn()}
        onChangeUnregisteredName={jest.fn()}
      />,
    );

    expect((await findByLabelText("Nombre del cliente")).props.value).toBe("");
  });

  it("muestra el nombre del cliente vinculado como chip, no como texto editable", async () => {
    const { findByText, queryByLabelText } = render(
      <ClientPickerField
        clientId={clients[0]!.id}
        onChangeClientId={jest.fn()}
        onChangeUnregisteredName={jest.fn()}
      />,
    );

    expect(await findByText("Ana Torres")).toBeTruthy();
    expect(queryByLabelText("Nombre del cliente")).toBeNull();
  });

  it("al escribir un nombre, se reporta como nombre sin registrar", async () => {
    const onChangeUnregisteredName = jest.fn();
    const { findByLabelText } = render(
      <ClientPickerField
        onChangeClientId={jest.fn()}
        onChangeUnregisteredName={onChangeUnregisteredName}
      />,
    );

    fireEvent.changeText(
      await findByLabelText("Nombre del cliente"),
      "Pedro",
    );

    expect(onChangeUnregisteredName).toHaveBeenCalledWith("Pedro");
  });

  it("borrar el texto reporta el nombre sin registrar como undefined", async () => {
    const onChangeUnregisteredName = jest.fn();
    const { findByLabelText } = render(
      <ClientPickerField
        unregisteredName="Pedro"
        onChangeClientId={jest.fn()}
        onChangeUnregisteredName={onChangeUnregisteredName}
      />,
    );

    fireEvent.changeText(await findByLabelText("Nombre del cliente"), "");

    expect(onChangeUnregisteredName).toHaveBeenCalledWith(undefined);
  });

  it("sugiere clientes existentes que coinciden con el nombre escrito", async () => {
    const { findByLabelText, getByText, queryByText } = render(
      <ClientPickerField
        onChangeClientId={jest.fn()}
        onChangeUnregisteredName={jest.fn()}
      />,
    );

    fireEvent.changeText(
      await findByLabelText("Nombre del cliente"),
      "juan",
    );

    expect(getByText("Juan Pérez")).toBeTruthy();
    expect(getByText("3009998877")).toBeTruthy();
    expect(queryByText("Ana Torres")).toBeNull();
  });

  it("elegir una sugerencia vincula el cliente y limpia el nombre sin registrar", async () => {
    const onChangeClientId = jest.fn();
    const onChangeUnregisteredName = jest.fn();
    const { findByLabelText, getByLabelText } = render(
      <ClientPickerField
        onChangeClientId={onChangeClientId}
        onChangeUnregisteredName={onChangeUnregisteredName}
      />,
    );

    fireEvent.changeText(
      await findByLabelText("Nombre del cliente"),
      "juan",
    );
    fireEvent.press(getByLabelText("Elegir a Juan Pérez (3009998877)"));

    expect(onChangeClientId).toHaveBeenCalledWith(clients[1]!.id);
    expect(onChangeUnregisteredName).toHaveBeenCalledWith(undefined);
  });

  it("permite cambiar un cliente ya vinculado para volver a escribir un nombre", async () => {
    const { findByLabelText, getByLabelText } = render(
      <ControlledHarness initialClientId={clients[0]!.id} />,
    );

    fireEvent.press(await findByLabelText("Cambiar cliente"));

    expect(getByLabelText("Nombre del cliente")).toBeTruthy();
  });

  it("muestra un mensaje de error cuando se provee", async () => {
    const { findByText } = render(
      <ClientPickerField
        onChangeClientId={jest.fn()}
        onChangeUnregisteredName={jest.fn()}
        errorMessage="El cliente es inválido"
      />,
    );

    expect(await findByText("El cliente es inválido")).toBeTruthy();
  });

  describe("registrar cliente", () => {
    it("crea un cliente nuevo con el nombre ya escrito, apellido y teléfono opcional, y lo vincula", async () => {
      mockCreate.mockResolvedValueOnce(newClient);
      const onChangeClientId = jest.fn();
      const onChangeUnregisteredName = jest.fn();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={onChangeClientId}
          onChangeUnregisteredName={onChangeUnregisteredName}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "María",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Gómez",
      );
      fireEvent.changeText(
        getByLabelText("Teléfono del cliente nuevo"),
        "300 555 4433",
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          firstName: "María",
          lastName: "Gómez",
          phone: "3005554433",
        });
      });
      expect(onChangeClientId).toHaveBeenCalledWith(newClient.id);
      expect(onChangeUnregisteredName).toHaveBeenCalledWith(undefined);
    });

    it("requiere nombre y apellido antes de crear", async () => {
      const { findByLabelText, getByLabelText, findByText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.press(await findByLabelText("Registrar cliente"));
      fireEvent.press(getByLabelText("Crear cliente"));

      expect(
        await findByText("Nombre y apellido son obligatorios."),
      ).toBeTruthy();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("advierte si el nombre ya existe y permite usar el cliente existente en vez de crear uno nuevo", async () => {
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const useExisting = buttons?.find(
          (b) => b.text === "Usar este cliente",
        );
        void useExisting?.onPress?.();
      });
      const onChangeClientId = jest.fn();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={onChangeClientId}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(await findByLabelText("Nombre del cliente"), "Ana");
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Torres",
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      expect(onChangeClientId).toHaveBeenCalledWith(clients[0]!.id);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("permite crear de todos modos aunque el nombre coincida con un cliente existente", async () => {
      mockCreate.mockResolvedValueOnce(newClient);
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const createAnyway = buttons?.find(
          (b) => b.text === "Crear de todos modos",
        );
        void createAnyway?.onPress?.();
      });
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(await findByLabelText("Nombre del cliente"), "Ana");
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Torres",
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });

    it("no deja crear un cliente con números en el nombre o apellido", async () => {
      const { findByLabelText, getByLabelText, findByText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "María2",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Gómez",
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      expect(
        await findByText("Nombre y apellido solo pueden contener letras."),
      ).toBeTruthy();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("no deja crear un cliente con un teléfono con letras", async () => {
      const { findByLabelText, getByLabelText, findByText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "María",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Gómez",
      );
      fireEvent.changeText(
        getByLabelText("Teléfono del cliente nuevo"),
        "abc123",
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      expect(
        await findByText("El teléfono solo puede contener números."),
      ).toBeTruthy();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("advierte si el teléfono ya está registrado y permite guardar de todos modos", async () => {
      mockCreate.mockResolvedValueOnce(newClient);
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const saveAnyway = buttons?.find(
          (b) => b.text === "Guardar de todos modos",
        );
        void saveAnyway?.onPress?.();
      });
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "María",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Gómez",
      );
      fireEvent.changeText(
        getByLabelText("Teléfono del cliente nuevo"),
        clients[0]!.phone,
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });

    it("cancela el registro y vuelve al campo de nombre", async () => {
      const { findByLabelText, getByLabelText, queryByLabelText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.press(await findByLabelText("Registrar cliente"));
      expect(getByLabelText("Apellido del cliente nuevo")).toBeTruthy();

      fireEvent.press(getByLabelText("Cancelar registro de cliente"));

      expect(queryByLabelText("Apellido del cliente nuevo")).toBeNull();
      expect(getByLabelText("Nombre del cliente")).toBeTruthy();
    });
  });
});
