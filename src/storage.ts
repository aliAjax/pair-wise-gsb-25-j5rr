import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * 本地留档：患儿资料、遮盖记录、治疗方案、调整记录、确认条件
 * 分别存放在独立的 localStorage 键下，各自维护、互不影响。
 */
export const STORAGE_KEYS = {
  patients: "hxwl11.occlusion.patients",
  entries: "hxwl11.occlusion.entries",
  plans: "hxwl11.occlusion.plans",
  planChanges: "hxwl11.occlusion.planChanges",
  settings: "hxwl11.occlusion.settings",
} as const;

export function usePersistentState<T>(
  key: string,
  initial: () => T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      // 本地数据损坏时回退到初始值
    }
    return initial();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 存储不可用时静默失败，页面内状态仍可用
    }
  }, [key, value]);

  return [value, setValue];
}
