import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Profile } from "../../auth/domain/profile";
import { OperarioPickerField } from "./OperarioPickerField";

const mockGetOperarios = jest.fn<() => Promise<Profile[]>>();

jest.mock("../../../data/local/profilesCacheDependencies", () => ({
  getDefaultProfilesCacheRepository: () => ({
    getOperarios: () => mockGetOperarios(),
  }),
}));

const operarios: Profile[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Ana Torres",
    role: "operario",
    isSharedDevice: false,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    displayName: "Juan Pérez",
    role: "operario",
    isSharedDevice: false,
  },
];

describe("OperarioPickerField", () => {
  beforeEach(() => {
    mockGetOperarios.mockReset();
    mockGetOperarios.mockResolvedValue(operarios);
  });

  it("shows a placeholder when no operario is selected", async () => {
    const { findByText } = render(
      <OperarioPickerField onChange={jest.fn()} />,
    );

    expect(await findByText("Sin operario asignado")).toBeTruthy();
  });

  it("shows the selected operario's name", async () => {
    const { findByText } = render(
      <OperarioPickerField value={operarios[0]!.id} onChange={jest.fn()} />,
    );

    expect(await findByText("Ana Torres")).toBeTruthy();
  });

  it("opens the search list, filters and selects an operario", async () => {
    const onChange = jest.fn();
    const { findByLabelText, getByLabelText, getByText, queryByText } =
      render(<OperarioPickerField onChange={onChange} />);

    const selector = await findByLabelText("Seleccionar operario");
    fireEvent.press(selector);

    await waitFor(() => {
      expect(getByLabelText("Buscar operario")).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText("Buscar operario"), "juan");

    expect(getByText("Juan Pérez")).toBeTruthy();
    expect(queryByText("Ana Torres")).toBeNull();

    fireEvent.press(getByLabelText("Elegir a Juan Pérez"));

    expect(onChange).toHaveBeenCalledWith(operarios[1]!.id);
  });

  it("allows clearing the selection", async () => {
    const onChange = jest.fn();
    const { findByLabelText, getByLabelText } = render(
      <OperarioPickerField value={operarios[0]!.id} onChange={onChange} />,
    );

    const selector = await findByLabelText("Seleccionar operario");
    fireEvent.press(selector);

    await waitFor(() => {
      expect(getByLabelText("Quitar operario asignado")).toBeTruthy();
    });
    fireEvent.press(getByLabelText("Quitar operario asignado"));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("shows an error message when provided", async () => {
    const { findByText } = render(
      <OperarioPickerField
        onChange={jest.fn()}
        errorMessage="El operario es inválido"
      />,
    );

    expect(await findByText("El operario es inválido")).toBeTruthy();
  });
});
