import type { Patient, TrainingEntry, PlanChange } from "../types";
import { initialStatus, pendingReasonFor } from "../config/confirmationRules";
import { initialPatients } from "../data/patients";
import { daysAgo, todayStr } from "../utils/week";

/**
 * 本地留档（单独放置）
 * 台账与方案调整历史只保存在本机 localStorage，
 * 关闭页面再打开仍可查看周进度与调整记录。
 */
const STORE_KEY = "hxwl-11.occlusion-ledger.v1";
const SEED_VERSION = 1;

export interface Archive {
  version: number;
  savedAt: string;
  patients: Patient[];
  entries: TrainingEntry[];
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedPlanChange(): PlanChange {
  return {
    id: uid("chg"),
    changedAt: daysAgo(21),
    reason: "复诊发现矫正视力提升缓慢，遵医嘱由每日 2 小时加倍至 4 小时，全周训练。",
    oldPlan: { patchEye: "OD", dailyMinutes: 120, weeklySessions: 5 },
    newPlan: { patchEye: "OD", dailyMinutes: 240, weeklySessions: 7 },
  };
}

function seedEntries(): TrainingEntry[] {
  const mk = (
    partial: Omit<TrainingEntry, "id" | "patientId" | "status" | "pendingReason"> & {
      patientId: string;
      overrideStatus?: TrainingEntry["status"];
      reviewNote?: string;
    }
  ): TrainingEntry => {
    const { overrideStatus, reviewNote, ...rest } = partial;
    const status = overrideStatus ?? initialStatusForSeed(rest.patientId, rest);
    const reason = pendingReasonFor(rest.patchMinutes);
    return {
      id: uid("ent"),
      status,
      ...(status === "pending" && reason ? { pendingReason: reason } : {}),
      ...(reviewNote ? { reviewedAt: daysAgo(1), reviewNote } : {}),
      ...rest,
    };
  };

  return [
    // P-032 本周：正常、不足半小时、超过六小时各有一条
    mk({ patientId: "P-032", date: daysAgo(5), eye: "OD", correctedAcuity: 0.4, patchMinutes: 240, weeklySessions: 2 }),
    mk({ patientId: "P-032", date: daysAgo(4), eye: "OD", correctedAcuity: 0.4, patchMinutes: 240, weeklySessions: 3 }),
    mk({ patientId: "P-032", date: daysAgo(3), eye: "OD", correctedAcuity: 0.4, patchMinutes: 380, weeklySessions: 4,
         overrideStatus: "pending", }),
    mk({ patientId: "P-032", date: daysAgo(2), eye: "OD", correctedAcuity: 0.5, patchMinutes: 20, weeklySessions: 5 }),
    mk({ patientId: "P-032", date: daysAgo(1), eye: "OD", correctedAcuity: 0.5, patchMinutes: 245, weeklySessions: 6 }),
    mk({ patientId: "P-032", date: daysAgo(1), eye: "OS", correctedAcuity: 1.0, patchMinutes: 0, weeklySessions: 6 }),
    // P-032 上周：一条超时后经医生确认计入
    mk({ patientId: "P-032", date: daysAgo(9), eye: "OD", correctedAcuity: 0.3, patchMinutes: 370, weeklySessions: 2,
         overrideStatus: "approved", reviewNote: "电话核实当日外出遮盖偏长，情况属实，予以确认。" }),
    mk({ patientId: "P-032", date: daysAgo(8), eye: "OD", correctedAcuity: 0.3, patchMinutes: 240, weeklySessions: 6 }),
    mk({ patientId: "P-032", date: daysAgo(7), eye: "OD", correctedAcuity: 0.4, patchMinutes: 240, weeklySessions: 7 }),

    // P-081 本周：含一条医生驳回（漏盖不计入）
    mk({ patientId: "P-081", date: daysAgo(4), eye: "OS", correctedAcuity: 0.5, patchMinutes: 180, weeklySessions: 3 }),
    mk({ patientId: "P-081", date: daysAgo(3), eye: "OS", correctedAcuity: 0.5, patchMinutes: 25, weeklySessions: 4,
         overrideStatus: "rejected", reviewNote: "家长承认当日漏盖，不计入完成率。" }),
    mk({ patientId: "P-081", date: daysAgo(2), eye: "OS", correctedAcuity: 0.6, patchMinutes: 175, weeklySessions: 4 }),
    mk({ patientId: "P-081", date: daysAgo(1), eye: "OS", correctedAcuity: 0.6, patchMinutes: 185, weeklySessions: 5 }),
    mk({ patientId: "P-081", date: daysAgo(1), eye: "OD", correctedAcuity: 1.0, patchMinutes: 0, weeklySessions: 5 }),
  ];
}

function initialStatusForSeed(patientId: string, e: { patchMinutes: number; eye: "OS" | "OD" }) {
  const patient = initialPatients.find((p) => p.id === patientId);
  if (!patient || patient.plan.patchEye !== e.eye) return "normal" as const;
  return initialStatus(e.patchMinutes);
}

function seedArchive(): Archive {
  const patients: Patient[] = initialPatients.map((p) =>
    p.id === "P-032" ? { ...p, planHistory: [seedPlanChange()] } : p
  );
  return {
    version: SEED_VERSION,
    savedAt: todayStr(),
    patients,
    entries: seedEntries(),
  };
}

export function loadArchive(): Archive {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Archive;
      if (parsed.version === SEED_VERSION && Array.isArray(parsed.entries)) {
        return parsed;
      }
    }
  } catch {
    // 留档损坏时回退到演示数据
  }
  const seeded = seedArchive();
  saveArchive(seeded);
  return seeded;
}

export function saveArchive(archive: Archive): void {
  const next = { ...archive, savedAt: todayStr() };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

export function clearArchive(): Archive {
  localStorage.removeItem(STORE_KEY);
  return loadArchive();
}

export function exportArchive(): string {
  return JSON.stringify(loadArchive(), null, 2);
}
