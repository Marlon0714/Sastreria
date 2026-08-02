import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { useDeleteSchedule } from "./useDeleteSchedule";

const mockDelete = jest.fn<(id: string) => Promise<void>>();

jest.mock("../../../data/local/scheduleDependencies", () => ({
  getDefaultScheduleRepository: () => ({
    delete: (id: string) => mockDelete(id),
  }),
}));

describe("useDeleteSchedule", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("returns true and clears error on success", async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDeleteSchedule());

    let success = false;
    await act(async () => {
      success = await result.current.deleteSchedule("schedule-1");
    });

    expect(success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("schedule-1");
    expect(result.current.error).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it("returns false and sets error on failure", async () => {
    mockDelete.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useDeleteSchedule());

    let success = true;
    await act(async () => {
      success = await result.current.deleteSchedule("schedule-1");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe(
      "No se pudo eliminar el turno. Intenta nuevamente.",
    );
  });
});
