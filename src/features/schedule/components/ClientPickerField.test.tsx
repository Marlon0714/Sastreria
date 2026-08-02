import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Client } from "../../clients/domain/types";
import { ClientPickerField } from "./ClientPickerField";

const mockFindAll = jest.fn<() => Promise<Client[]>>();

jest.mock("../../clients/hooks/ClientsDependenciesProvider", () => ({
  useClientRepository: () => ({
    findAll: () => mockFindAll(),
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

describe("ClientPickerField", () => {
  beforeEach(() => {
    mockFindAll.mockReset();
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

    fireEvent.press(getByLabelText("Elegir a Juan Pérez"));

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
});
