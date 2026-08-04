import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ProfilesCacheRepositoryImpl } from "./ProfilesCacheRepositoryImpl";

const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();

jest.mock("./database", () => ({
  getDatabase: () => ({
    getAllAsync: (sql: string, ...params: unknown[]) =>
      mockGetAllAsync(sql, ...params),
  }),
}));

describe("ProfilesCacheRepositoryImpl", () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
  });

  it("mapea las filas y excluye dispositivos compartidos en la consulta", async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: "user-1",
        display_name: "María Gómez",
        role: "operario",
        is_shared_device: 0,
      },
    ]);
    const repository = new ProfilesCacheRepositoryImpl();

    const result = await repository.getOperarios();

    expect(result).toEqual([
      {
        id: "user-1",
        displayName: "María Gómez",
        role: "operario",
        isSharedDevice: false,
      },
    ]);
    const [sql] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE is_shared_device = 0");
  });

  it("retorna una lista vacía si no hay operarios cacheados", async () => {
    mockGetAllAsync.mockResolvedValueOnce([]);
    const repository = new ProfilesCacheRepositoryImpl();

    const result = await repository.getOperarios();

    expect(result).toEqual([]);
  });
});
