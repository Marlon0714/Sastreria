import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";

import { AuthActionsProvider } from "../context/AuthActionsContext";
import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  it("pide confirmación y cierra sesión solo si se confirma", () => {
    const signOut = jest.fn(async () => Promise.resolve());
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b) => b.text === "Cerrar sesión");
      void confirm?.onPress?.();
    });

    const { getByLabelText } = render(
      <AuthActionsProvider signOut={signOut}>
        <LogoutButton />
      </AuthActionsProvider>,
    );

    fireEvent.press(getByLabelText("Cerrar sesión"));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("muestra una alerta si signOut falla", async () => {
    const signOut = jest.fn(() => Promise.reject(new Error("network error")));
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((title, _msg, buttons) => {
        if (title === "Cerrar sesión") {
          const confirm = buttons?.find((b) => b.text === "Cerrar sesión");
          void confirm?.onPress?.();
        }
      });

    const { getByLabelText } = render(
      <AuthActionsProvider signOut={signOut}>
        <LogoutButton />
      </AuthActionsProvider>,
    );

    fireEvent.press(getByLabelText("Cerrar sesión"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "No se pudo cerrar sesión",
      "Revisa tu conexión e inténtalo de nuevo.",
    );
  });

  it("no cierra sesión si se cancela la confirmación", () => {
    const signOut = jest.fn(async () => Promise.resolve());
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const cancel = buttons?.find((b) => b.text === "Cancelar");
      void cancel?.onPress?.();
    });

    const { getByLabelText } = render(
      <AuthActionsProvider signOut={signOut}>
        <LogoutButton />
      </AuthActionsProvider>,
    );

    fireEvent.press(getByLabelText("Cerrar sesión"));

    expect(signOut).not.toHaveBeenCalled();
  });
});
