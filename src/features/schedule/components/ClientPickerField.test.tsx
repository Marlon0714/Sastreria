import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { Client, CreateClientDTO } from "../../clients/domain/types";
import { ClientPickerField } from "./ClientPickerField";

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

  it("shows a placeholder when no client is selected", async () => {
    const { findByText } = render(
      <ClientPickerField value="" onChange={jest.fn()} />,
    );

    expect(await findByText("Toca para elegir un cliente")).toBeTruthy();
  });

  it("shows the selected client's name", async () => {
    const { findByText } = render(
      <ClientPickerField value={clients[0]!.id} onChange={jest.fn()} />,
    );

    expect(await findByText("Ana Torres")).toBeTruthy();
  });

  it("shows client phone numbers in the search results to disambiguate homónimos", async () => {
    const { findByLabelText, getByText } = render(
      <ClientPickerField value="" onChange={jest.fn()} />,
    );

    fireEvent.press(await findByLabelText("Seleccionar cliente"));

    expect(getByText("3001234567")).toBeTruthy();
    expect(getByText("3009998877")).toBeTruthy();
  });

  it("opens the search list, filters and selects a client", async () => {
    const onChange = jest.fn();
    const { findByLabelText, getByLabelText, getByText, queryByText } =
      render(<ClientPickerField value="" onChange={onChange} />);

    const selector = await findByLabelText("Seleccionar cliente");
    fireEvent.press(selector);

    await waitFor(() => {
      expect(getByLabelText("Buscar cliente")).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText("Buscar cliente"), "juan");

    expect(getByText("Juan Pérez")).toBeTruthy();
    expect(queryByText("Ana Torres")).toBeNull();

    fireEvent.press(getByLabelText("Elegir a Juan Pérez (3009998877)"));

    expect(onChange).toHaveBeenCalledWith(clients[1]!.id);
  });

  it("shows an error message when provided", async () => {
    const { findByText } = render(
      <ClientPickerField
        value=""
        onChange={jest.fn()}
        errorMessage="El cliente es inválido"
      />,
    );

    expect(await findByText("El cliente es inválido")).toBeTruthy();
  });

  describe("alta rápida de cliente", () => {
    it("prellena el nombre con el texto buscado al abrir el alta rápida", async () => {
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField value="" onChange={jest.fn()} />,
      );

      fireEvent.press(await findByLabelText("Seleccionar cliente"));
      fireEvent.changeText(getByLabelText("Buscar cliente"), "María Gómez");
      fireEvent.press(getByLabelText("Crear cliente nuevo"));

      expect(getByLabelText("Nombre del cliente nuevo").props.value).toBe(
        "María Gómez",
      );
    });

    it("crea un cliente nuevo con teléfono opcional y lo selecciona", async () => {
      mockCreate.mockResolvedValueOnce(newClient);
      const onChange = jest.fn();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField value="" onChange={onChange} />,
      );

      fireEvent.press(await findByLabelText("Seleccionar cliente"));
      fireEvent.press(getByLabelText("Crear cliente nuevo"));

      fireEvent.changeText(
        getByLabelText("Nombre del cliente nuevo"),
        "María",
      );
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Gómez",
      );
      fireEvent.changeText(
        getByLabelText("Teléfono del cliente nuevo"),
        "300 555 4433",
      );
      fireEvent.press(getByLabelText("Guardar cliente nuevo"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          firstName: "María",
          lastName: "Gómez",
          phone: "3005554433",
        });
      });
      expect(onChange).toHaveBeenCalledWith(newClient.id);
    });

    it("requiere nombre y apellido antes de guardar", async () => {
      const { findByLabelText, getByLabelText, findByText } = render(
        <ClientPickerField value="" onChange={jest.fn()} />,
      );

      fireEvent.press(await findByLabelText("Seleccionar cliente"));
      fireEvent.press(getByLabelText("Crear cliente nuevo"));
      fireEvent.press(getByLabelText("Guardar cliente nuevo"));

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
      const onChange = jest.fn();
      const { findByLabelText, getByLabelText } = render(
        <ClientPickerField value="" onChange={onChange} />,
      );

      fireEvent.press(await findByLabelText("Seleccionar cliente"));
      fireEvent.press(getByLabelText("Crear cliente nuevo"));
      fireEvent.changeText(getByLabelText("Nombre del cliente nuevo"), "Ana");
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Torres",
      );
      fireEvent.press(getByLabelText("Guardar cliente nuevo"));

      expect(onChange).toHaveBeenCalledWith(clients[0]!.id);
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
        <ClientPickerField value="" onChange={jest.fn()} />,
      );

      fireEvent.press(await findByLabelText("Seleccionar cliente"));
      fireEvent.press(getByLabelText("Crear cliente nuevo"));
      fireEvent.changeText(getByLabelText("Nombre del cliente nuevo"), "Ana");
      fireEvent.changeText(
        getByLabelText("Apellido del cliente nuevo"),
        "Torres",
      );
      fireEvent.press(getByLabelText("Guardar cliente nuevo"));

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });

    it("cancela el alta rápida y vuelve a la búsqueda", async () => {
      const { findByLabelText, getByLabelText, queryByLabelText } = render(
        <ClientPickerField value="" onChange={jest.fn()} />,
      );

      fireEvent.press(await findByLabelText("Seleccionar cliente"));
      fireEvent.press(getByLabelText("Crear cliente nuevo"));
      expect(getByLabelText("Nombre del cliente nuevo")).toBeTruthy();

      fireEvent.press(getByLabelText("Cancelar cliente nuevo"));

      expect(queryByLabelText("Nombre del cliente nuevo")).toBeNull();
      expect(getByLabelText("Buscar cliente")).toBeTruthy();
    });
  });
});
