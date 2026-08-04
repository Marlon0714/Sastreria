import { fireEvent, render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";

import type { Profile } from "../domain/profile";
import { OfflineActorPickerModal } from "./OfflineActorPickerModal";

const operarios: Profile[] = [
  {
    id: "user-1",
    displayName: "María Gómez",
    role: "operario",
    isSharedDevice: false,
  },
  {
    id: "user-2",
    displayName: "Juan Pérez",
    role: "operario",
    isSharedDevice: false,
  },
];

describe("OfflineActorPickerModal", () => {
  it("no renderiza contenido visible cuando visible=false", () => {
    const { queryByText } = render(
      <OfflineActorPickerModal
        visible={false}
        operarios={operarios}
        isLoading={false}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(queryByText("¿Quién eres?")).toBeNull();
  });

  it("muestra un indicador de carga mientras isLoading=true", () => {
    const { getByLabelText, queryByText } = render(
      <OfflineActorPickerModal
        visible={true}
        operarios={[]}
        isLoading={true}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByLabelText("Cargando operarios")).toBeTruthy();
    expect(queryByText("María Gómez")).toBeNull();
  });

  it("lista los operarios disponibles y permite elegir uno", () => {
    const onSelect = jest.fn();
    const { getByLabelText, getByText } = render(
      <OfflineActorPickerModal
        visible={true}
        operarios={operarios}
        isLoading={false}
        onSelect={onSelect}
        onCancel={jest.fn()}
      />,
    );

    expect(getByText("Juan Pérez")).toBeTruthy();
    fireEvent.press(getByLabelText("Elegir a María Gómez"));

    expect(onSelect).toHaveBeenCalledWith(operarios[0]);
  });

  it("muestra un mensaje si no hay operarios disponibles", () => {
    const { getByText } = render(
      <OfflineActorPickerModal
        visible={true}
        operarios={[]}
        isLoading={false}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(
      getByText("No hay operarios disponibles sin conexión."),
    ).toBeTruthy();
  });

  it("llama onCancel al presionar Cancelar", () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <OfflineActorPickerModal
        visible={true}
        operarios={operarios}
        isLoading={false}
        onSelect={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByLabelText("Cancelar"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
