import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { clientFactory } from "../../../__tests__/factories";
import type { Client } from "../domain/types";
import { useClientList } from "./useClientList";

const mockFindAll = jest.fn<() => Promise<Client[]>>();

jest.mock("../../../data/local/ClientRepositoryImpl", () => {
  return {
    ClientRepositoryImpl: jest.fn().mockImplementation(() => ({
      findAll: () => mockFindAll(),
    })),
  };
});

describe("useClientList", () => {
  beforeEach(() => {
    mockFindAll.mockReset();
  });

  it("loads clients on mount", async () => {
    const clients = [
      clientFactory(),
      clientFactory({
        id: "33333333-3333-4333-8333-333333333333",
        firstName: "Laura",
      }),
    ];
    mockFindAll.mockResolvedValueOnce(clients);

    const { result } = renderHook(() => useClientList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFindAll).toHaveBeenCalledTimes(1);
    expect(result.current.clients).toEqual(clients);
    expect(result.current.error).toBeNull();
  });

  it("exposes error and recovers after reload", async () => {
    const clients = [
      clientFactory({ id: "44444444-4444-4444-8444-444444444444" }),
    ];

    mockFindAll
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(clients);

    const { result } = renderHook(() => useClientList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "No se pudo cargar la lista de clientes.",
    );

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(mockFindAll).toHaveBeenCalledTimes(2);
    expect(result.current.clients).toEqual(clients);
  });
});
