import type { OcclusionEntry, Patient } from "../types";
import { EYE_LABELS } from "../types";

interface Props {
  pending: OcclusionEntry[];
  patients: Patient[];
  onReview: (id: string, action: "confirmed" | "rejected") => void;
}

export default function PendingQueue({ pending, patients, onReview }: Props) {
  const nameOf = (id: string) => patients.find((p) => p.id === id)?.name ?? "未知患儿";

  return (
    <div>
      <div className="section-heading">
        <div>
          <p>医生复核</p>
          <h2>待确认记录（{pending.length}）</h2>
        </div>
      </div>
      {pending.length === 0 ? (
        <p className="empty-hint">
          暂无待确认记录。遮盖分钟超出确认区间的记录会先留在这里，确认后才计入本周完成率。
        </p>
      ) : (
        <div className="queue-list">
          {pending.map((e) => (
            <div className="queue-item" key={e.id}>
              <div>
                <h3>
                  {nameOf(e.patientId)} · {e.date} · {EYE_LABELS[e.eye]}
                </h3>
                <p>
                  矫正视力 {e.correctedVision} · 遮盖 {e.patchMinutes} 分钟 · 本周训练{" "}
                  {e.trainingCount} 次
                </p>
                <p className="queue-reason">{e.statusReason}</p>
              </div>
              <div className="queue-actions">
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={() => onReview(e.id, "confirmed")}
                >
                  确认计入
                </button>
                <button
                  type="button"
                  className="btn-reject"
                  onClick={() => onReview(e.id, "rejected")}
                >
                  驳回
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
