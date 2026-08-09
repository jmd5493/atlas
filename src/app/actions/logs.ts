"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LinkedClientRow = {
  id: string;
  trainer_id: string;
};

function resolveRedirectPath(formData: FormData) {
  const redirectInput = String(formData.get("redirectTo") ?? "").trim();
  if (redirectInput === "/dashboard/workouts") {
    return "/dashboard/workouts";
  }

  return "/dashboard/logs";
}

function redirectWithStatus(path: string, status: string, code?: string, message?: string) {
  if (!code && !message) {
    redirect(`${path}?status=${status}`);
    return;
  }

  const errorCode = encodeURIComponent(code ?? "unknown");
  const errorMessage = encodeURIComponent(message ?? "Unknown error");
  redirect(`${path}?status=${status}&errorCode=${errorCode}&errorMessage=${errorMessage}`);
}

export async function createExerciseLog(formData: FormData) {
  const currentUser = await getCurrentUser();
  const redirectPath = resolveRedirectPath(formData);

  // Trainers may also submit logs, but only ever against their own
  // self-tracking client record — the linkedClient lookup below (scoped to
  // auth_user_id = the caller's own id) is what actually enforces that, the
  // same as it does for a client account.
  if (!currentUser || (currentUser.role !== "client" && currentUser.role !== "trainer")) {
    redirectWithStatus(redirectPath, "forbidden");
    return;
  }

  const exerciseName = String(formData.get("exerciseName") ?? "").trim();
  const setsInput = String(formData.get("sets") ?? "").trim();
  const repsInput = String(formData.get("reps") ?? "").trim();
  const weightInput = String(formData.get("weight") ?? "").trim();
  const notesInput = String(formData.get("notes") ?? "").trim();
  const performedOn = String(formData.get("performedOn") ?? "").trim();
  const workoutProgramIdInput = String(formData.get("workoutProgramId") ?? "").trim();

  if (!exerciseName || !setsInput || !repsInput || !performedOn) {
    redirectWithStatus(redirectPath, "missing-fields");
    return;
  }

  const sets = Number.parseInt(setsInput, 10);
  const reps = Number.parseInt(repsInput, 10);
  const weight = Number.parseFloat(weightInput);

  if (
    Number.isNaN(sets) ||
    Number.isNaN(reps) ||
    sets <= 0 ||
    reps <= 0
  ) {
    redirectWithStatus(redirectPath, "invalid-numbers");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: linkedClient } = await supabase
    .from("clients")
    .select("id, trainer_id")
    .eq("auth_user_id", currentUser.user.id)
    .maybeSingle<LinkedClientRow>();

  if (!linkedClient) {
    redirectWithStatus(redirectPath, "not-linked");
    return;
  }

  const workoutProgramId = workoutProgramIdInput.length > 0 ? workoutProgramIdInput : null;

  const { error } = await supabase.from("exercise_logs").insert({
    trainer_id: linkedClient.trainer_id,
    client_id: linkedClient.id,
    workout_program_id: workoutProgramId,
    exercise_name: exerciseName,
    sets,
    reps,
    weight: Number.isNaN(weight) ? null : weight,
    notes: notesInput.length > 0 ? notesInput : null,
    performed_on: performedOn,
  });

  if (error) {
    redirectWithStatus(redirectPath, "create-failed", error.code, error.message ?? "Unknown insert error");
    return;
  }

  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/workouts");
  revalidatePath("/dashboard/client-logs");
  redirectWithStatus(redirectPath, "created");
}