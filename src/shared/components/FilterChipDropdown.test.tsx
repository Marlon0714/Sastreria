import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { FilterChipDropdown } from "./FilterChipDropdown";

// `jest.spyOn` en vez de `jest.mock("react-native", ...)`: mockear el
// módulo completo (aunque sea con spread sobre `requireActual`) dispara la
// re-evaluación de submódulos nativos de RN (`DevMenu`, etc.) y rompe la
// suite con un `TurboModuleRegistry` inexistente en el entorno de test.
// `spyOn` solo intercepta el hook puntual sin ese efecto secundario — pero
// necesita apuntar al mismo objeto `module.exports` que usa el import
// nombrado dentro de `FilterChipDropdown.tsx` en tiempo de llamada:
// `import * as ReactNative from "react-native"` sufre una copia de interop
// de Babel (`interopRequireWildcard`) que rompe justo ese vínculo.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentario arriba
const ReactNative = require("react-native") as typeof import("react-native");
const mockUseWindowDimensions = jest.spyOn(ReactNative, "useWindowDimensions");

type TestOption = "uno" | "dos" | "tres";

function buildOptions() {
  return [
    { value: "uno" as TestOption, label: "Opción uno", accessibilityLabel: "Ver uno" },
    { value: "dos" as TestOption, label: "Opción dos", accessibilityLabel: "Ver dos" },
    { value: "tres" as TestOption, label: "Opción tres", accessibilityLabel: "Ver tres" },
  ];
}

describe("FilterChipDropdown", () => {
  beforeEach(() => {
    mockUseWindowDimensions.mockReturnValue({
      width: 400,
      height: 800,
      scale: 2,
      fontScale: 1,
    });
  });

  it("muestra el chipLabel completo en el chip colapsado", () => {
    const { getByText } = render(
      <FilterChipDropdown<TestOption>
        chipLabel="Opción uno (3)"
        chipAccessibilityLabel="Cambiar filtro"
        options={buildOptions()}
        activeValue="uno"
        onSelect={jest.fn()}
      />,
    );

    expect(getByText("Opción uno (3)")).toBeTruthy();
  });

  it("abre y cierra el menú al presionar el chip", () => {
    const { getByLabelText, queryByText, getByText } = render(
      <FilterChipDropdown<TestOption>
        chipLabel="Opción uno"
        chipAccessibilityLabel="Cambiar filtro"
        options={buildOptions()}
        activeValue="uno"
        onSelect={jest.fn()}
      />,
    );

    expect(queryByText("Opción dos")).toBeNull();

    fireEvent.press(getByLabelText("Cambiar filtro"));
    expect(getByText("Opción dos")).toBeTruthy();

    fireEvent.press(getByLabelText("Cambiar filtro"));
    expect(queryByText("Opción dos")).toBeNull();
  });

  it("marca accessibilityRole radio y accessibilityState checked en la opción activa", () => {
    const { getByLabelText } = render(
      <FilterChipDropdown<TestOption>
        chipLabel="Opción dos"
        chipAccessibilityLabel="Cambiar filtro"
        options={buildOptions()}
        activeValue="dos"
        onSelect={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro"));

    const activeOption = getByLabelText("Ver dos");
    expect(activeOption.props.accessibilityRole).toBe("radio");
    expect(activeOption.props.accessibilityState).toEqual({ checked: true });

    const inactiveOption = getByLabelText("Ver uno");
    expect(inactiveOption.props.accessibilityState).toEqual({
      checked: false,
    });
  });

  it("onSelect cierra el menú al elegir una opción", () => {
    const onSelect = jest.fn();
    const { getByLabelText, queryByText } = render(
      <FilterChipDropdown<TestOption>
        chipLabel="Opción uno"
        chipAccessibilityLabel="Cambiar filtro"
        options={buildOptions()}
        activeValue="uno"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro"));
    fireEvent.press(getByLabelText("Ver dos"));

    expect(onSelect).toHaveBeenCalledWith("dos");
    expect(queryByText("Opción tres")).toBeNull();
  });

  it("en pantallas anchas ancla el menú al borde izquierdo (mismo borde donde empieza el chip), no al borde derecho de la pantalla", () => {
    const { getByLabelText, getByTestId } = render(
      <FilterChipDropdown<TestOption>
        chipLabel="Opción uno"
        chipAccessibilityLabel="Cambiar filtro"
        options={buildOptions()}
        activeValue="uno"
        onSelect={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro"));

    const menuContainer = getByTestId("filter-chip-dropdown-menu");
    const flatStyle = Array.isArray(menuContainer.props.style)
      ? Object.assign({}, ...menuContainer.props.style)
      : menuContainer.props.style;

    expect(flatStyle.left).toBe(0);
    expect(flatStyle.right).toBeUndefined();
  });

  it("en pantallas angostas (menos de 340dp) el menú cae a ancho completo en vez de angostarse a la derecha", () => {
    mockUseWindowDimensions.mockReturnValue({
      width: 320,
      height: 700,
      scale: 2,
      fontScale: 1,
    });

    const { getByLabelText, getByTestId } = render(
      <FilterChipDropdown<TestOption>
        chipLabel="Opción uno"
        chipAccessibilityLabel="Cambiar filtro"
        options={buildOptions()}
        activeValue="uno"
        onSelect={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText("Cambiar filtro"));

    const menuContainer = getByTestId("filter-chip-dropdown-menu");
    const flatStyle = Array.isArray(menuContainer.props.style)
      ? Object.assign({}, ...menuContainer.props.style)
      : menuContainer.props.style;

    expect(flatStyle.left).toBe(0);
    expect(flatStyle.right).toBe(0);
  });
});
