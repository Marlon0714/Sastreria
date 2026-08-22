import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ReauthStep } from "./ReauthStep";

const mockVerifyPassword = jest.fn<(password: string) => Promise<boolean>>();
const mockVerifyPin = jest.fn<(pin: string) => Promise<boolean>>();

jest.mock("../hooks/useReauth", () => ({
  useReauth: () => ({
    isVerifying: false,
    error: null,
    verifyPassword: (password: string) => mockVerifyPassword(password),
    verifyPin: (pin: string) => mockVerifyPin(pin),
  }),
}));

describe("ReauthStep", () => {
  it("por defecto usa contraseña y llama a verifyPassword al confirmar", async () => {
    mockVerifyPassword.mockResolvedValueOnce(true);
    const onVerified = jest.fn();

    const { getByLabelText } = render(
      <ReauthStep onVerified={onVerified} onCancel={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText("Contraseña actual"), "secreta123");
    fireEvent.press(getByLabelText("Confirmar identidad"));

    await waitFor(() => {
      expect(mockVerifyPassword).toHaveBeenCalledWith("secreta123");
      expect(onVerified).toHaveBeenCalledTimes(1);
    });
  });

  it("cambia a PIN y solo permite 4 dígitos numéricos", async () => {
    mockVerifyPin.mockResolvedValueOnce(true);
    const onVerified = jest.fn();

    const { getByLabelText } = render(
      <ReauthStep onVerified={onVerified} onCancel={jest.fn()} />,
    );

    fireEvent.press(getByLabelText("Usar PIN"));
    fireEvent.changeText(getByLabelText("PIN actual"), "12ab3456");
    fireEvent.press(getByLabelText("Confirmar identidad"));

    await waitFor(() => {
      expect(mockVerifyPin).toHaveBeenCalledWith("1234");
      expect(onVerified).toHaveBeenCalledTimes(1);
    });
  });

  it("no llama a onVerified si la verificación falla", async () => {
    mockVerifyPassword.mockResolvedValueOnce(false);
    const onVerified = jest.fn();

    const { getByLabelText } = render(
      <ReauthStep onVerified={onVerified} onCancel={jest.fn()} />,
    );

    fireEvent.changeText(getByLabelText("Contraseña actual"), "mala");
    fireEvent.press(getByLabelText("Confirmar identidad"));

    await waitFor(() => expect(mockVerifyPassword).toHaveBeenCalled());
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("llama a onCancel al presionar Cancelar", () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <ReauthStep onVerified={jest.fn()} onCancel={onCancel} />,
    );

    fireEvent.press(getByLabelText("Cancelar"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
