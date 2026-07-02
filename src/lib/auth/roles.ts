import type { User } from "@supabase/supabase-js";

import type { UserRole } from "@/types/domain";

export function getUserRole(user: User): UserRole | null {
  const role = user.user_metadata.role;

  if (role === "trainer" || role === "client") {
    return role;
  }

  return null;
}