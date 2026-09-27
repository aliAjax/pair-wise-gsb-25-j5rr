export type EyeSide = "left" | "right";

/** valid=正常计入；pending=待医生确认；confirmed=确认后计入；rejected=驳回不计入 */
export type EntryStatus = "valid" | "pending" | "confirmed" | "rejected";

export interface Patient {
  id: string;
  name: string;
  age: string;
  note: string;
  createdAt: string;
}

/** 遮盖记录：同一天同一眼仅一条，id = 患儿|日期|眼别 */
export interface OcclusionEntry {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  eye: EyeSide;
  correctedVision: string;
  patchMinutes: number;
  trainingCount: number; // 本周训练次数
  status: EntryStatus;
  statusReason: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

/** 当前治疗方案（每患儿每眼一条） */
export interface TherapyPlan {
  patientId: string;
  eye: EyeSide;
  dailyMinutes: number;
  daysPerWeek: number;
  updatedAt: string;
}

/** 方案调整留痕：保留旧值与原因 */
export interface PlanChange {
  id: string;
  patientId: string;
  eye: EyeSide;
  oldDailyMinutes: number;
  oldDaysPerWeek: number;
  newDailyMinutes: number;
  newDaysPerWeek: number;
  reason: string;
  changedAt: string;
}

/** 确认条件：遮盖分钟超出 [minMinutes, maxMinutes] 需医生确认 */
export interface ConfirmSettings {
  minMinutes: number;
  maxMinutes: number;
  updatedAt: string;
}

export const EYE_LABELS: Record<EyeSide, string> = {
  left: "左眼",
  right: "右眼",
};

export const STATUS_LABELS: Record<EntryStatus, string> = {
  valid: "已计入",
  pending: "待确认",
  confirmed: "已确认",
  rejected: "已驳回",
};
