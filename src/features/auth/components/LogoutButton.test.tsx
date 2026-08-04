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
