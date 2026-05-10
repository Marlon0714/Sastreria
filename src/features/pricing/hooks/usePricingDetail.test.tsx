import { describe, it, expect, jest } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import * as repoModule from "../../../data/local/PricingServiceRepositoryImpl";
import { usePricingDetail } from "./usePricingDetail";

function HookWrapper({ id }: { id: string }) {
  const { service, loading, error } = usePricingDetail(id);
  return (
    <>
      {loading && <Text testID="loading">loading</Text>}
      {error && <Text testID="error">{error}</Text>}
      {service?.name && <Text testID="name">{service.name}</Text>}
    </>
  );
}

describe("usePricingDetail", () => {
  it("carga detalle correctamente", async () => {
    jest.spyOn(repoModule, "PricingServiceRepositoryImpl").mockImplementation(
      () =>
        ({
          getById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
            id: "1",
            name: "Dobladillo",
            price: 10000,
            notes: null,
            createdAt: "",
            updatedAt: "",
            syncStatus: "synced",
          }) as any,
        }) as any,
    );
    const { findByTestId, queryByTestId } = render(<HookWrapper id="1" />);
    expect(await findByTestId("name")).toHaveTextContent("Dobladillo");
    expect(queryByTestId("loading")).toBeNull();
    expect(queryByTestId("error")).toBeNull();
  });

  it("maneja error de carga", async () => {
    jest.spyOn(repoModule, "PricingServiceRepositoryImpl").mockImplementation(
      () =>
        ({
          getById: (jest.fn() as jest.Mock<any>).mockRejectedValue(
            new Error("fail"),
          ) as any,
        }) as any,
    );
    const { findByTestId, queryByTestId } = render(<HookWrapper id="1" />);
    expect(await findByTestId("error")).toHaveTextContent("fail");
    expect(queryByTestId("name")).toBeNull();
  });
});
