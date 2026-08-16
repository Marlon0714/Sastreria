import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { useIdentityStore } from "../../../shared/state/identityStore";
import { ProfileButton } from "./ProfileButton";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe("ProfileButton", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useIdentityStore.getState().reset();
  });

  it("no muestra nada si no hay perfil resuelto", () => {
    const { queryByLabelText } = render(<ProfileButton />);
    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });

  it("no muestra nada para el dueño", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "owner-1",
      displayName: "Dueño",
      role: "owner",
      isSharedDevice: false,
    });

    const { queryByLabelText } = render(<ProfileButton />);
    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });

  it("no muestra nada en la tablet compartida", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "tablet-1",
      displayName: "Mostrador",
      role: "operario",
      isSharedDevice: true,
    });

    const { queryByLabelText } = render(<ProfileButton />);
    expect(queryByLabelText("Mi cuenta")).toBeNull();
  });

  it("muestra el botón para un operario en su cuenta personal y navega a Mi cuenta", () => {
    useIdentityStore.getState().setOwnProfile({
      id: "op-1",
      displayName: "Juan Pérez",
      role: "operario",
      isSharedDevice: false,
    });

    const { getByLabelText } = render(<ProfileButton />);
    fireEvent.press(getByLabelText("Mi cuenta"));

    expect(mockNavigate).toHaveBeenCalledWith("MyAccount");
  });
});
