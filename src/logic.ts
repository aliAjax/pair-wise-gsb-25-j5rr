import type { ConfirmSettings, EntryStatus, OcclusionEntry, TherapyPlan } from "./types";

/** 按确认条件判定记录状态：超出区间 → 待医生确认 */
export function evaluateMinutes(
  minutes: number,
  s: ConfirmSettings
): { status: EntryStatus; reason: string } {
  if (minutes < s.minMinutes) {
    return { status: "pending", reason: `遮盖 ${minutes} 分钟，低于 ${s.minMinutes} 分钟下限` };
  }
  if (minutes > s.maxMinutes) {
    return { status: "pending", reason: `遮盖 ${minutes} 分钟，超过 ${s.maxMinutes} 分钟上限` };
  }
  return { status: "valid", reason: "" };
}

/** 只有正常记录与医生确认过的记录才计入本周完成率 */
export function isCountable(e: OcclusionEntry): boolean {
  return e.status === "valid" || e.status === "confirmed";
}

export interface WeekSummary {
  countableDays: number;
  countableMinutes: number;
  pendingCount: number;
  rate: number; // 0–100
  targetMinutes: number;
  byDate: Record<string, EntryStatus | "none">;
}

export function summarizeWeek(
  entries: OcclusionEntry[],
  plan: TherapyPlan,
  dates: string[]
): WeekSummary {
  const inWeek = entries.filter(
    (e) => e.patientId === plan.patientId && e.eye === plan.eye && dates.includes(e.date)
  );
  const countable = inWeek.filter(isCountable);
  const countableDays = new Set(countable.map((e) => e.date)).size;
  const countableMinutes = countable.reduce((sum, e) => sum + e.patchMinutes, 0);
  const pendingCount = inWeek.filter((e) => e.status === "pending").length;
  const rate =
    plan.daysPerWeek > 0 ? Math.min(100, Math.round((countableDays / plan.daysPerWeek) * 100)) : 0;
  const byDate: Record<string, EntryStatus | "none"> = {};
  for (const d of dates) {
    const hit = inWeek.find((e) => e.date === d);
    byDate[d] = hit ? hit.status : "none";
  }
  return {
    countableDays,
    countableMinutes,
    pendingCount,
    rate,
    targetMinutes: plan.dailyMinutes * plan.daysPerWeek,
    byDate,
  };
}
