export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

/** 返回 base 所在自然周（周一至周日）的 7 个日期字符串 */
export function weekDates(base: Date = new Date()): string[] {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const dow = (d.getDay() + 6) % 7; // 周一为 0
  d.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return formatDate(x);
  });
}

export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function weekRangeLabel(dates: string[]): string {
  const fmt = (s: string) => `${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
  return `${fmt(dates[0])}–${fmt(dates[6])}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hh}:${mm}`;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
