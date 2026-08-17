"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateGoalForm, type GoalFieldErrors } from "@/lib/goals/validation";

export type GoalActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: GoalFieldErrors };

async function authenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return { supabase, userId: error || typeof userId !== "string" ? null : userId };
}

function refreshGoals() {
  revalidatePath("/profile");
  revalidatePath("/today");
  revalidatePath("/");
}

export async function saveGoalAction(_state: GoalActionState, formData: FormData): Promise<GoalActionState> {
  const { data, errors } = validateGoalForm(formData);
  if (!data || errors) return { status: "error", message: "Check the highlighted fields.", fieldErrors: errors };
  const { supabase, userId } = await authenticatedContext();
  if (!userId) return { status: "error", message: "Your session expired. Sign in again and retry." };

  const goalId = String(formData.get("goalId") ?? "");
  const query = goalId
    ? supabase.from("study_goals").update(data).eq("id", goalId).eq("user_id", userId)
    : supabase.from("study_goals").insert({ ...data, user_id: userId });
  const { data: saved, error } = await query.select("id").maybeSingle();
  if (error || !saved) {
    console.error("Goal save failed", { code: error?.code });
    return { status: "error", message: "We couldn’t save that goal. Please try again." };
  }
  refreshGoals();
  return { status: "success", message: goalId ? "Goal updated." : "Goal created." };
}

async function setArchived(formData: FormData, isArchived: boolean): Promise<GoalActionState> {
  const goalId = String(formData.get("goalId") ?? "");
  const { supabase, userId } = await authenticatedContext();
  if (!userId) return { status: "error", message: "Your session expired. Sign in again and retry." };
  const { data, error } = await supabase.from("study_goals").update({ is_archived: isArchived }).eq("id", goalId).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) return { status: "error", message: "That goal could not be changed." };
  refreshGoals();
  return { status: "success", message: isArchived ? "Goal archived." : "Goal restored." };
}

export async function archiveGoalAction(_state: GoalActionState, formData: FormData) { return setArchived(formData, true); }
export async function restoreGoalAction(_state: GoalActionState, formData: FormData) { return setArchived(formData, false); }

export async function deleteGoalAction(_state: GoalActionState, formData: FormData): Promise<GoalActionState> {
  const goalId = String(formData.get("goalId") ?? "");
  const { supabase, userId } = await authenticatedContext();
  if (!userId) return { status: "error", message: "Your session expired. Sign in again and retry." };

  const { data, error } = await supabase.rpc("delete_unused_study_goal", { p_goal_id: goalId });
  if (error || !data) return { status: "error", message: "That goal could not be deleted." };
  refreshGoals();
  return { status: "success", message: "Goal permanently deleted." };
}
