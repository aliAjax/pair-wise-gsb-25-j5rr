import { useState } from "react";
import type { EyeSide, Patient, PlanChange, TherapyPlan } from "../types";
import { EYE_LABELS } from "../types";
import { formatTime } from "../week";

interface Props {
  patient: Patient | undefined;
  plans: TherapyPlan[];
  changes: PlanChange[];
  onChange: (input: {
    patientId: string;
    eye: EyeSide;
    dailyMinutes: number;
    daysPerWeek: number;
    reason: string;
  }) => void;
}

const EYES: EyeSide[] = ["left", "right"];

function PlanEditor({
  current,
  onSubmit,
}: {
  current: TherapyPlan | undefined;
  onSubmit: (daily: number, days: number, reason: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [daily, setDaily] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function open() {
    setDaily(current ? String(current.dailyMinutes) : "");
    setDays(current ? String(current.daysPerWeek) : "");
    setReason("");
    setError("");
    setEditing(true);
  }

  function submit() {
    const d = Number(daily);
    const w = Number(days);
    if (!Number.isInteger(d) || d < 1 || d > 720) {
      setError("每日遮盖分钟需为 1–720 的整数");
      return;
    }
    if (!Number.isInteger(w) || w < 1 || w > 7) {
      setError("每周遮盖天数需为 1–7 的整数");
      return;
    }
    if (!reason.trim()) {
      setError("方案变化必须写明原因，留档备查");
      return;
    }
    onSubmit(d, w, reason.trim());
    setEditing(false);
  }

  if (!editing) {
    return (
      <button type="button" onClick={open}>
        {current ? "调整方案" : "制定方案"}
      </button>
    );
  }

  return (
    <div className="plan-editor">
      <label>
        <span>每日遮盖分钟</span>
        <input
          type="number"
          min={1}
          max={720}
          value={daily}
          onChange={(e) => setDaily(e.target.value)}
        />
      </label>
      <label>
        <span>每周遮盖天数</span>
        <input
          type="number"
          min={1}
          max={7}
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </label>
      <label>
        <span>调整原因（必填，留存备查）</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="如 复查视力提升，遵医嘱加量"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="queue-actions">
        <button type="button" className="primary-action" onClick={submit}>
          保存方案
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          取消
        </button>
      </div>
    </div>
  );
}

export default function PlanPanel({ patient, plans, changes, onChange }: Props) {
  if (!patient) {
    return (
      <div>
        <div className="section-heading">
          <div>
            <p>治疗方案</p>
            <h2>方案与调整记录</h2>
          </div>
        </div>
        <p className="empty-hint">请先在左侧新增并选择患儿。</p>
      </div>
    );
  }

  const patientChanges = changes.filter((c) => c.patientId === patient.id);

  return (
    <div>
      <div className="section-heading">
        <div>
          <p>治疗方案</p>
          <h2>方案与调整记录 · {patient.name}</h2>
        </div>
      </div>
      <div className="plan-grid">
        {EYES.map((eye) => {
          const plan = plans.find((p) => p.patientId === patient.id && p.eye === eye);
          return (
            <div className="plan-card" key={eye}>
              <h3>{EYE_LABELS[eye]}</h3>
              <p className="plan-values">
                {plan
                  ? `每日 ${plan.dailyMinutes} 分钟 · 每周 ${plan.daysPerWeek} 天`
                  : "尚未制定方案"}
              </p>
              <PlanEditor
                current={plan}
                onSubmit={(daily, days, reason) =>
                  onChange({
                    patientId: patient.id,
                    eye,
                    dailyMinutes: daily,
                    daysPerWeek: days,
                    reason,
                  })
                }
              />
            </div>
          );
        })}
      </div>
      <h3 className="sub-heading">调整记录</h3>
      {patientChanges.length === 0 ? (
        <p className="empty-hint">暂无调整记录</p>
      ) : (
        <div className="history-list">
          {patientChanges.map((c) => (
            <div className="history-item" key={c.id}>
              <strong>
                {EYE_LABELS[c.eye]} · 每日 {c.oldDailyMinutes}→{c.newDailyMinutes} 分钟 · 每周{" "}
                {c.oldDaysPerWeek}→{c.newDaysPerWeek} 天
              </strong>
              <p>
                {formatTime(c.changedAt)} · 原因：{c.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
