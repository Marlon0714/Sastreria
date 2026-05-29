import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { usePricingServices } from "./usePricingServices";
import * as repoModule from "../../../data/local/PricingServiceRepositoryImpl";

jest.mock("../../../shared/utils/network", () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

function HookWrapper() {
  const hook = usePricingServices();
  if (hook.loading) {
    return React.createElement(Text, { testID: "loading" }, "loading");
  }
  if (hook.error) {
    return React.createElement(Text, { testID: "error" }, hook.error);
  }
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Text, { testID: "count" }, String(hook.services.length)),
    React.createElement(
      Text,
      { testID: "first-category" },
      hook.services[0]?.category ?? "none",
    ),
    React.createElement(
      Text,
      { testID: "second-category" },
      hook.services[1]?.category ?? "none",
    ),
  );
}

describe("usePricingServices", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("carga servicios y preserva categoría", async () => {
    jest
      .spyOn(repoModule.PricingServiceRepositoryImpl.prototype, "getAll")
      .mockResolvedValue([
        {
          id: "1",
          name: "Dobladillo",
          price: 10000,
          category: "arreglo",
          notes: null,
          createdAt: "2026-05-01T10:00:00.000Z",
          updatedAt: "2026-05-01T10:00:00.000Z",
          syncStatus: "synced",
        },
        {
          id: "2",
          name: "Camisa",
          price: 50000,
          category: "confeccion",
          notes: null,
          createdAt: "2026-05-01T10:00:00.000Z",
          updatedAt: "2026-05-01T10:00:00.000Z",
          syncStatus: "synced",
        },
      ]);

    const { findByTestId } = render(React.createElement(HookWrapper));
    expect(await findByTestId("count")).toHaveTextContent("2");
    expect(await findByTestId("first-category")).toHaveTextContent("arreglo");
    expect(await findByTestId("second-category")).toHaveTextContent(
      "confeccion",
    );
  });
});
