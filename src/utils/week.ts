/** 周计算工具：以周一为一周起点 */

export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 本周一日期字符串 */
export function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 周一=0
  d.setDate(d.getDate() - dow);
  return toDateStr(d);
}

/** 本周日日期字符串 */
export function weekEnd(dateStr: string): string {
  const d = new Date(weekStart(dateStr) + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
}

/** 日期是否落在 dateStr 所在的自然周 */
export function isSameWeek(day: string, dateStr: string): boolean {
  return weekStart(day) === weekStart(dateStr);
}

/** 相对今天偏移 days 天的日期字符串（用于生成演示数据） */
export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateStr(d);
}

/** 本周一相对今天的天数偏移（0=今天就是周一） */
export function daysSinceWeekStart(): number {
  return (new Date().getDay() + 6) % 7;
}
