"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LinkedClientRow = {
  id: string;
  trainer_id: string;
};

export async function createExerciseLog(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "client") {
    redirect("/dashboard/logs?status=forbidden");
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
    redirect("/dashboard/logs?status=missing-fields");
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
    redirect("/dashboard/logs?status=invalid-numbers");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: linkedClient } = await supabase
    .from("clients")
    .select("id, trainer_id")
    .eq("auth_user_id", currentUser.user.id)
    .maybeSingle<LinkedClientRow>();

  if (!linkedClient) {
    redirect("/dashboard/logs?status=not-linked");
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
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    const errorMessage = encodeURIComponent(error.message ?? "Unknown insert error");
    redirect(`/dashboard/logs?status=create-failed&errorCode=${errorCode}&errorMessage=${errorMessage}`);
    return;
  }

  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/client-logs");
  redirect("/dashboard/logs?status=created");
}