import type { EntryStatus } from "../types";

/**
 * 确认条件（独立维护）
 * 遮盖时长低于下限或高于上限的记录先留待医生确认，
 * 只有医生确认（approved）后才计入本周完成率。
 */
export const confirmationRules = {
  /** 每日遮盖下限（分钟），不足视为异常 */
  minDailyMinutes: 30,
  /** 每日遮盖上限（分钟），超过视为异常 */
  maxDailyMinutes: 6 * 60,
} as const;

/** 计算异常原因；时长正常返回 null */
export function pendingReasonFor(minutes: number): string | null {
  if (Number.isNaN(minutes)) {
    return "遮盖时长缺失";
  }
  if (minutes < confirmationRules.minDailyMinutes) {
    return `遮盖不足 ${Math.floor(confirmationRules.minDailyMinutes / 60)} 小时（${minutes} 分钟），需医生确认`;
  }
  if (minutes > confirmationRules.maxDailyMinutes) {
    const hours = confirmationRules.maxDailyMinutes / 60;
    return `遮盖超过 ${hours} 小时（${minutes} 分钟），需医生确认`;
  }
  return null;
}

/** 新保存记录的初始状态 */
export function initialStatus(minutes: number): EntryStatus {
  return pendingReasonFor(minutes) ? "pending" : "normal";
}

/** 确认通过的异常记录计入完成率，驳回的不计入 */
export function countsTowardCompletion(status: EntryStatus): boolean {
  return status === "normal" || status === "approved";
}

export function describeRules(): string {
  return `每日遮盖 < ${confirmationRules.minDailyMinutes} 分钟或 > ${confirmationRules.maxDailyMinutes / 60} 小时，先留待医生确认，确认后计入本周完成率`;
}
