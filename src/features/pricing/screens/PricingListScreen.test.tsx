import { describe, it, expect, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";

import PricingListScreen from "./PricingListScreen";
import * as usePricingServicesModule from "../hooks/usePricingServices";
import { pricingStrings } from "../domain/strings";

jest.mock("../components/PricingItem", () => {
  const React = require("react");
  const { Text } = require("react-native");
  function PricingItemMock(props: any) {
    return React.createElement(Text, null, props.service.name);
  }
  return PricingItemMock;
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

describe("PricingListScreen", () => {
  it("muestra loading", () => {
    jest.spyOn(usePricingServicesModule, "usePricingServices").mockReturnValue({
      services: [],
      loading: true,
      error: null,
      refresh: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      remove: jest.fn() as any,
      syncStatus: "synced",
      isOffline: false,
    });
    const { getByText } = render(<PricingListScreen />);
    expect(getByText(pricingStrings.title + "...")).toBeTruthy();
  });

  it("muestra error", () => {
    jest.spyOn(usePricingServicesModule, "usePricingServices").mockReturnValue({
      services: [],
      loading: false,
      error: "Error de red",
      refresh: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      remove: jest.fn() as any,
      syncStatus: "synced",
      isOffline: false,
    });
    const { getByText } = render(<PricingListScreen />);
    expect(getByText(pricingStrings.fetchError)).toBeTruthy();
  });

  it("muestra empty", () => {
    jest.spyOn(usePricingServicesModule, "usePricingServices").mockReturnValue({
      services: [],
      loading: false,
      error: null,
      refresh: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      remove: jest.fn() as any,
      syncStatus: "synced",
      isOffline: false,
    });
    const { getByText } = render(<PricingListScreen />);
    expect(getByText(pricingStrings.notFound)).toBeTruthy();
  });

  it("muestra lista de servicios", () => {
    jest.spyOn(usePricingServicesModule, "usePricingServices").mockReturnValue({
      services: [
        {
          id: "1",
          name: "Dobladillo",
          price: 10000,
          notes: null,
          createdAt: "",
          updatedAt: "",
          syncStatus: "synced",
        },
      ],
      loading: false,
      error: null,
      refresh: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      remove: jest.fn() as any,
      syncStatus: "synced",
      isOffline: false,
    });
    const { getByText } = render(<PricingListScreen />);
    expect(getByText("Dobladillo")).toBeTruthy();
  });
});
