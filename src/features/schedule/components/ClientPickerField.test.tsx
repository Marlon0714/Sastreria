import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { createRef, useState } from "react";
import { Alert } from "react-native";

import type { Client, CreateClientDTO } from "../../clients/domain/types";
import { ClientPickerField, type ClientPickerFieldHandle } from "./ClientPickerField";

function ControlledHarness({
  initialClientId,
  onChangeUnregisteredNameSpy,
}: {
  initialClientId?: string;
  onChangeUnregisteredNameSpy?: (name: string | undefined) => void;
}) {
  const [clientId, setClientId] = useState<string | undefined>(
    initialClientId,
  );
  const [unregisteredName, setUnregisteredName] = useState<
    string | undefined
  >(undefined);
  return (
    <ClientPickerField
      clientId={clientId}
      unregisteredName={unregisteredName}
      onChangeClientId={setClientId}
      onChangeUnregisteredName={(name) => {
        onChangeUnregisteredNameSpy?.(name);
        setUnregisteredName(name);
      }}
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

  it("permite cambiar un cliente ya vinculado, dejando el nombre editable en vez de borrarlo", async () => {
    const { findByLabelText, getByLabelText } = render(
      <ControlledHarness initialClientId={clients[0]!.id} />,
    );

    fireEvent.press(await findByLabelText("Cambiar cliente"));

    expect(getByLabelText("Nombre del cliente").props.value).toBe(
      "Ana Torres",
    );
  });

  it("tocar el lápiz no desvincula al cliente en silencio: solo prellena el texto, sin tocar unregisteredClientName", async () => {
    const onChangeUnregisteredNameSpy = jest.fn();
    const { findByLabelText, getByLabelText } = render(
      <ControlledHarness
        initialClientId={clients[0]!.id}
        onChangeUnregisteredNameSpy={onChangeUnregisteredNameSpy}
      />,
    );

    fireEvent.press(await findByLabelText("Cambiar cliente"));

    // El texto visible ya muestra el nombre prellenado...
    expect(getByLabelText("Nombre del cliente").props.value).toBe(
      "Ana Torres",
    );
    // ...pero `unregisteredClientName` sigue sin definir: si el usuario
    // guardara el turno en este momento (sin editar nada más), la
    // validación XOR de clientId/unregisteredClientName debe fallar en vez
    // de sustituir silenciosamente el vínculo real por este nombre.
    expect(onChangeUnregisteredNameSpy).not.toHaveBeenCalled();
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

    it("formatea el nombre y apellido con la primera letra en mayúscula al crear", async () => {
      mockCreate.mockResolvedValueOnce(newClient);
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "maría",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "GÓMEZ",
      );
      fireEvent.press(getByLabelText("Crear cliente"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          firstName: "María",
          lastName: "Gómez",
          phone: "",
        });
      });
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

    it('separa el nombre completo en nombre y apellido al abrir "Registrar cliente"', async () => {
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "Juan Pérez",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));

      expect(getByLabelText("Nombre del cliente").props.value).toBe("Juan");
      expect(getByLabelText("Apellido del cliente nuevo").props.value).toBe(
        "Pérez",
      );
    });

    it("restaura el nombre completo si se cancela el registro tras separar nombre/apellido", async () => {
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          onChangeClientId={jest.fn()}
          onChangeUnregisteredName={jest.fn()}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "Juan Pérez",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.press(getByLabelText("Cancelar registro de cliente"));

      expect(getByLabelText("Nombre del cliente").props.value).toBe(
        "Juan Pérez",
      );
    });
  });

  describe("resolvePendingRegistration (al guardar el turno sin confirmar el registro)", () => {
    it("registra el cliente si quedó nombre, apellido y teléfono sin confirmar", async () => {
      mockCreate.mockResolvedValueOnce(newClient);
      const onChangeClientId = jest.fn();
      const onChangeUnregisteredName = jest.fn();
      const ref = createRef<ClientPickerFieldHandle>();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          ref={ref}
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
        "3005554433",
      );

      await act(async () => {
        await ref.current?.resolvePendingRegistration();
      });

      expect(mockCreate).toHaveBeenCalledWith({
        firstName: "María",
        lastName: "Gómez",
        phone: "3005554433",
      });
      expect(onChangeClientId).toHaveBeenCalledWith(newClient.id);
      expect(onChangeUnregisteredName).toHaveBeenCalledWith(undefined);
    });

    it("guarda solo el nombre sin registrar cliente si no hay teléfono", async () => {
      const onChangeClientId = jest.fn();
      const onChangeUnregisteredName = jest.fn();
      const ref = createRef<ClientPickerFieldHandle>();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          ref={ref}
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

      await act(async () => {
        await ref.current?.resolvePendingRegistration();
      });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(onChangeUnregisteredName).toHaveBeenCalledWith("María Gómez");
      expect(onChangeClientId).toHaveBeenCalledWith(undefined);
    });

    it("no hace nada si no había un registro a medio llenar", async () => {
      const onChangeClientId = jest.fn();
      const onChangeUnregisteredName = jest.fn();
      const ref = createRef<ClientPickerFieldHandle>();
      const { findByLabelText } = render(
        <ClientPickerField
          ref={ref}
          onChangeClientId={onChangeClientId}
          onChangeUnregisteredName={onChangeUnregisteredName}
        />,
      );
      await findByLabelText("Nombre del cliente");

      await act(async () => {
        await ref.current?.resolvePendingRegistration();
      });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(onChangeClientId).not.toHaveBeenCalled();
      expect(onChangeUnregisteredName).not.toHaveBeenCalled();
    });

    it("si el teléfono ya está registrado, avisa y permite guardar solo el nombre", async () => {
      const onChangeClientId = jest.fn();
      const onChangeUnregisteredName = jest.fn();
      jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
        const nameOnly = buttons?.find(
          (b) => b.text === "No registrar, solo guardar el nombre",
        );
        void nameOnly?.onPress?.();
      });
      const ref = createRef<ClientPickerFieldHandle>();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField
          ref={ref}
          onChangeClientId={onChangeClientId}
          onChangeUnregisteredName={onChangeUnregisteredName}
        />,
      );

      fireEvent.changeText(
        await findByLabelText("Nombre del cliente"),
        "Nuevo",
      );
      fireEvent.press(getByLabelText("Registrar cliente"));
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Cliente",
      );
      fireEvent.changeText(
        getByLabelText("Teléfono del cliente nuevo"),
        clients[0]!.phone,
      );

      await act(async () => {
        await ref.current?.resolvePendingRegistration();
      });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(onChangeUnregisteredName).toHaveBeenCalledWith("Nuevo Cliente");
      expect(onChangeClientId).toHaveBeenCalledWith(undefined);
    });
  });
});
