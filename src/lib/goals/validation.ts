export type GoalInput = {
  name: string;
  description: string | null;
  daily_target_minutes: number | null;
  weekly_target_minutes: number | null;
};

export type GoalFieldErrors = Partial<Record<"name" | "description" | "dailyTarget" | "weeklyTarget", string>>;

function parseTarget(formData: FormData, prefix: "daily" | "weekly", maximum: number) {
  const hoursValue = String(formData.get(`${prefix}Hours`) ?? "").trim();
  const minutesValue = String(formData.get(`${prefix}Minutes`) ?? "").trim();
  if (!hoursValue && !minutesValue) return { value: null };

  const hours = hoursValue ? Number(hoursValue) : 0;
  const minutes = minutesValue ? Number(minutesValue) : 0;
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59) {
    return { error: "Use whole hours and 0–59 minutes." };
  }
  const total = hours * 60 + minutes;
  if (total < 1 || total > maximum) return { error: `Choose between 1 minute and ${maximum / 60} hours.` };
  return { value: total };
}

export function validateGoalForm(formData: FormData): { data?: GoalInput; errors?: GoalFieldErrors } {
  const name = String(formData.get("name") ?? "").trim();
  const rawDescription = String(formData.get("description") ?? "").trim();
  const errors: GoalFieldErrors = {};
  if (!name) errors.name = "Give this goal a name.";
  else if (name.length > 100) errors.name = "Keep the name to 100 characters or fewer.";
  if (rawDescription.length > 1000) errors.description = "Keep the description to 1,000 characters or fewer.";

  const daily = parseTarget(formData, "daily", 1440);
  const weekly = parseTarget(formData, "weekly", 10080);
  if (daily.error) errors.dailyTarget = daily.error;
  if (weekly.error) errors.weeklyTarget = weekly.error;
  if (Object.keys(errors).length) return { errors };

  return { data: { name, description: rawDescription || null, daily_target_minutes: daily.value ?? null, weekly_target_minutes: weekly.value ?? null } };
}

export function splitMinutes(total: number | null) {
  return total === null ? { hours: "", minutes: "" } : { hours: String(Math.floor(total / 60)), minutes: String(total % 60) };
}

export function formatMinutes(total: number | null) {
  if (total === null) return "Not set";
  if (total === 0) return "0m";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean).join(" ");
}
