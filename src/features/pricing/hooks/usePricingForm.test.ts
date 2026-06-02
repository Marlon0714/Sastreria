import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { usePricingForm } from "./usePricingForm";

jest.mock("../../../data/local/PricingServiceRepositoryImpl");
jest.mock("../../../shared/utils/network", () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

const MockRepo = require("../../../data/local/PricingServiceRepositoryImpl");

function HookWrapper({ id }: { id?: string }) {
  const hook = usePricingForm(id);
  if (hook.loading) {
    return React.createElement(Text, { testID: "loading" }, "loading");
  }
  if (hook.error) {
    return React.createElement(Text, { testID: "error" }, hook.error);
  }
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Text, { testID: "name" }, hook.initialValues.name ?? ""),
    React.createElement(
      Text,
      { testID: "price" },
      String(hook.initialValues.price ?? ""),
    ),
    React.createElement(
      Text,
      { testID: "category" },
      hook.initialValues.category ?? "",
    ),
  );
}

describe("usePricingForm", () => {
  beforeEach(() => {
    MockRepo.PricingServiceRepositoryImpl.mockClear();
  });

  it("carga valores iniciales para edición", async () => {
    MockRepo.PricingServiceRepositoryImpl.mockImplementation((): unknown => ({
      getById: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "1",
        name: "Dobladillo",
        price: 10000,
        category: "arreglo",
        notes: null,
        createdAt: "2026-05-01T10:00:00.000Z",
        updatedAt: "2026-05-01T10:00:00.000Z",
        syncStatus: "synced",
      }),
      update: jest.fn(),
      create: jest.fn(),
    }));

    const { findByTestId } = render(React.createElement(HookWrapper, { id: "1" }));
    expect(await findByTestId("name")).toHaveTextContent("Dobladillo");
    expect(await findByTestId("price")).toHaveTextContent("10000");
    expect(await findByTestId("category")).toHaveTextContent("arreglo");
  });
});
