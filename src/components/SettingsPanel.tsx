import { useEffect, useState } from "react";
import type { ConfirmSettings } from "../types";
import { formatTime } from "../week";

interface Props {
  settings: ConfirmSettings;
  onSave: (next: { minMinutes: number; maxMinutes: number }) => void;
}

export default function SettingsPanel({ settings, onSave }: Props) {
  const [min, setMin] = useState(String(settings.minMinutes));
  const [max, setMax] = useState(String(settings.maxMinutes));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMin(String(settings.minMinutes));
    setMax(String(settings.maxMinutes));
  }, [settings.minMinutes, settings.maxMinutes]);

  function submit() {
    setMsg("");
    setError("");
    const lo = Number(min);
    const hi = Number(max);
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi > 720 || lo >= hi) {
      setError("请输入合理区间：1 ≤ 下限 < 上限 ≤ 720 分钟");
      return;
    }
    onSave({ minMinutes: lo, maxMinutes: hi });
    setMsg("已更新确认条件，仅影响之后保存的记录。");
  }

  return (
    <div>
      <h2>确认条件</h2>
      <p className="settings-note">
        每日遮盖分钟超出下述区间时，记录先留待医生确认，确认后才计入本周完成率。
      </p>
      <div className="settings-form">
        <label>
          <span>下限（分钟）</span>
          <input type="number" min={1} value={min} onChange={(e) => setMin(e.target.value)} />
        </label>
        <label>
          <span>上限（分钟）</span>
          <input type="number" max={720} value={max} onChange={(e) => setMax(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        {msg && <p className="ok-text">{msg}</p>}
        <button type="button" className="primary-action" onClick={submit}>
          保存确认条件
        </button>
      </div>
      <p className="settings-note">
        当前：{settings.minMinutes}–{settings.maxMinutes} 分钟 · 更新于 {formatTime(settings.updatedAt)}
      </p>
    </div>
  );
}
