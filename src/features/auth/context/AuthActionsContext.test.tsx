import { describe, expect, it, jest } from "@jest/globals";
import { render, renderHook } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthActionsProvider, useAuthActions } from "./AuthActionsContext";

function Consumer() {
  const { signOut } = useAuthActions();
  return <Text onPress={() => void signOut()}>consumer</Text>;
}

describe("AuthActionsContext", () => {
  it("expone signOut a los consumidores dentro del provider", async () => {
    const signOut = jest.fn(async () => Promise.resolve());
    const { getByText } = render(
      <AuthActionsProvider signOut={signOut}>
        <Consumer />
      </AuthActionsProvider>,
    );

    getByText("consumer").props.onPress();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("lanza un error explícito si se usa fuera del provider", () => {
    const { result } = renderHook(() => {
      try {
        return { error: null, value: useAuthActions() };
      } catch (error) {
        return { error, value: null };
      }
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      "useAuthActions debe usarse dentro de un AuthActionsProvider",
    );
  });
});
