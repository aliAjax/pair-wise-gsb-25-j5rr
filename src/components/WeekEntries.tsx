import type { OcclusionEntry, Patient } from "../types";
import { EYE_LABELS, STATUS_LABELS } from "../types";

interface Props {
  patient: Patient | undefined;
  entries: OcclusionEntry[];
}

/** 当前患儿本周明细台账 */
export default function WeekEntries({ patient, entries }: Props) {
  if (!patient) return null;

  return (
    <div className="week-entries">
      <h3 className="sub-heading">本周明细 · {patient.name}</h3>
      {entries.length === 0 ? (
        <p className="empty-hint">本周暂无记录</p>
      ) : (
        <div className="table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>眼别</th>
                <th>矫正视力</th>
                <th>遮盖分钟</th>
                <th>本周训练次数</th>
                <th>状态</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date.slice(5)}</td>
                  <td>{EYE_LABELS[e.eye]}</td>
                  <td>{e.correctedVision}</td>
                  <td>{e.patchMinutes}</td>
                  <td>{e.trainingCount}</td>
                  <td>
                    <span className={`badge ${e.status}`}>{STATUS_LABELS[e.status]}</span>
                  </td>
                  <td>{e.statusReason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
