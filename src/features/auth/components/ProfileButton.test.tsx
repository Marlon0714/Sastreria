import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { ProfileButton } from "./ProfileButton";

describe("ProfileButton", () => {
  beforeEach(() => {
    useIdentityStore.getState().reset();
  });

  it("no muestra nada si no hay perfil resuelto", () => {
    const { queryByLabelText } = render(<ProfileButton onPress={jest.fn()} />);
    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });

  it("muestra el botón para el dueño en su dispositivo personal y llama a onPress", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: false,
    });
    const onPress = jest.fn();

    const { getByLabelText } = render(<ProfileButton onPress={onPress} />);
    fireEvent.press(getByLabelText("Mi cuenta"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("no muestra nada para el dueño en dispositivo compartido", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: true,
    });

    const { queryByLabelText } = render(<ProfileButton onPress={jest.fn()} />);
    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });

  it("no muestra nada en la tablet compartida", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "tablet-1",
      displayName: "Mostrador",
      role: "operario",
      isSharedDevice: true,
    });

    const { queryByLabelText } = render(<ProfileButton onPress={jest.fn()} />);
    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });

  it("muestra el botón para un operario en su cuenta personal y llama a onPress", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });
    const onPress = jest.fn();

    const { getByLabelText } = render(<ProfileButton onPress={onPress} />);
    fireEvent.press(getByLabelText("Mi cuenta"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
