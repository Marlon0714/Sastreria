import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { LoginScreen } from "./LoginScreen";

function makeOnSignIn(
  impl?: (email: string, password: string) => Promise<void>,
) {
  return jest.fn<(email: string, password: string) => Promise<void>>(
    impl ?? (() => Promise.resolve()),
  );
}

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza campos de email, contraseña y botón de login", () => {
    const { getByLabelText, getByText } = render(
      <LoginScreen onSignIn={makeOnSignIn()} isLoading={false} error={null} />,
    );

    expect(getByLabelText("Correo electrónico")).toBeTruthy();
    expect(getByLabelText("Contraseña")).toBeTruthy();
    expect(getByLabelText("Iniciar sesión")).toBeTruthy();
    expect(getByText("Sastrería")).toBeTruthy();
  });

  it("muestra ActivityIndicator y deshabilita el botón cuando isLoading=true", () => {
    const { getByLabelText, queryByText } = render(
      <LoginScreen onSignIn={makeOnSignIn()} isLoading={true} error={null} />,
    );

    const button = getByLabelText("Iniciar sesión");
    expect(
      button.props.accessibilityState?.disabled ?? button.props.disabled,
    ).toBe(true);
    expect(queryByText("Iniciar sesión")).toBeNull();
  });

  it("muestra el error de auth recibido por props", () => {
    const { getByText } = render(
      <LoginScreen
        onSignIn={makeOnSignIn()}
        isLoading={false}
        error="Credenciales incorrectas"
      />,
    );

    expect(getByText("Credenciales incorrectas")).toBeTruthy();
  });

  it("no llama onSignIn si el email es inválido", async () => {
    const onSignIn = makeOnSignIn();
    const { getByLabelText } = render(
      <LoginScreen onSignIn={onSignIn} isLoading={false} error={null} />,
    );

    fireEvent.changeText(
      getByLabelText("Correo electrónico"),
      "no-es-email",
    );
    fireEvent.changeText(getByLabelText("Contraseña"), "password123");

    await act(async () => {
      fireEvent.press(getByLabelText("Iniciar sesión"));
    });

    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("no llama onSignIn si la contraseña es menor a 6 caracteres", async () => {
    const onSignIn = makeOnSignIn();
    const { getByLabelText } = render(
      <LoginScreen onSignIn={onSignIn} isLoading={false} error={null} />,
    );

    fireEvent.changeText(
      getByLabelText("Correo electrónico"),
      "user@example.com",
    );
    fireEvent.changeText(getByLabelText("Contraseña"), "123");

    await act(async () => {
      fireEvent.press(getByLabelText("Iniciar sesión"));
    });

    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("llama onSignIn con email y contraseña válidos", async () => {
    const onSignIn = makeOnSignIn();
    const { getByLabelText } = render(
      <LoginScreen onSignIn={onSignIn} isLoading={false} error={null} />,
    );

    fireEvent.changeText(
      getByLabelText("Correo electrónico"),
      "user@example.com",
    );
    fireEvent.changeText(getByLabelText("Contraseña"), "password123");

    await act(async () => {
      fireEvent.press(getByLabelText("Iniciar sesión"));
    });

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledWith("user@example.com", "password123");
  });

  it("muestra errores de validación inline al enviar formulario vacío", async () => {
    const { getByLabelText, findByText } = render(
      <LoginScreen onSignIn={makeOnSignIn()} isLoading={false} error={null} />,
    );

    await act(async () => {
      fireEvent.press(getByLabelText("Iniciar sesión"));
    });

    expect(await findByText("Correo electrónico inválido")).toBeTruthy();
    expect(
      await findByText("La contraseña debe tener al menos 6 caracteres"),
    ).toBeTruthy();
  });

  it("alterna la visibilidad de la contraseña al presionar el toggle", async () => {
    const { getByLabelText } = render(
      <LoginScreen onSignIn={makeOnSignIn()} isLoading={false} error={null} />,
    );

    const passwordInput = getByLabelText("Contraseña");
    expect(passwordInput.props.secureTextEntry).toBe(true);

    await act(async () => {
      fireEvent.press(getByLabelText("Mostrar contraseña"));
    });

    await waitFor(() => {
      expect(getByLabelText("Contraseña").props.secureTextEntry).toBe(
        false,
      );
    });
  });
});
