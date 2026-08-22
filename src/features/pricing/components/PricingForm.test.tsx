import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PricingForm from "./PricingForm";
import { pricingStrings } from "../domain/strings";

describe("PricingForm", () => {
  it("renderiza el segmented control de categorias", () => {
    // Arrange
    const onSubmitMock = jest.fn();

    // Act
    const { getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    // Assert
    expect(getByText("Categoría")).toBeTruthy();
    expect(getByText(/Arreglos/i)).toBeTruthy();
    expect(getByText(/Confecciones/i)).toBeTruthy();
  });

  it("envia categoria por defecto (arreglo) cuando no se cambia el segmented", async () => {
    // Arrange
    const onSubmitMock = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    // Act
    fireEvent.changeText(
      getByPlaceholderText("Ej: Dobladillo pantalón"),
      "Dobladillo simple",
    );
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "15000");
    fireEvent.press(getByText(pricingStrings.save));

    // Assert
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalled();
    });
    expect(onSubmitMock.mock.calls[0][0]).toEqual({
      name: "Dobladillo simple",
      price: 15000,
      category: "arreglo",
      notes: "",
    });
  });

  it("cambia categoria al presionar el chip de confecciones y la envia", async () => {
    // Arrange
    const onSubmitMock = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    // Act
    fireEvent.press(getByText(/Confecciones/i));
    fireEvent.changeText(getByPlaceholderText("Ej: Dobladillo pantalón"), "Camisa");
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "50000");
    fireEvent.press(getByText(pricingStrings.save));

    // Assert
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalled();
    });
    expect(onSubmitMock.mock.calls[0][0]).toEqual({
      name: "Camisa",
      price: 50000,
      category: "confeccion",
      notes: "",
    });
  });

  it("ignora los puntos al escribir/pegar un precio (ej. '15.000' no se lee como 15)", async () => {
    // El resto de la app muestra precios con "." como separador de miles
    // (formatPrice) — un usuario que pega/escribe ese mismo formato acá no
    // debe terminar guardando un precio 1000 veces menor.
    const onSubmitMock = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    fireEvent.changeText(
      getByPlaceholderText("Ej: Dobladillo pantalón"),
      "Ajuste de manga",
    );
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "15.000");
    fireEvent.press(getByText(pricingStrings.save));

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalled();
    });
    expect(onSubmitMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ price: 15000 }),
    );
  });

  it("muestra error de validacion y no envia cuando el nombre es invalido", async () => {
    // Arrange
    const onSubmitMock = jest.fn();
    const { findByText, getByPlaceholderText, getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    // Act
    fireEvent.changeText(getByPlaceholderText("Ej: Dobladillo pantalón"), "A");
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "10000");
    fireEvent.press(getByText(pricingStrings.save));

    // Assert
    expect(
      await findByText("El nombre debe tener al menos 2 caracteres"),
    ).toBeTruthy();
    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it("rechaza guardar con precio vacío (no lo trata como $0) y muestra un error de campo", async () => {
    const onSubmitMock = jest.fn();
    const { findByText, getByPlaceholderText, getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    fireEvent.changeText(
      getByPlaceholderText("Ej: Dobladillo pantalón"),
      "Ajuste de manga",
    );
    // El precio se deja intacto (vacío) — no se escribe nada en el input.
    fireEvent.press(getByText(pricingStrings.save));

    expect(await findByText("El precio es obligatorio")).toBeTruthy();
    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it("rechaza un precio de 0 con un error de campo claro", async () => {
    const onSubmitMock = jest.fn();
    const { findByText, getByPlaceholderText, getByText } = render(
      <PricingForm onSubmit={onSubmitMock} submitting={false} />,
    );

    fireEvent.changeText(
      getByPlaceholderText("Ej: Dobladillo pantalón"),
      "Ajuste de manga",
    );
    fireEvent.changeText(getByPlaceholderText("Ej: 15000"), "0");
    fireEvent.press(getByText(pricingStrings.save));

    expect(await findByText("El precio debe ser mayor a 0")).toBeTruthy();
    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it("muestra error del servidor cuando llega por props", () => {
    // Arrange
    const onSubmitMock = jest.fn();

    // Act
    const { getByText } = render(
      <PricingForm
        onSubmit={onSubmitMock}
        submitting={false}
        error="No fue posible guardar"
      />,
    );

    // Assert
    expect(getByText("No fue posible guardar")).toBeTruthy();
  });
});
