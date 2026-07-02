export type UserRole = "trainer" | "client";

export interface AppUser {
  id: string;
  role: UserRole;
  email: string;
  displayName: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  trainerId: string;
  firstName: string;
  lastName: string;
  notes: string | null;
  createdAt: string;
}

export interface WorkoutProgram {
  id: string;
  trainerId: string;
  clientId: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface ExerciseLog {
  id: string;
  clientId: string;
  workoutProgramId: string | null;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  performedOn: string;
}