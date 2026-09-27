/** 眼别 */
export type Eye = "OS" | "OD";

/** 训练记录状态：正常 / 待医生确认 / 医生已确认 / 医生已驳回 */
export type EntryStatus = "normal" | "pending" | "approved" | "rejected";

/** 当前遮盖方案 */
export interface Plan {
  /** 遮盖眼（健眼） */
  patchEye: Eye;
  /** 每日目标遮盖分钟 */
  dailyMinutes: number;
  /** 本周目标训练次数 */
  weeklySessions: number;
}

/** 方案调整记录：写明原因并保留旧值 */
export interface PlanChange {
  id: string;
  changedAt: string; // YYYY-MM-DD
  reason: string;
  oldPlan: Plan;
  newPlan: Plan;
}

/** 患儿资料 */
export interface Patient {
  id: string;
  name: string;
  age: number;
  /** 诊断，如 屈光参差性弱视 */
  diagnosis: string;
  plan: Plan;
  planHistory: PlanChange[];
}

/** 遮盖训练台账记录：同一天同一眼只保存一条 */
export interface TrainingEntry {
  id: string;
  patientId: string;
  /** 记录日期 YYYY-MM-DD */
  date: string;
  eye: Eye;
  /** 矫正视力（小数记录法，如 0.6） */
  correctedAcuity: number;
  /** 当日遮盖分钟 */
  patchMinutes: number;
  /** 本周训练次数 */
  weeklySessions: number;
  status: EntryStatus;
  /** 待确认原因（由确认条件模块生成） */
  pendingReason?: string;
  /** 医生确认时间 */
  reviewedAt?: string;
  /** 医生确认意见 */
  reviewNote?: string;
}

export const EYE_LABEL: Record<Eye, string> = {
  OS: "左眼",
  OD: "右眼",
};

/** 台账唯一键：同一天同一眼保存一次 */
export function entryKey(patientId: string, date: string, eye: Eye): string {
  return `${patientId}|${date}|${eye}`;
}
