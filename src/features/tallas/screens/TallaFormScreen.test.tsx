import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { TallasDependencies } from "../../../data/local/tallasDependencies";
import type { TallaTemplate } from "../domain/types";
import type { TallaTemplateRepository } from "../domain/repository";
import { TallasDependenciesProvider } from "../hooks/TallasDependenciesProvider";
import TallaFormScreen from "./TallaFormScreen";

const mockCreateTemplate =
  jest.fn<(dto: unknown) => Promise<TallaTemplate | null>>();
const mockUpdateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();

jest.mock("../hooks/useUpsertTallaTemplate", () => ({
  useUpsertTallaTemplate: () => ({
    createTemplate: mockCreateTemplate,
    updateTemplate: mockUpdateTemplate,
    deleteTemplate: mockDeleteTemplate,
    isSubmitting: false,
    error: null,
  }),
}));

const noopTallaTemplateRepository: TallaTemplateRepository = {
  findAll: jest.fn(async () => Promise.resolve([])),
  findByType: jest.fn(async () => Promise.resolve([])),
  create: jest.fn(async () => Promise.reject(new Error("unused"))),
  update: jest.fn(async () => Promise.reject(new Error("unused"))),
  delete: jest.fn(async () => Promise.reject(new Error("unused"))),
};

const dependencies: TallasDependencies = {
  tallaTemplateRepository: noopTallaTemplateRepository,
};

function buildProps() {
  return {
    navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
    route: {
      key: "TallaForm-test",
      name: "TallaForm",
      params: { type: "camisa" as const },
    } as never,
  };
}

describe("TallaFormScreen", () => {
  beforeEach(() => {
    mockCreateTemplate.mockReset();
    mockUpdateTemplate.mockReset();
    mockDeleteTemplate.mockReset();
  });

  it("muestra un error de campo y no guarda cuando una medida está fuera de rango", async () => {
    const { getByLabelText, getByText, getByPlaceholderText } = render(
      <TallasDependenciesProvider dependencies={dependencies}>
        <TallaFormScreen {...buildProps()} />
      </TallasDependenciesProvider>,
    );

    fireEvent.changeText(getByPlaceholderText('Ej: M, 38, "Talla única"'), "M");
    fireEvent.changeText(getByLabelText("Espalda (cm)"), "500");
    fireEvent.press(getByText("Guardar talla"));

    await waitFor(() => {
      expect(getByText("No puede ser mayor que 300")).toBeTruthy();
    });
    expect(mockCreateTemplate).not.toHaveBeenCalled();
  });

  it("muestra un error de campo y no guarda cuando una medida es negativa", async () => {
    const { getByLabelText, getByText, getByPlaceholderText } = render(
      <TallasDependenciesProvider dependencies={dependencies}>
        <TallaFormScreen {...buildProps()} />
      </TallasDependenciesProvider>,
    );

    fireEvent.changeText(getByPlaceholderText('Ej: M, 38, "Talla única"'), "M");
    fireEvent.changeText(getByLabelText("Espalda (cm)"), "-10");
    fireEvent.press(getByText("Guardar talla"));

    await waitFor(() => {
      expect(getByText("Debe ser mayor que 0")).toBeTruthy();
    });
    expect(mockCreateTemplate).not.toHaveBeenCalled();
  });

  it("muestra el error inline bajo el campo nombre cuando se guarda sin nombre, sin usar Alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    const { getByText } = render(
      <TallasDependenciesProvider dependencies={dependencies}>
        <TallaFormScreen {...buildProps()} />
      </TallasDependenciesProvider>,
    );

    fireEvent.press(getByText("Guardar talla"));

    await waitFor(() => {
      expect(getByText("El nombre es obligatorio")).toBeTruthy();
    });
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockCreateTemplate).not.toHaveBeenCalled();
  });

  it("muestra el error inline bajo el campo nombre cuando el formato del nombre es inválido, sin usar Alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    const { getByText, getByPlaceholderText } = render(
      <TallasDependenciesProvider dependencies={dependencies}>
        <TallaFormScreen {...buildProps()} />
      </TallasDependenciesProvider>,
    );

    fireEvent.changeText(
      getByPlaceholderText('Ej: M, 38, "Talla única"'),
      "M@#!",
    );
    fireEvent.press(getByText("Guardar talla"));

    await waitFor(() => {
      expect(
        getByText(
          'El nombre de la talla solo puede contener letras, números, espacios, "/" y "-".',
        ),
      ).toBeTruthy();
    });
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockCreateTemplate).not.toHaveBeenCalled();
  });

  it("guarda la plantilla cuando las medidas están en rango", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ id: "t-1" } as TallaTemplate);

    const { getByLabelText, getByText, getByPlaceholderText } = render(
      <TallasDependenciesProvider dependencies={dependencies}>
        <TallaFormScreen {...buildProps()} />
      </TallasDependenciesProvider>,
    );

    fireEvent.changeText(getByPlaceholderText('Ej: M, 38, "Talla única"'), "M");
    fireEvent.changeText(getByLabelText("Espalda (cm)"), "44");
    fireEvent.press(getByText("Guardar talla"));

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalled();
    });
  });
});
