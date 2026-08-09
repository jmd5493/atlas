"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { parseIncomingDays } from "@/lib/programs/day-parsing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function buildErrorRedirect(basePath: string, status: string, code?: string, message?: string) {
  const errorCode = encodeURIComponent(code ?? "unknown");
  const errorMessage = encodeURIComponent(message ?? "Unknown error");
  return `${basePath}?status=${status}&errorCode=${errorCode}&errorMessage=${errorMessage}`;
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

  const daysJsonInput = String(formData.get("daysJson") ?? "[]");
  const days = parseIncomingDays(daysJsonInput);

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
        day_number: day.day_number,
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

export async function updateWorkoutProgramDays(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/programs?status=forbidden");
    return;
  }

  const programId = String(formData.get("programId") ?? "").trim();
  if (!programId) {
    redirect("/dashboard/programs?status=days-update-failed");
    return;
  }

  const daysJsonInput = String(formData.get("daysJson") ?? "[]");
  const days = parseIncomingDays(daysJsonInput);

  if (days.length === 0) {
    redirect("/dashboard/programs?status=missing-exercises");
    return;
  }

  const supabase = await createSupabaseServerClient();

  // Confirm this program belongs to the requesting trainer before touching
  // its days. RLS would block a cross-trainer delete/insert anyway, but
  // checking here lets us return a clear status instead of a silent no-op.
  const { data: program, error: programLookupError } = await supabase
    .from("workout_programs")
    .select("id")
    .eq("id", programId)
    .eq("trainer_id", currentUser.user.id)
    .maybeSingle<{ id: string }>();

  if (programLookupError || !program) {
    redirect(
      buildErrorRedirect(
        "/dashboard/programs",
        "days-update-failed",
        programLookupError?.code,
        programLookupError?.message ?? "Program not found for this trainer.",
      ),
    );
    return;
  }

  // Full replace: delete the program's existing days (cascades to their
  // exercises via FK) and reinsert from the submitted state, same pattern as
  // createWorkoutProgram. Safe because exercise_logs.workout_program_id
  // references the program itself (ON DELETE SET NULL) and stores
  // exercise_name as a plain string — it has no FK to day/exercise rows, so
  // this replace cannot orphan or corrupt a client's already-logged history.
  const { error: deleteError } = await supabase
    .from("workout_program_days")
    .delete()
    .eq("workout_program_id", programId);

  if (deleteError) {
    redirect(
      buildErrorRedirect("/dashboard/programs", "days-update-failed", deleteError.code, deleteError.message),
    );
    return;
  }

  for (const day of days) {
    const { data: createdDay, error: dayError } = await supabase
      .from("workout_program_days")
      .insert({
        workout_program_id: programId,
        day_number: day.day_number,
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
  revalidatePath("/dashboard/workouts");
  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/client-logs");
  redirect("/dashboard/programs?status=days-updated");
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