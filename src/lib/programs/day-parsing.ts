// Pure parsing/validation for the ProgramDayBuilder's serialized "daysJson"
// field. Split out of src/app/actions/programs.ts so it's unit-testable in
// isolation (a "use server" file can only export async functions, so these
// couldn't live there even without tests) and reused identically by both
// createWorkoutProgram and updateWorkoutProgramDays.

export type ParsedExercise = {
  exercise_name: string;
  sets: number;
  reps: number;
  target_weight: number | null;
  notes: string | null;
};

export type ParsedWorkoutDay = {
  day_number: number;
  day_label: string;
  sort_order: number;
  exercises: ParsedExercise[];
};

export type IncomingExercise = {
  name?: unknown;
  sets?: unknown;
  reps?: unknown;
  weight?: unknown;
  notes?: unknown;
};

export type IncomingWorkoutBlock = {
  label?: unknown;
  exercises?: unknown;
};

export type IncomingDay = {
  dayNumber?: unknown;
  workouts?: unknown;
};

export function isPositiveWholeNumber(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function parseIncomingExercise(raw: IncomingExercise): ParsedExercise | null {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const sets = Number.parseInt(String(raw?.sets ?? ""), 10);
  const reps = Number.parseInt(String(raw?.reps ?? ""), 10);
  const weightInput = raw?.weight;
  const weight =
    typeof weightInput === "string" || typeof weightInput === "number"
      ? Number.parseFloat(String(weightInput))
      : NaN;
  const notes = typeof raw?.notes === "string" ? raw.notes.trim() : "";

  if (!name || !isPositiveWholeNumber(sets) || !isPositiveWholeNumber(reps)) {
    return null;
  }

  return {
    exercise_name: name,
    sets,
    reps,
    target_weight: Number.isNaN(weight) ? null : weight,
    notes: notes.length > 0 ? notes : null,
  };
}

export function parseIncomingDays(rawJson: string): ParsedWorkoutDay[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const days: ParsedWorkoutDay[] = [];

  for (const entry of parsed as IncomingDay[]) {
    const dayNumber = Number(entry?.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
      continue;
    }

    const workouts = Array.isArray(entry?.workouts) ? (entry.workouts as IncomingWorkoutBlock[]) : [];

    workouts.forEach((workout, index) => {
      const label = typeof workout?.label === "string" ? workout.label.trim() : "";
      const exercisesRaw = Array.isArray(workout?.exercises)
        ? (workout.exercises as IncomingExercise[])
        : [];
      const exercises = exercisesRaw
        .map(parseIncomingExercise)
        .filter((exercise): exercise is ParsedExercise => exercise !== null);

      if (exercises.length === 0) {
        return;
      }

      days.push({
        day_number: dayNumber,
        day_label: label.length > 0 ? label : `Day ${dayNumber} workout ${index + 1}`,
        sort_order: index + 1,
        exercises,
      });
    });
  }

  return days;
}
