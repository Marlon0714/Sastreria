import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";

import { ArregloLabelView } from "./ArregloLabelView";

describe("ArregloLabelView", () => {
  it("muestra el teléfono de la sastrería debajo de su nombre", () => {
    const { getByText } = render(
      <ArregloLabelView label={{ clientName: "Ana Torres" }} />,
    );

    expect(getByText("Eduar Espinosa")).toBeTruthy();
    expect(getByText("SASTRERÍA")).toBeTruthy();
    expect(getByText("Tel. 3103580608")).toBeTruthy();
  });

  it("muestra 'Pagado' cuando el saldo queda en $0", () => {
    const { getByText, queryByText } = render(
      <ArregloLabelView label={{ clientName: "Ana Torres", saldo: 0 }} />,
    );

    expect(getByText("SALDO")).toBeTruthy();
    expect(getByText("Pagado")).toBeTruthy();
    expect(queryByText("$0")).toBeNull();
  });
});
