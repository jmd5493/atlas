import { describe, expect, it } from "vitest";

import {
  isPositiveWholeNumber,
  parseIncomingDays,
  parseIncomingExercise,
} from "./day-parsing";

describe("isPositiveWholeNumber", () => {
  it("accepts positive integers", () => {
    expect(isPositiveWholeNumber(1)).toBe(true);
    expect(isPositiveWholeNumber(42)).toBe(true);
  });

  it("rejects zero, negatives, decimals, and NaN", () => {
    expect(isPositiveWholeNumber(0)).toBe(false);
    expect(isPositiveWholeNumber(-1)).toBe(false);
    expect(isPositiveWholeNumber(1.5)).toBe(false);
    expect(isPositiveWholeNumber(Number.NaN)).toBe(false);
  });
});

describe("parseIncomingExercise", () => {
  it("parses a complete valid exercise", () => {
    expect(
      parseIncomingExercise({ name: "Back Squat", sets: "4", reps: "8", weight: "185", notes: "slow tempo" }),
    ).toEqual({
      exercise_name: "Back Squat",
      sets: 4,
      reps: 8,
      target_weight: 185,
      notes: "slow tempo",
    });
  });

  it("trims name and notes", () => {
    const result = parseIncomingExercise({ name: "  Row  ", sets: "3", reps: "10", notes: "  easy  " });
    expect(result?.exercise_name).toBe("Row");
    expect(result?.notes).toBe("easy");
  });

  it.each([
    ["missing name", { sets: "3", reps: "10" }],
    ["whitespace-only name", { name: "   ", sets: "3", reps: "10" }],
    ["zero sets", { name: "Row", sets: "0", reps: "10" }],
    ["negative reps", { name: "Row", sets: "3", reps: "-5" }],
    ["non-numeric sets", { name: "Row", sets: "abc", reps: "10" }],
    ["missing sets and reps", { name: "Row" }],
  ])("returns null for %s", (_label, raw) => {
    expect(parseIncomingExercise(raw)).toBeNull();
  });

  it("truncates a decimal sets/reps value via parseInt rather than rejecting it", () => {
    // Number.parseInt("3.5", 10) === 3 — documenting this intentionally,
    // since it's easy to assume decimals get rejected outright.
    const result = parseIncomingExercise({ name: "Row", sets: "3.5", reps: "10" });
    expect(result?.sets).toBe(3);
  });

  it("treats a weight of 0 as a real value, not missing", () => {
    const result = parseIncomingExercise({ name: "Row", sets: "3", reps: "10", weight: "0" });
    expect(result?.target_weight).toBe(0);
  });

  it("falls back to null target_weight when weight is omitted or unparseable", () => {
    expect(parseIncomingExercise({ name: "Row", sets: "3", reps: "10" })?.target_weight).toBeNull();
    expect(
      parseIncomingExercise({ name: "Row", sets: "3", reps: "10", weight: "not-a-number" })?.target_weight,
    ).toBeNull();
  });

  it("falls back to null notes when omitted or blank", () => {
    expect(parseIncomingExercise({ name: "Row", sets: "3", reps: "10" })?.notes).toBeNull();
    expect(parseIncomingExercise({ name: "Row", sets: "3", reps: "10", notes: "   " })?.notes).toBeNull();
  });
});

describe("parseIncomingDays", () => {
  it("returns [] for invalid JSON", () => {
    expect(parseIncomingDays("not json")).toEqual([]);
  });

  it("returns [] when the parsed value isn't an array", () => {
    expect(parseIncomingDays(JSON.stringify({ dayNumber: 1 }))).toEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(parseIncomingDays("[]")).toEqual([]);
  });

  it.each([0, 8, -1, 100])("skips a day number out of the 1-7 range (%i)", (dayNumber) => {
    const input = JSON.stringify([
      { dayNumber, workouts: [{ label: "X", exercises: [{ name: "Row", sets: "3", reps: "10" }] }] },
    ]);
    expect(parseIncomingDays(input)).toEqual([]);
  });

  it("skips a non-integer day number", () => {
    const input = JSON.stringify([
      { dayNumber: 2.5, workouts: [{ label: "X", exercises: [{ name: "Row", sets: "3", reps: "10" }] }] },
    ]);
    expect(parseIncomingDays(input)).toEqual([]);
  });

  it("drops a workout whose exercises are all invalid", () => {
    const input = JSON.stringify([
      { dayNumber: 1, workouts: [{ label: "Empty Day", exercises: [{ name: "", sets: "3", reps: "10" }] }] },
    ]);
    expect(parseIncomingDays(input)).toEqual([]);
  });

  it("keeps valid exercises and drops invalid ones within the same workout", () => {
    const input = JSON.stringify([
      {
        dayNumber: 1,
        workouts: [
          {
            label: "Leg Day",
            exercises: [
              { name: "Squat", sets: "4", reps: "8", weight: "185" },
              { name: "", sets: "3", reps: "10" }, // invalid: no name
              { name: "Lunge", sets: "3", reps: "12" },
            ],
          },
        ],
      },
    ]);

    const days = parseIncomingDays(input);
    expect(days).toHaveLength(1);
    expect(days[0].exercises.map((e) => e.exercise_name)).toEqual(["Squat", "Lunge"]);
  });

  it("defaults the day label when none is provided", () => {
    const input = JSON.stringify([
      { dayNumber: 3, workouts: [{ exercises: [{ name: "Row", sets: "3", reps: "10" }] }] },
    ]);
    expect(parseIncomingDays(input)[0].day_label).toBe("Day 3 workout 1");
  });

  it("uses a provided, trimmed label", () => {
    const input = JSON.stringify([
      { dayNumber: 3, workouts: [{ label: "  Push Day  ", exercises: [{ name: "Row", sets: "3", reps: "10" }] }] },
    ]);
    expect(parseIncomingDays(input)[0].day_label).toBe("Push Day");
  });

  it("supports multiple workouts on the same day, ordered by sort_order", () => {
    const input = JSON.stringify([
      {
        dayNumber: 1,
        workouts: [
          { label: "Morning Strength", exercises: [{ name: "Squat", sets: "4", reps: "8" }] },
          { label: "Evening Cardio", exercises: [{ name: "Row Intervals", sets: "6", reps: "1" }] },
        ],
      },
    ]);

    const days = parseIncomingDays(input);
    expect(days).toHaveLength(2);
    expect(days.every((d) => d.day_number === 1)).toBe(true);
    expect(days.map((d) => [d.day_label, d.sort_order])).toEqual([
      ["Morning Strength", 1],
      ["Evening Cardio", 2],
    ]);
  });

  it("supports workouts spread across multiple days", () => {
    const input = JSON.stringify([
      { dayNumber: 1, workouts: [{ label: "Push", exercises: [{ name: "Bench", sets: "4", reps: "6" }] }] },
      { dayNumber: 4, workouts: [{ label: "Pull", exercises: [{ name: "Row", sets: "4", reps: "8" }] }] },
    ]);

    const days = parseIncomingDays(input);
    expect(days.map((d) => d.day_number)).toEqual([1, 4]);
  });
});
