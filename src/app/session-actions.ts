"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type SessionActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  session?: Tables<"study_sessions">;
};

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return { supabase, authenticated: !error && typeof userId === "string" };
}

function refreshSessionPages() {
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/activity");
}

export async function startSessionAction(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const goalId = String(formData.get("goalId") ?? "");
  const sessionType = String(formData.get("sessionType") ?? "");
  const pomodoroMinutes = sessionType === "pomodoro" ? Number(formData.get("pomodoroMinutes")) : null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(goalId) || !["normal", "pomodoro"].includes(sessionType)) {
    return { status: "error", message: "Choose an active goal and session type." };
  }
  const { supabase, authenticated } = await authenticatedClient();
  if (!authenticated) return { status: "error", message: "Your session expired. Sign in again and retry." };

  if (sessionType === "pomodoro" && ![25, 50].includes(pomodoroMinutes ?? 0)) return { status: "error", message: "Choose a 25 or 50 minute focus session." };
  const { data, error } = await supabase.rpc("start_study_session", { p_goal_id: goalId, p_session_type: sessionType as "normal" | "pomodoro", p_pomodoro_minutes: pomodoroMinutes as number });
  if (error || !data) {
    console.error("Session start failed", { code: error?.code });
    refreshSessionPages();
    const conflict = error?.message.toLowerCase().includes("active study session");
    return { status: "error", message: conflict ? "A study session is already active. Refresh to resume it." : "The session could not start. Check your connection and try again." };
  }
  refreshSessionPages();
  return { status: "success", message: "Session started.", session: data };
}

async function changePauseState(formData: FormData, resume: boolean): Promise<SessionActionState> {
  const sessionId=String(formData.get("sessionId")??""); const {supabase,authenticated}=await authenticatedClient();
  if(!authenticated||!/^[0-9a-f-]{36}$/i.test(sessionId)) return {status:"error",message:"This session could not be changed."};
  const {data,error}=await supabase.rpc(resume?"resume_study_session":"pause_study_session",{p_session_id:sessionId});
  if(error||!data){refreshSessionPages();return {status:"error",message:"The session changed elsewhere. Refresh to recover its current state."};}
  refreshSessionPages(); return {status:"success",message:resume?"Session resumed.":"Session paused.",session:data};
}
export async function pauseSessionAction(_state:SessionActionState,formData:FormData){return changePauseState(formData,false);}
export async function resumeSessionAction(_state:SessionActionState,formData:FormData){return changePauseState(formData,true);}

export async function finishSessionAction(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { status: "error", message: "This session could not be identified." };
  const { supabase, authenticated } = await authenticatedClient();
  if (!authenticated) return { status: "error", message: "Your session expired. Sign in again and retry." };
  const { data, error } = await supabase.rpc("finish_study_session", { p_session_id: sessionId });
  if (error || !data) {
    console.error("Session finish failed", { code: error?.code });
    refreshSessionPages();
    return { status: "error", message: "The session could not be finished. Your active session is still safe; check your connection and retry." };
  }
  // Keep the current active-session shell mounted long enough to collect the
  // optional reflection. The completed row is already durable at this point.
  revalidatePath("/history");
  return { status: "success", message: "Session safely completed.", session: data };
}

export async function saveReflectionAction(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const rawRating = String(formData.get("rating") ?? "");
  const rating = rawRating ? Number(rawRating) : null;
  const shareNotes = formData.get("shareNotes") === "on";
  const circleValue = formData.get("activityCircleId");
  const circleId = typeof circleValue === "string" && circleValue ? circleValue : null;
  const reflectionPhotoPath = String(formData.get("reflectionPhotoPath") ?? "") || null;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || notes.length > 5000 || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) || (reflectionPhotoPath && !reflectionPhotoPath.includes(`/${sessionId}/reflection-`))) {
    return { status: "error", message: "Check your notes and rating, then try again." };
  }
  const { supabase, authenticated } = await authenticatedClient();
  if (!authenticated) return { status: "error", message: "Your session expired. Sign in again and retry." };
  if (circleId && !/^[0-9a-f-]{36}$/i.test(circleId)) return { status: "error", message: "Choose a valid Circle." };
  const reflectionArgs = circleValue !== null
    ? { p_notes: notes, p_rating: rating as number, p_session_id: sessionId, p_reflection_photo_path: reflectionPhotoPath, ...(circleId ? { p_activity_circle_id: circleId } : {}) }
    : { p_notes: notes, p_rating: rating as number, p_session_id: sessionId, p_share_notes: shareNotes, p_reflection_photo_path: reflectionPhotoPath };
  const { data, error } = await supabase.rpc("update_study_session_reflection", reflectionArgs);
  if (error || !data) return { status: "error", message: "Your session is saved, but the reflection could not be updated. Try again." };
  refreshSessionPages();
  return { status: "success", message: "Reflection saved.", session: data };
}

export async function createManualSessionAction(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const localDate=String(formData.get("date")??"");
  const localTime=String(formData.get("startTime")??"");
  const durationMinutes=Number(formData.get("durationMinutes"));
  const goalValue=String(formData.get("goalId")??"");
  const circleValue=String(formData.get("activityCircleId")??"");
  const ratingValue=String(formData.get("rating")??"");
  const notes=String(formData.get("notes")??"").trim();
  const datePattern=/^\d{4}-\d{2}-\d{2}$/; const timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/; const uuid=/^[0-9a-f-]{36}$/i;
  const rating=ratingValue?Number(ratingValue):null;
  if(!datePattern.test(localDate)||!timePattern.test(localTime)||!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>1440||notes.length>5000||(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))||!uuid.test(goalValue)||(circleValue&&!uuid.test(circleValue))){
    return {status:"error",message:"Check the date, start time, duration, and optional details."};
  }
  const {supabase,authenticated}=await authenticatedClient();
  if(!authenticated)return {status:"error",message:"Your session expired. Sign in again and retry."};
  const {data,error}=await supabase.rpc("create_manual_study_session",{
    p_local_date:localDate,p_local_time:localTime,p_duration_minutes:durationMinutes,
    p_goal_id:goalValue,...(circleValue?{p_activity_circle_id:circleValue}:{}),
    ...(rating!==null?{p_rating:rating}:{}),...(notes?{p_notes:notes}:{}),
  });
  if(error||!data){
    console.error("Manual session creation failed",{code:error?.code});
    const message=error?.code==="42501"?"That goal or Circle is no longer available to your account.":error?.message.includes("future")?"Past sessions must start and finish before now.":"The past session could not be saved. Check its details and try again.";
    return {status:"error",message};
  }
  refreshSessionPages(); revalidatePath("/leaderboard");
  return {status:"success",message:"Past session added.",session:data};
}

export async function deleteCompletedSessionAction(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const { supabase, authenticated } = await authenticatedClient();
  if (!authenticated || !/^[0-9a-f-]{36}$/i.test(sessionId)) return { status: "error", message: "This session could not be deleted." };
  const existing = await supabase.from("study_sessions").select("reflection_photo_path").eq("id",sessionId).maybeSingle();
  const { data, error } = await supabase.rpc("delete_completed_study_session", { p_session_id: sessionId });
  if (error || !data) return { status: "error", message: "Nothing was deleted. Refresh and try again." };
  if (existing.data?.reflection_photo_path) await supabase.storage.from("reflection-photos").remove([existing.data.reflection_photo_path]);
  refreshSessionPages();
  return { status: "success", message: "Session deleted and totals recalculated." };
}
