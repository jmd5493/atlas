"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ParsedExercise = {
  exercise_name: string;
  sets: number;
  reps: number;
  target_weight: number | null;
  notes: string | null;
};

function buildErrorRedirect(basePath: string, status: string, code?: string, message?: string) {
  const errorCode = encodeURIComponent(code ?? "unknown");
  const errorMessage = encodeURIComponent(message ?? "Unknown error");
  return `${basePath}?status=${status}&errorCode=${errorCode}&errorMessage=${errorMessage}`;
}

function isPositiveWholeNumber(value: number) {
  return Number.isInteger(value) && value > 0;
}

function parseStrictFields(
  name: string,
  setsInput: string,
  repsInput: string,
  weightInput: string,
  notesInput: string,
): ParsedExercise | null {
  const sets = Number.parseInt(setsInput, 10);
  const reps = Number.parseInt(repsInput, 10);
  const weight = Number.parseFloat(weightInput);
  const cleanName = name.trim();

  if (!cleanName || !isPositiveWholeNumber(sets) || !isPositiveWholeNumber(reps)) {
    return null;
  }

  const notes = notesInput.trim();

  return {
    exercise_name: cleanName,
    sets,
    reps,
    target_weight: Number.isNaN(weight) ? null : weight,
    notes: notes.length > 0 ? notes : null,
  };
}

function parsePipeOrCommaLine(line: string): ParsedExercise | null {
  const parts = line.includes("|")
    ? line.split("|").map((value) => value.trim())
    : line.split(",").map((value) => value.trim());

  const [name = "", setsInput = "", repsInput = "", weightInput = "", ...notesParts] = parts;
  const notes = notesParts.join(" ");

  return parseStrictFields(name, setsInput, repsInput, weightInput, notes);
}

function parseCompactLine(line: string): ParsedExercise | null {
  const compactPattern = /^(.*?)\s+(\d+)\s*x\s*(\d+)(?:\s*@\s*([0-9]+(?:\.[0-9]+)?))?(?:\s*-\s*(.*))?$/i;
  const match = line.match(compactPattern);

  if (!match) {
    return null;
  }

  const [, name, setsInput, repsInput, weightInput, notesInput] = match;
  return parseStrictFields(name, setsInput, repsInput, weightInput ?? "", notesInput ?? "");
}

function parseFreeformLine(line: string): ParsedExercise | null {
  const setWordMatch = line.match(/(\d+)\s*(?:sets?|set)\b/i);
  const repWordMatch = line.match(/(\d+)\s*(?:reps?|rep)\b/i);
  const compactMatch = line.match(/(\d+)\s*x\s*(\d+)/i);
  const weightMatch = line.match(/@\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*(?:lb|lbs|kg)\b/i);

  let sets: number | null = null;
  let reps: number | null = null;

  if (setWordMatch && repWordMatch) {
    sets = Number.parseInt(setWordMatch[1], 10);
    reps = Number.parseInt(repWordMatch[1], 10);
  } else if (compactMatch) {
    sets = Number.parseInt(compactMatch[1], 10);
    reps = Number.parseInt(compactMatch[2], 10);
  } else {
    const numbers = [...line.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number.parseFloat(match[0]));
    if (numbers.length >= 2) {
      sets = Number.parseInt(String(numbers[0]), 10);
      reps = Number.parseInt(String(numbers[1]), 10);
    }
  }

  if (!sets || !reps || !isPositiveWholeNumber(sets) || !isPositiveWholeNumber(reps)) {
    return null;
  }

  const weightValue = weightMatch?.[1] ?? weightMatch?.[2] ?? "";
  const weight = Number.parseFloat(weightValue);

  const name = line
    .replace(/\d+\s*(?:sets?|set|reps?|rep)\b/gi, "")
    .replace(/\d+\s*x\s*\d+/gi, "")
    .replace(/@\s*[0-9]+(?:\.[0-9]+)?/gi, "")
    .replace(/[0-9]+(?:\.[0-9]+)?\s*(?:lb|lbs|kg)\b/gi, "")
    .replace(/\s+-\s+.*/, "")
    .replace(/[|,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) {
    return null;
  }

  return {
    exercise_name: name,
    sets,
    reps,
    target_weight: Number.isNaN(weight) ? null : weight,
    notes: null,
  };
}

function parseExerciseLines(rawValue: string): ParsedExercise[] {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.includes("|") || line.includes(",")) {
        const parsedDelimited = parsePipeOrCommaLine(line);
        if (parsedDelimited) {
          return parsedDelimited;
        }
      }

      const parsedCompact = parseCompactLine(line);
      if (parsedCompact) {
        return parsedCompact;
      }

      return parseFreeformLine(line);
    })
    .filter((entry): entry is ParsedExercise => entry !== null);
}

export async function createWorkoutProgram(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/programs?status=forbidden");
    return;
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const descriptionInput = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const durationWeeksInput = String(formData.get("durationWeeks") ?? "4").trim();

  if (!clientId || !title || !startDate) {
    redirect("/dashboard/programs?status=missing-fields");
    return;
  }

  const durationWeeks = Number.parseInt(durationWeeksInput, 10);
  if (Number.isNaN(durationWeeks) || durationWeeks <= 0 || durationWeeks > 52) {
    redirect("/dashboard/programs?status=invalid-duration");
    return;
  }

  const days = [1, 2, 3]
    .map((dayNumber) => {
      const dayLabelInput = String(formData.get(`day${dayNumber}Label`) ?? "").trim();
      const linesInput = String(formData.get(`day${dayNumber}Exercises`) ?? "").trim();

      const exercises = parseExerciseLines(linesInput);
      if (exercises.length === 0) {
        return null;
      }

      return {
        day_label: dayLabelInput.length > 0 ? dayLabelInput : `Day ${dayNumber}`,
        sort_order: dayNumber,
        exercises,
      };
    })
    .filter(
      (day): day is { day_label: string; sort_order: number; exercises: ParsedExercise[] } =>
        day !== null,
    );

  if (days.length === 0) {
    redirect("/dashboard/programs?status=missing-exercises");
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { data: program, error: programError } = await supabase
    .from("workout_programs")
    .insert({
      trainer_id: currentUser.user.id,
      client_id: clientId,
      title,
      description: descriptionInput.length > 0 ? descriptionInput : null,
      start_date: startDate,
      duration_weeks: durationWeeks,
    })
    .select("id")
    .single<{ id: string }>();

  if (programError || !program) {
    redirect(
      buildErrorRedirect(
        "/dashboard/programs",
        "create-failed",
        programError?.code,
        programError?.message ?? "Unknown program insert error",
      ),
    );
    return;
  }

  for (const day of days) {
    const { data: createdDay, error: dayError } = await supabase
      .from("workout_program_days")
      .insert({
        workout_program_id: program.id,
        day_label: day.day_label,
        sort_order: day.sort_order,
      })
      .select("id")
      .single<{ id: string }>();

    if (dayError || !createdDay) {
      continue;
    }

    await supabase.from("workout_program_exercises").insert(
      day.exercises.map((exercise, index) => ({
        workout_program_day_id: createdDay.id,
        exercise_name: exercise.exercise_name,
        sets: exercise.sets,
        reps: exercise.reps,
        target_weight: exercise.target_weight,
        notes: exercise.notes,
        sort_order: index + 1,
      })),
    );
  }

  revalidatePath("/dashboard/programs");
  redirect("/dashboard/programs?status=created");
}

export async function updateWorkoutProgram(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/programs?status=forbidden");
    return;
  }

  const programId = String(formData.get("programId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const descriptionInput = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const durationWeeksInput = String(formData.get("durationWeeks") ?? "4").trim();

  if (!programId || !clientId || !title || !startDate) {
    redirect("/dashboard/programs?status=missing-fields");
    return;
  }

  const durationWeeks = Number.parseInt(durationWeeksInput, 10);
  if (Number.isNaN(durationWeeks) || durationWeeks <= 0 || durationWeeks > 52) {
    redirect("/dashboard/programs?status=invalid-duration");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workout_programs")
    .update({
      client_id: clientId,
      title,
      description: descriptionInput.length > 0 ? descriptionInput : null,
      start_date: startDate,
      duration_weeks: durationWeeks,
    })
    .eq("id", programId)
    .eq("trainer_id", currentUser.user.id);

  if (error) {
    redirect(buildErrorRedirect("/dashboard/programs", "update-failed", error.code, error.message));
    return;
  }

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/workouts");
  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/client-logs");
  redirect("/dashboard/programs?status=updated");
}

export async function deleteWorkoutProgram(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/programs?status=forbidden");
    return;
  }

  const programId = String(formData.get("programId") ?? "").trim();
  if (!programId) {
    redirect("/dashboard/programs?status=delete-failed");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workout_programs")
    .delete()
    .eq("id", programId)
    .eq("trainer_id", currentUser.user.id);

  if (error) {
    redirect(buildErrorRedirect("/dashboard/programs", "delete-failed", error.code, error.message));
    return;
  }

  revalidatePath("/dashboard/programs");
  revalidatePath("/dashboard/workouts");
  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/client-logs");
  redirect("/dashboard/programs?status=deleted");
}