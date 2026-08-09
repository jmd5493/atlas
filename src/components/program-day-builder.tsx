"use client";

import { useState } from "react";

type ExerciseRow = {
  key: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  notes: string;
};

type WorkoutBlock = {
  key: string;
  label: string;
  exercises: ExerciseRow[];
};

type DayState = {
  dayNumber: number;
  workouts: WorkoutBlock[];
};

const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

function randomKey(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function createExerciseRow(): ExerciseRow {
  return { key: randomKey("exercise"), name: "", sets: "", reps: "", weight: "", notes: "" };
}

function createWorkoutBlock(): WorkoutBlock {
  return { key: randomKey("workout"), label: "", exercises: [createExerciseRow()] };
}

function emptyDays(): DayState[] {
  return DAY_NUMBERS.map((dayNumber) => ({ dayNumber, workouts: [] }));
}

// Shape used to pre-populate the builder from an already-created program's
// saved rows. Plain data in, no keys required — the builder assigns its own
// React keys when it hydrates this into internal state.
export type InitialWorkoutDay = {
  dayNumber: number;
  workouts: {
    label: string;
    exercises: {
      name: string;
      sets: string;
      reps: string;
      weight: string;
      notes: string;
    }[];
  }[];
};

function hydrateInitialDays(initial: InitialWorkoutDay[] | undefined): DayState[] {
  if (!initial || initial.length === 0) {
    return emptyDays();
  }

  const byDayNumber = new Map(initial.map((day) => [day.dayNumber, day]));

  return DAY_NUMBERS.map((dayNumber) => {
    const source = byDayNumber.get(dayNumber);
    if (!source) {
      return { dayNumber, workouts: [] };
    }

    return {
      dayNumber,
      workouts: source.workouts.map((workout) => ({
        key: randomKey("workout"),
        label: workout.label,
        exercises:
          workout.exercises.length > 0
            ? workout.exercises.map((exercise) => ({ key: randomKey("exercise"), ...exercise }))
            : [createExerciseRow()],
      })),
    };
  });
}

type ProgramDayBuilderProps = {
  fieldName: string;
  initialDays?: InitialWorkoutDay[];
};

export function ProgramDayBuilder({ fieldName, initialDays }: ProgramDayBuilderProps) {
  const [days, setDays] = useState<DayState[]>(() => hydrateInitialDays(initialDays));

  function updateDay(dayNumber: number, updater: (day: DayState) => DayState) {
    setDays((prev) => prev.map((day) => (day.dayNumber === dayNumber ? updater(day) : day)));
  }

  function addWorkout(dayNumber: number) {
    updateDay(dayNumber, (day) => ({ ...day, workouts: [...day.workouts, createWorkoutBlock()] }));
  }

  function removeWorkout(dayNumber: number, workoutKey: string) {
    updateDay(dayNumber, (day) => ({
      ...day,
      workouts: day.workouts.filter((workout) => workout.key !== workoutKey),
    }));
  }

  function updateWorkoutLabel(dayNumber: number, workoutKey: string, label: string) {
    updateDay(dayNumber, (day) => ({
      ...day,
      workouts: day.workouts.map((workout) =>
        workout.key === workoutKey ? { ...workout, label } : workout,
      ),
    }));
  }

  function addExercise(dayNumber: number, workoutKey: string) {
    updateDay(dayNumber, (day) => ({
      ...day,
      workouts: day.workouts.map((workout) =>
        workout.key === workoutKey
          ? { ...workout, exercises: [...workout.exercises, createExerciseRow()] }
          : workout,
      ),
    }));
  }

  function removeExercise(dayNumber: number, workoutKey: string, exerciseKey: string) {
    updateDay(dayNumber, (day) => ({
      ...day,
      workouts: day.workouts.map((workout) =>
        workout.key === workoutKey
          ? { ...workout, exercises: workout.exercises.filter((row) => row.key !== exerciseKey) }
          : workout,
      ),
    }));
  }

  function updateExercise(
    dayNumber: number,
    workoutKey: string,
    exerciseKey: string,
    patch: Partial<ExerciseRow>,
  ) {
    updateDay(dayNumber, (day) => ({
      ...day,
      workouts: day.workouts.map((workout) =>
        workout.key === workoutKey
          ? {
              ...workout,
              exercises: workout.exercises.map((row) =>
                row.key === exerciseKey ? { ...row, ...patch } : row,
              ),
            }
          : workout,
      ),
    }));
  }

  const serializedDays = JSON.stringify(
    days.map((day) => ({
      dayNumber: day.dayNumber,
      workouts: day.workouts.map((workout) => ({
        label: workout.label,
        exercises: workout.exercises.map((row) => ({
          name: row.name,
          sets: row.sets,
          reps: row.reps,
          weight: row.weight,
          notes: row.notes,
        })),
      })),
    })),
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={serializedDays} />

      {days.map((day) => (
        <div key={day.dayNumber} className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-600">
              Day {day.dayNumber}
            </h4>
            <button
              type="button"
              onClick={() => addWorkout(day.dayNumber)}
              className="inline-flex items-center justify-center rounded-full border border-gold-deep px-3 py-1.5 text-xs font-medium text-gold-deep transition hover:bg-gold-deep hover:text-white"
            >
              + Add workout
            </button>
          </div>

          {day.workouts.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              No workout on this day. Click &ldquo;Add workout&rdquo; if the client trains this day.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {day.workouts.map((workout, workoutIndex) => (
                <div key={workout.key} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
                      Workout {workoutIndex + 1} name
                    </label>
                    <button
                      type="button"
                      onClick={() => removeWorkout(day.dayNumber, workout.key)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove workout
                    </button>
                  </div>
                  <input
                    value={workout.label}
                    onChange={(event) => updateWorkoutLabel(day.dayNumber, workout.key, event.target.value)}
                    placeholder="e.g. AM Strength, Evening Cardio"
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                  />

                  <div className="mt-3 space-y-2">
                    {workout.exercises.map((exercise, exerciseIndex) => (
                      <div key={exercise.key} className="rounded-lg border border-stone-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500">
                            Exercise {exerciseIndex + 1}
                          </p>
                          {workout.exercises.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeExercise(day.dayNumber, workout.key, exercise.key)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <input
                          value={exercise.name}
                          onChange={(event) =>
                            updateExercise(day.dayNumber, workout.key, exercise.key, {
                              name: event.target.value,
                            })
                          }
                          placeholder="Exercise name (e.g. Back Squat)"
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                        />

                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-500">
                              Sets
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={exercise.sets}
                              onChange={(event) =>
                                updateExercise(day.dayNumber, workout.key, exercise.key, {
                                  sets: event.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-500">
                              Reps
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={exercise.reps}
                              onChange={(event) =>
                                updateExercise(day.dayNumber, workout.key, exercise.key, {
                                  reps: event.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                            />
                          </div>
                          <div className="col-span-2 space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-500">
                              Weight (optional)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={exercise.weight}
                              onChange={(event) =>
                                updateExercise(day.dayNumber, workout.key, exercise.key, {
                                  weight: event.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                            />
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-stone-500">
                            Notes (optional)
                          </label>
                          <input
                            value={exercise.notes}
                            onChange={(event) =>
                              updateExercise(day.dayNumber, workout.key, exercise.key, {
                                notes: event.target.value,
                              })
                            }
                            placeholder="e.g. slow tempo, warm up first"
                            className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addExercise(day.dayNumber, workout.key)}
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
                    >
                      + Add exercise
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
