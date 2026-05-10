import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { usePricingForm } from "./usePricingForm";

jest.mock("../../../data/local/PricingServiceRepositoryImpl");
const MockRepo = require("../../../data/local/PricingServiceRepositoryImpl");

const mockService = {
  id: "1",
  name: "Dobladillo",
  price: 10000,
  notes: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  syncStatus: "pending",
};

function HookWrapper({ id, options }: any) {
  const hook = usePricingForm(id, options);
  return (
    <>
      {hook.loading && <Text testID="loading">loading</Text>}
      {hook.error && <Text testID="error">{hook.error}</Text>}
      {hook.initialValues?.name && (
        <Text testID="name">{hook.initialValues.name}</Text>
      )}
      {hook.initialValues?.price && (
        <Text testID="price">{hook.initialValues.price}</Text>
      )}
      <Text testID="syncStatus">{hook.syncStatus}</Text>
    </>
  );
}

describe("usePricingForm", () => {
  beforeEach(() => {
    MockRepo.PricingServiceRepositoryImpl.mockClear();
  });

  it("carga valores iniciales si hay id (happy path)", async () => {
    MockRepo.PricingServiceRepositoryImpl.mockImplementation((): any => ({
      getById: (jest.fn() as jest.Mock<any>).mockResolvedValue(mockService),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    }));
    const { findByTestId, queryByTestId } = render(<HookWrapper id="1" />);
    expect(await findByTestId("name")).toHaveTextContent("Dobladillo");
    expect(await findByTestId("price")).toHaveTextContent("10000");
    expect(queryByTestId("loading")).toBeNull();
    expect(queryByTestId("error")).toBeNull();
  });

  it("devuelve error si falla getById", async () => {
    MockRepo.PricingServiceRepositoryImpl.mockImplementation((): any => ({
      getById: (jest.fn() as jest.Mock<any>).mockRejectedValue(
        new Error("fail"),
      ),
      update: jest.fn(),
      create: jest.fn(),
    }));
    const { findByTestId, queryByTestId } = render(<HookWrapper id="1" />);
    expect(await findByTestId("error")).toHaveTextContent("fail");
    expect(queryByTestId("loading")).toBeNull();
  });

  it("llama create y onSuccess al crear nuevo servicio", async () => {
    const onSuccess = jest.fn();
    MockRepo.PricingServiceRepositoryImpl.mockImplementation((): any => ({
      getById: jest.fn(),
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        ...mockService,
        name: "Nuevo",
        price: 5000,
      }),
      update: jest.fn(),
    }));
    let hookRef: any = {};
    function TestComponent() {
      hookRef.hook = usePricingForm(undefined, { onSuccess });
      return null;
    }
    render(<TestComponent />);
    await act(async () => {
      await hookRef.hook.onSubmit({ name: "Nuevo", price: 5000 });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(hookRef.hook.error).toBeNull();
  });

  it("llama update y onSuccess al editar servicio", async () => {
    const onSuccess = jest.fn();
    MockRepo.PricingServiceRepositoryImpl.mockImplementation((): any => ({
      getById: (jest.fn() as jest.Mock<any>).mockResolvedValue(mockService),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        ...mockService,
        name: "Editado",
        price: 8000,
      }),
      create: jest.fn(),
    }));
    let hookRef: any = {};
    function TestComponent() {
      hookRef.hook = usePricingForm("1", { onSuccess });
      return null;
    }
    render(<TestComponent />);
    await act(async () => {
      await hookRef.hook.onSubmit({ name: "Editado", price: 8000 });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(hookRef.hook.error).toBeNull();
  });

  it("setea error si falla create/update", async () => {
    const onError = jest.fn();
    MockRepo.PricingServiceRepositoryImpl.mockImplementation((): any => ({
      getById: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: (jest.fn() as jest.Mock<any>).mockRejectedValue(
        new Error("fail create"),
      ),
      update: (jest.fn() as jest.Mock<any>).mockRejectedValue(
        new Error("fail update"),
      ),
    }));
    let hookRef: any = {};
    function TestComponent({ id }: { id?: string }) {
      hookRef.hook = usePricingForm(id, { onError });
      return null;
    }
    // Create
    render(<TestComponent />);
    await act(async () => {
      await hookRef.hook.onSubmit({ name: "Nuevo", price: 5000 });
    });
    expect(hookRef.hook.error).toBe("fail create");
    expect(onError).toHaveBeenCalledWith("fail create");
    // Update
    render(<TestComponent id="1" />);
    await act(async () => {
      await hookRef.hook.onSubmit({ name: "Editado", price: 8000 });
    });
    expect(hookRef.hook.error).toBe("fail update");
    expect(onError).toHaveBeenCalledWith("fail update");
  });
});
