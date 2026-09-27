import { useEffect, useMemo, useState } from "react";
import type { ConfirmSettings, EntryStatus, EyeSide, OcclusionEntry, Patient } from "../types";
import { EYE_LABELS } from "../types";
import { todayStr } from "../week";

export interface SaveEntryInput {
  patientId: string;
  date: string;
  eye: EyeSide;
  correctedVision: string;
  patchMinutes: number;
  trainingCount: number;
}

interface Props {
  patient: Patient | undefined;
  settings: ConfirmSettings;
  entries: OcclusionEntry[];
  onSave: (input: SaveEntryInput) => EntryStatus;
}

interface Feedback {
  type: "ok" | "warn" | "error";
  text: string;
}

const EYES: EyeSide[] = ["left", "right"];

export default function EntryForm({ patient, settings, entries, onSave }: Props) {
  const [date, setDate] = useState(todayStr());
  const [eye, setEye] = useState<EyeSide>("left");
  const [vision, setVision] = useState("");
  const [minutes, setMinutes] = useState("");
  const [trainings, setTrainings] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const existing = useMemo(
    () => (patient ? entries.find((e) => e.id === `${patient.id}|${date}|${eye}`) : undefined),
    [entries, patient, date, eye]
  );

  // 切换患儿/日期/眼别时回填当天该眼已有记录（同一天同一眼仅一条）
  useEffect(() => {
    setVision(existing?.correctedVision ?? "");
    setMinutes(existing ? String(existing.patchMinutes) : "");
    setTrainings(existing ? String(existing.trainingCount) : "");
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, date, eye]);

  function submit() {
    if (!patient) {
      setFeedback({ type: "error", text: "请先在左侧选择患儿。" });
      return;
    }
    if (!date) {
      setFeedback({ type: "error", text: "请选择日期。" });
      return;
    }
    if (!vision.trim()) {
      setFeedback({ type: "error", text: "请填写矫正视力。" });
      return;
    }
    const m = Number(minutes);
    if (!Number.isInteger(m) || m < 0 || m > 1440) {
      setFeedback({ type: "error", text: "每日遮盖分钟需为 0–1440 的整数。" });
      return;
    }
    const t = Number(trainings);
    if (!Number.isInteger(t) || t < 0 || t > 50) {
      setFeedback({ type: "error", text: "本周训练次数需为 0–50 的整数。" });
      return;
    }
    const overwritten = Boolean(existing);
    const status = onSave({
      patientId: patient.id,
      date,
      eye,
      correctedVision: vision.trim(),
      patchMinutes: m,
      trainingCount: t,
    });
    if (status === "pending") {
      setFeedback({
        type: "warn",
        text: `已保存。遮盖 ${m} 分钟超出 ${settings.minMinutes}–${settings.maxMinutes} 分钟确认区间，待医生确认后才计入本周完成率。`,
      });
    } else {
      setFeedback({
        type: "ok",
        text: overwritten
          ? "同一天同一眼仅保留一次：已覆盖原记录并计入本周完成率。"
          : "已保存并计入本周完成率。",
      });
    }
  }

  return (
    <div>
      <div className="section-heading">
        <div>
          <p>遮盖治疗</p>
          <h2>记录录入{patient ? ` · ${patient.name}` : ""}</h2>
        </div>
      </div>
      {!patient ? (
        <p className="empty-hint">请先在左侧新增并选择患儿，再登记遮盖记录。</p>
      ) : (
        <>
          <div className="entry-form">
            <label>
              <span>日期</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="field">
              <span>眼别</span>
              <div className="eye-toggle">
                {EYES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={s === eye ? "active" : ""}
                    onClick={() => setEye(s)}
                  >
                    {EYE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span>矫正视力</span>
              <input
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                placeholder="如 0.6"
              />
            </label>
            <label>
              <span>每日遮盖分钟</span>
              <input
                type="number"
                min={0}
                max={1440}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder={`确认区间 ${settings.minMinutes}–${settings.maxMinutes}`}
              />
            </label>
            <label>
              <span>本周训练次数</span>
              <input
                type="number"
                min={0}
                max={50}
                value={trainings}
                onChange={(e) => setTrainings(e.target.value)}
                placeholder="如 3"
              />
            </label>
          </div>
          {existing && (
            <p className="hint">
              当天该眼已有记录（遮盖 {existing.patchMinutes} 分钟），保存将覆盖，同一天同一眼仅保留一次。
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="primary-action" onClick={submit}>
              保存记录
            </button>
          </div>
          {feedback && <p className={`feedback ${feedback.type}`}>{feedback.text}</p>}
        </>
      )}
    </div>
  );
}
