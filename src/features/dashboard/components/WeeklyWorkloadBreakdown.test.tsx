import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";

import { WeeklyWorkloadBreakdown } from "./WeeklyWorkloadBreakdown";

const WEEK_DATES = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

describe("WeeklyWorkloadBreakdown", () => {
  it("muestra el conteo de cada día, incluyendo un día en 0", () => {
    const counts = [3, 7, 1, 2, 6, 5, 0];

    const { getByText } = render(
      <WeeklyWorkloadBreakdown weekDates={WEEK_DATES} counts={counts} />,
    );

    expect(getByText("Lun")).toBeTruthy();
    expect(getByText("Dom")).toBeTruthy();
    for (const count of counts) {
      expect(getByText(String(count))).toBeTruthy();
    }
  });
});
