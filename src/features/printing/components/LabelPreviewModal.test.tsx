import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import type { ArregloLabelData } from "../domain/types";
import { LabelPreviewModal } from "./LabelPreviewModal";

const label: ArregloLabelData = {
  clientName: "Ana Torres",
  clientPhone: "3001234567",
  date: "2026-09-29",
  price: 50000,
  saldo: 20000,
};

describe("LabelPreviewModal", () => {
  it("muestra los datos de la etiqueta", () => {
    const { getByText } = render(
      <LabelPreviewModal visible label={label} onClose={jest.fn()} />,
    );

    expect(getByText("Ana Torres")).toBeTruthy();
    expect(getByText("Tel. 3001234567")).toBeTruthy();
  });

  it("en modo solo-ver muestra únicamente 'Cerrar' y lo invoca al tocarlo", () => {
    const onClose = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <LabelPreviewModal visible label={label} onClose={onClose} />,
    );

    expect(queryByLabelText("Confirmar impresión")).toBeNull();
    expect(queryByLabelText("Cancelar")).toBeNull();

    fireEvent.press(getByLabelText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("en modo confirmar muestra 'Confirmar impresión'/'Cancelar' e invoca cada callback", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <LabelPreviewModal
        visible
        label={label}
        onClose={onClose}
        onConfirm={onConfirm}
        targetName="Mostrador"
      />,
    );

    expect(queryByLabelText("Cerrar")).toBeNull();
    expect(getByLabelText("Confirmar impresión")).toBeTruthy();

    fireEvent.press(getByLabelText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText("Confirmar impresión"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("isConfirming deshabilita ambos botones", () => {
    const { getByLabelText } = render(
      <LabelPreviewModal
        visible
        label={label}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming
      />,
    );

    const cancelButton = getByLabelText("Cancelar");
    const confirmButton = getByLabelText("Confirmar impresión");

    expect(cancelButton.props.accessibilityState?.disabled ?? cancelButton.props.disabled).toBe(
      true,
    );
    expect(
      confirmButton.props.accessibilityState?.disabled ?? confirmButton.props.disabled,
    ).toBe(true);
  });
});
