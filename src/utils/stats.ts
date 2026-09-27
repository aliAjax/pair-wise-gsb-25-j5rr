import type { Patient, TrainingEntry } from "../types";
import { countsTowardCompletion } from "../config/confirmationRules";
import { isSameWeek } from "./week";

export interface WeekStats {
  /** 本周目标分钟（每日目标 × 7） */
  targetMinutes: number;
  /** 计入完成率的分钟 */
  countedMinutes: number;
  /** 计入完成率的天数 */
  countedDays: number;
  /** 已登记天数（方案遮盖眼） */
  recordedDays: number;
  /** 待确认条数 */
  pendingCount: number;
  /** 本周最新一次自报训练次数 */
  latestSessions: number;
  /** 本周矫正视力（方案遮盖眼），按日期升序 */
  acuitySeries: { date: string; acuity: number }[];
  /** 完成率 0~1（未封顶原始值） */
  completionRate: number;
}

/** 按自然周（周一为起点）汇总某患儿的遮盖进度 */
export function weekStats(patient: Patient, entries: TrainingEntry[], anchorDate: string): WeekStats {
  const planEye = patient.plan.patchEye;
  const weekEntries = entries
    .filter((e) => e.patientId === patient.id && e.eye === planEye && isSameWeek(e.date, anchorDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  const counted = weekEntries.filter((e) => countsTowardCompletion(e.status));
  const countedMinutes = counted.reduce((sum, e) => sum + e.patchMinutes, 0);
  const targetMinutes = patient.plan.dailyMinutes * 7;
  const latestSessions = weekEntries.length ? weekEntries[weekEntries.length - 1].weeklySessions : 0;

  return {
    targetMinutes,
    countedMinutes,
    countedDays: new Set(counted.map((e) => e.date)).size,
    recordedDays: new Set(weekEntries.map((e) => e.date)).size,
    pendingCount: weekEntries.filter((e) => e.status === "pending").length,
    latestSessions,
    acuitySeries: weekEntries.map((e) => ({ date: e.date, acuity: e.correctedAcuity })),
    completionRate: targetMinutes > 0 ? countedMinutes / targetMinutes : 0,
  };
}
