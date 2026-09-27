import type { Patient } from "../types";

/**
 * 患儿基础资料（独立维护）
 * 方案变化产生的历史记录存放在本地留档中，这里只提供初始资料。
 */
export const initialPatients: Patient[] = [
  {
    id: "P-032",
    name: "陈小宝",
    age: 5,
    diagnosis: "屈光参差性弱视（左眼）",
    plan: { patchEye: "OD", dailyMinutes: 240, weeklySessions: 7 },
    planHistory: [],
  },
  {
    id: "P-081",
    name: "林朵朵",
    age: 6,
    diagnosis: "斜视性弱视（右眼）",
    plan: { patchEye: "OS", dailyMinutes: 180, weeklySessions: 6 },
    planHistory: [],
  },
];
