import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { MeasurementRepositoryImpl } from "./MeasurementRepositoryImpl";

interface MockDatabase {
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
}

const mockRunAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown>>();
const mockGetAllAsync =
  jest.fn<(sql: string, ...params: unknown[]) => Promise<unknown[]>>();

const mockDatabase: MockDatabase = {
  runAsync: (sql: string, ...params: unknown[]) => mockRunAsync(sql, ...params),
  getAllAsync: <T>(sql: string, ...params: unknown[]) =>
    mockGetAllAsync(sql, ...params) as Promise<T[]>,
};

const mockGenerateDomainUuid = jest.fn<() => string>();

jest.mock("./database", () => {
  return {
    getDatabase: () => mockDatabase,
  };
});

jest.mock("../../features/clients/domain/types", () => {
  const actual = jest.requireActual(
    "../../features/clients/domain/types",
  ) as typeof import("../../features/clients/domain/types");

  return {
    ...actual,
    generateDomainUuid: () => mockGenerateDomainUuid(),
  };
});

describe("MeasurementRepositoryImpl", () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockGenerateDomainUuid.mockReset();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-29T13:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("adds measurement with pending sync status and parameterized query", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );

    const repository = new MeasurementRepositoryImpl();

    const created = await repository.addMeasurement({
      clientId: "11111111-1111-4111-8111-111111111111",
      measuredAt: "2026-04-28T10:00:00.000Z",
      pechoCm: 92.5,
      cinturaCm: 70.5,
      caderaCm: 95,
      largoCm: 110,
      notes: "  Ajustar molde  ",
    });

    expect(created).toEqual({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      clientId: "11111111-1111-4111-8111-111111111111",
      measuredAt: "2026-04-28T10:00:00.000Z",
      pechoCm: 92.5,
      cinturaCm: 70.5,
      caderaCm: 95,
      largoCm: 110,
      notes: "Ajustar molde",
      createdAt: "2026-04-29T13:00:00.000Z",
      updatedAt: "2026-04-29T13:00:00.000Z",
      syncStatus: "pending",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = mockRunAsync.mock.calls[0] ?? [];

    expect(sql).toContain("VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    expect(sql).not.toContain("92.5");
    expect(params).toEqual([
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "11111111-1111-4111-8111-111111111111",
      "2026-04-28T10:00:00.000Z",
      92.5,
      70.5,
      95,
      110,
      "Ajustar molde",
      "2026-04-29T13:00:00.000Z",
      "2026-04-29T13:00:00.000Z",
      "pending",
    ]);
  });

  it("uses current date as measuredAt when omitted", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );

    const repository = new MeasurementRepositoryImpl();

    const created = await repository.addMeasurement({
      clientId: "11111111-1111-4111-8111-111111111111",
      pechoCm: 90,
      cinturaCm: 70,
      caderaCm: 95,
      largoCm: 108,
      notes: "",
    });

    expect(created.measuredAt).toBe("2026-04-29T13:00:00.000Z");
    expect(created.syncStatus).toBe("pending");
  });

  it("triggers onWriteCommitted after successful addMeasurement", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
    );
    const onWriteCommitted = jest.fn<() => void>();
    const repository = new MeasurementRepositoryImpl({ onWriteCommitted });

    await repository.addMeasurement({
      clientId: "11111111-1111-4111-8111-111111111111",
      pechoCm: 90,
      cinturaCm: 70,
      caderaCm: 95,
      largoCm: 108,
      notes: "",
    });

    expect(onWriteCommitted).toHaveBeenCalledTimes(1);
  });

  it("does not fail addMeasurement when onWriteCommitted rejects", async () => {
    mockRunAsync.mockResolvedValueOnce({});
    mockGenerateDomainUuid.mockReturnValueOnce(
      "abababab-abab-4bab-8bab-abababababab",
    );
    const onWriteCommitted = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("sync failure"));
    const repository = new MeasurementRepositoryImpl({ onWriteCommitted });

    await expect(
      repository.addMeasurement({
        clientId: "11111111-1111-4111-8111-111111111111",
        pechoCm: 90,
        cinturaCm: 70,
        caderaCm: 95,
        largoCm: 108,
      }),
    ).resolves.toBeDefined();
  });

  it("findMeasurementsByClientId maps snake_case and keeps DESC order", async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: "m2",
        client_id: "client-1",
        measured_at: "2026-04-29T12:00:00.000Z",
        pecho_cm: 93,
        cintura_cm: 71,
        cadera_cm: 96,
        largo_cm: 111,
        notes: null,
        created_at: "2026-04-29T12:00:00.000Z",
        updated_at: "2026-04-29T12:00:00.000Z",
        sync_status: "pending",
      },
      {
        id: "m1",
        client_id: "client-1",
        measured_at: "2026-04-28T12:00:00.000Z",
        pecho_cm: 92,
        cintura_cm: 70,
        cadera_cm: 95,
        largo_cm: 110,
        notes: "Anterior",
        created_at: "2026-04-28T12:00:00.000Z",
        updated_at: "2026-04-28T12:00:00.000Z",
        sync_status: "synced",
      },
    ]);

    const repository = new MeasurementRepositoryImpl();
    const result = await repository.findMeasurementsByClientId("client-1");

    expect(result).toEqual([
      {
        id: "m2",
        clientId: "client-1",
        measuredAt: "2026-04-29T12:00:00.000Z",
        pechoCm: 93,
        cinturaCm: 71,
        caderaCm: 96,
        largoCm: 111,
        notes: null,
        createdAt: "2026-04-29T12:00:00.000Z",
        updatedAt: "2026-04-29T12:00:00.000Z",
        syncStatus: "pending",
      },
      {
        id: "m1",
        clientId: "client-1",
        measuredAt: "2026-04-28T12:00:00.000Z",
        pechoCm: 92,
        cinturaCm: 70,
        caderaCm: 95,
        largoCm: 110,
        notes: "Anterior",
        createdAt: "2026-04-28T12:00:00.000Z",
        updatedAt: "2026-04-28T12:00:00.000Z",
        syncStatus: "synced",
      },
    ]);

    const [sql, clientId] = mockGetAllAsync.mock.calls[0] ?? [];
    expect(sql).toContain("WHERE client_id = ?");
    expect(sql).toContain("ORDER BY measured_at DESC");
    expect(clientId).toBe("client-1");
  });
});
