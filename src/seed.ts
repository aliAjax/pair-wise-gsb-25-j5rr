import { evaluateMinutes } from "./logic";
import type {
  ConfirmSettings,
  EyeSide,
  OcclusionEntry,
  Patient,
  PlanChange,
  TherapyPlan,
} from "./types";
import { nowIso, weekDates } from "./week";

export interface SeedData {
  patients: Patient[];
  entries: OcclusionEntry[];
  plans: TherapyPlan[];
  planChanges: PlanChange[];
  settings: ConfirmSettings;
}

/** 首次打开时的示例台账（仅当本地无存档时写入） */
export function buildSeed(): SeedData {
  const now = nowIso();
  const week = weekDates();
  const settings: ConfirmSettings = { minMinutes: 30, maxMinutes: 360, updatedAt: now };

  const patients: Patient[] = [
    {
      id: "p-wang-xiaoyu",
      name: "王小雨",
      age: "6岁",
      note: "左眼屈光不正性弱视，遮盖右眼",
      createdAt: now,
    },
    {
      id: "p-li-haoran",
      name: "李昊然",
      age: "8岁",
      note: "右眼斜视性弱视，遮盖左眼",
      createdAt: now,
    },
  ];

  const plans: TherapyPlan[] = [
    { patientId: "p-wang-xiaoyu", eye: "right", dailyMinutes: 120, daysPerWeek: 6, updatedAt: now },
    { patientId: "p-li-haoran", eye: "left", dailyMinutes: 90, daysPerWeek: 5, updatedAt: now },
  ];

  function entry(
    patientId: string,
    dayIndex: number,
    eye: EyeSide,
    correctedVision: string,
    patchMinutes: number,
    trainingCount: number
  ): OcclusionEntry {
    const date = week[dayIndex];
    const { status, reason } = evaluateMinutes(patchMinutes, settings);
    return {
      id: `${patientId}|${date}|${eye}`,
      patientId,
      date,
      eye,
      correctedVision,
      patchMinutes,
      trainingCount,
      status,
      statusReason: reason,
      createdAt: now,
      updatedAt: now,
    };
  }

  const entries: OcclusionEntry[] = [
    entry("p-wang-xiaoyu", 0, "right", "0.6", 120, 3),
    entry("p-wang-xiaoyu", 1, "right", "0.6", 115, 3),
    entry("p-wang-xiaoyu", 2, "right", "0.5", 20, 2), // 不足半小时 → 待确认
    entry("p-wang-xiaoyu", 3, "right", "0.6", 130, 4),
    entry("p-wang-xiaoyu", 4, "right", "0.6", 400, 4), // 超过六小时 → 待确认
    entry("p-wang-xiaoyu", 5, "right", "0.6", 120, 5),
    entry("p-li-haoran", 0, "left", "0.4", 90, 2),
    entry("p-li-haoran", 1, "left", "0.4", 90, 3),
    entry("p-li-haoran", 2, "left", "0.5", 85, 3),
    entry("p-li-haoran", 3, "left", "0.4", 25, 2), // 不足半小时 → 待确认
  ];

  const planChanges: PlanChange[] = [
    {
      id: "seed-change-1",
      patientId: "p-wang-xiaoyu",
      eye: "right",
      oldDailyMinutes: 90,
      oldDaysPerWeek: 5,
      newDailyMinutes: 120,
      newDaysPerWeek: 6,
      reason: "复诊矫正视力由 0.4 提升至 0.6，遵医嘱每日遮盖增至 120 分钟",
      changedAt: new Date(`${week[0]}T09:30:00`).toISOString(),
    },
  ];

  return { patients, entries, plans, planChanges, settings };
}
