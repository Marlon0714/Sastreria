import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useIdentityStore } from "../../../shared/state/identityStore";
import MyAccountScreen from "./MyAccountScreen";

interface UseAccountActionsResult {
  currentEmail: string | null;
  isLoadingEmail: boolean;
  isSubmitting: boolean;
  error: string | null;
  changeEmail: (email: string) => Promise<boolean>;
  changePassword: (password: string) => Promise<boolean>;
  changePin: (pin: string) => Promise<boolean>;
  clearError: () => void;
}

const mockUseAccountActions = jest.fn<() => UseAccountActionsResult>();

jest.mock("../hooks/useAccountActions", () => ({
  useAccountActions: () => mockUseAccountActions(),
}));

jest.mock("../components/ReauthStep", () => {
  const ReactModule = jest.requireActual("react") as typeof import("react");
  const { Pressable, Text } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");

  return {
    ReauthStep: ({
      onVerified,
    }: {
      onVerified: () => void;
      onCancel: () => void;
    }) =>
      ReactModule.createElement(
        Pressable,
        { accessibilityLabel: "Confirmar identidad (mock)", onPress: onVerified },
        ReactModule.createElement(Text, null, "Confirmar identidad (mock)"),
      ),
  };
});

function buildAccountActions(
  overrides: Partial<UseAccountActionsResult> = {},
): UseAccountActionsResult {
  return {
    currentEmail: "juan@example.com",
    isLoadingEmail: false,
    isSubmitting: false,
    error: null,
    changeEmail: jest.fn(async () => Promise.resolve(true)),
    changePassword: jest.fn(async () => Promise.resolve(true)),
    changePin: jest.fn(async () => Promise.resolve(true)),
    clearError: jest.fn(),
    ...overrides,
  };
}

describe("MyAccountScreen", () => {
  beforeEach(() => {
    mockUseAccountActions.mockReset();
    mockUseAccountActions.mockReturnValue(buildAccountActions());
    useIdentityStore.getState().reset();
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
  });

  it("muestra el nombre y el correo actual", () => {
    const { getByText } = render(
      <MyAccountScreen navigation={{ navigate: jest.fn() }} />,
    );

    expect(getByText("Juan Pérez")).toBeTruthy();
    expect(getByText("juan@example.com")).toBeTruthy();
  });

  it("navega a Mis arreglos al presionar el botón", () => {
    const navigate = jest.fn();
    const { getByLabelText } = render(
      <MyAccountScreen navigation={{ navigate }} />,
    );

    fireEvent.press(getByLabelText("Ver mis arreglos"));

    expect(navigate).toHaveBeenCalledWith("MyActivity");
  });

  it("cambia el correo tras confirmar identidad", async () => {
    const changeEmail = jest.fn(async () => Promise.resolve(true));
    mockUseAccountActions.mockReturnValue(
      buildAccountActions({ changeEmail }),
    );

    const { getByLabelText, findByText } = render(
      <MyAccountScreen navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Cambiar correo"));
    fireEvent.press(getByLabelText("Confirmar identidad (mock)"));

    fireEvent.changeText(
      getByLabelText("Nuevo correo"),
      "nuevo@example.com",
    );
    fireEvent.press(getByLabelText("Guardar cambio"));

    await waitFor(() => {
      expect(changeEmail).toHaveBeenCalledWith("nuevo@example.com");
    });
    expect(await findByText("Correo actualizado.")).toBeTruthy();
  });

  it("rechaza cambiar la contraseña si no coincide con la confirmación", async () => {
    const changePassword = jest.fn(async () => Promise.resolve(true));
    mockUseAccountActions.mockReturnValue(
      buildAccountActions({ changePassword }),
    );

    const { getByLabelText, findByText } = render(
      <MyAccountScreen navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Cambiar contraseña"));
    fireEvent.press(getByLabelText("Confirmar identidad (mock)"));

    fireEvent.changeText(getByLabelText("Nueva contraseña"), "clave123");
    fireEvent.changeText(
      getByLabelText("Confirmar contraseña nueva"),
      "otraclave",
    );
    fireEvent.press(getByLabelText("Guardar cambio"));

    expect(await findByText("Las contraseñas no coinciden.")).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("cambia el PIN tras confirmar identidad", async () => {
    const changePin = jest.fn(async () => Promise.resolve(true));
    mockUseAccountActions.mockReturnValue(buildAccountActions({ changePin }));

    const { getByLabelText } = render(
      <MyAccountScreen navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Cambiar PIN"));
    fireEvent.press(getByLabelText("Confirmar identidad (mock)"));

    fireEvent.changeText(getByLabelText("Nuevo PIN"), "5678");
    fireEvent.press(getByLabelText("Guardar cambio"));

    await waitFor(() => {
      expect(changePin).toHaveBeenCalledWith("5678");
    });
  });

  it("limpia el error de un modo de edición anterior al cambiar de campo", async () => {
    // Escenario del bug: falla "Cambiar contraseña" (error visible del hook),
    // el usuario cancela y abre "Cambiar PIN" — el error viejo de contraseña
    // no debe seguir mostrándose bajo el nuevo formulario de PIN.
    let currentError: string | null = null;
    const changePassword = jest.fn(async () => {
      currentError = "No se pudo cambiar la contraseña.";
      return false;
    });
    const clearError = jest.fn(() => {
      currentError = null;
    });
    mockUseAccountActions.mockImplementation(() =>
      buildAccountActions({
        error: currentError,
        changePassword,
        clearError,
      }),
    );

    const { getByLabelText, getByText, queryByText, rerender } = render(
      <MyAccountScreen navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Cambiar contraseña"));
    fireEvent.press(getByLabelText("Confirmar identidad (mock)"));
    fireEvent.changeText(getByLabelText("Nueva contraseña"), "clave123");
    fireEvent.changeText(
      getByLabelText("Confirmar contraseña nueva"),
      "clave123",
    );
    fireEvent.press(getByLabelText("Guardar cambio"));

    await waitFor(() => expect(changePassword).toHaveBeenCalled());
    // El hook real dispararía este re-render solo (setState interno); acá
    // el hook está mockeado, así que forzamos el re-render para reflejar
    // el error que acaba de "propagar".
    rerender(<MyAccountScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByText("No se pudo cambiar la contraseña.")).toBeTruthy();

    fireEvent.press(getByLabelText("Cancelar cambio"));
    fireEvent.press(getByLabelText("Cambiar PIN"));
    fireEvent.press(getByLabelText("Confirmar identidad (mock)"));

    expect(queryByText("No se pudo cambiar la contraseña.")).toBeNull();
  });
});
